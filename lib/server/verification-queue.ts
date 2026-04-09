import { finalizeJobWithResults, claimQueuedJob, markJobFailedAndRefund } from "@/lib/server/user-account";
import { recordVerificationMetrics } from "@/lib/server/verification-metrics";
import { isValidEmail, VerificationPolicyResult, verifyEmailWithPolicy } from "@/lib/verification";

type QueueRow = {
  rowNumber: number | null;
  rawValue: string;
  email: string;
};

type QueueJobPayload = {
  jobId: string;
  rows: QueueRow[];
};

const queuedJobs = new Map<string, QueueJobPayload>();
const processingJobs = new Set<string>();
const domainNextAllowedAt = new Map<string, number>();

const MAX_PARALLEL_JOBS = readNumberEnv("VERIFYFLOW_MAX_PARALLEL_JOBS", 2);
const EMAIL_CONCURRENCY = readNumberEnv("VERIFYFLOW_EMAIL_CONCURRENCY", 8);
const DOMAIN_MIN_INTERVAL_MS = readNumberEnv("VERIFYFLOW_DOMAIN_MIN_INTERVAL_MS", 35);
const RETRY_BACKOFF_MS = readNumberEnv("VERIFYFLOW_RETRY_BACKOFF_MS", 250);
const TIMEOUT_BUCKETS_MS = readTimeoutBuckets();

let activeJobs = 0;
let draining = false;

function readNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? "");
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function readTimeoutBuckets(): number[] {
  const source = process.env.VERIFYFLOW_TIMEOUT_BUCKETS_MS;
  if (!source) return [5000, 9000, 14000];

  const parsed = source
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.floor(item));

  return parsed.length > 0 ? parsed : [5000, 9000, 14000];
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => runner());
  await Promise.all(workers);
  return results;
}

function getDomain(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return "";
  return email.slice(atIndex + 1).toLowerCase();
}

async function throttleDomain(email: string) {
  const domain = getDomain(email);
  if (!domain) return;

  while (true) {
    const now = Date.now();
    const nextAt = domainNextAllowedAt.get(domain) ?? now;

    if (nextAt <= now) {
      domainNextAllowedAt.set(domain, now + DOMAIN_MIN_INTERVAL_MS);
      return;
    }

    await wait(nextAt - now);
  }
}

function fallbackInvalidResult(email: string): VerificationPolicyResult {
  return {
    email,
    status: "invalid",
    reasonCode: "syntax_invalid",
    reasonMessage: "Email syntax is invalid.",
    confidenceScore: 2,
    latencyMs: 0,
    attemptCount: 1,
    providerError: false,
    timeoutError: false,
    error: undefined
  };
}

function fallbackUnknownResult(email: string): VerificationPolicyResult {
  return {
    email,
    status: "unknown",
    reasonCode: "unknown",
    reasonMessage: "Unable to verify email.",
    confidenceScore: 18,
    latencyMs: 0,
    attemptCount: 1,
    providerError: false,
    timeoutError: false,
    error: "Unable to verify email."
  };
}

async function processQueueJob(job: QueueJobPayload) {
  const claimed = await claimQueuedJob(job.jobId);
  if (!claimed) {
    return;
  }

  try {
    const uniqueEmails = [...new Set(job.rows.map((item) => item.email).filter(Boolean))];
    const verifiedUnique = await runWithConcurrency(uniqueEmails, EMAIL_CONCURRENCY, async (email) => {
      if (!isValidEmail(email)) {
        return fallbackInvalidResult(email);
      }

      await throttleDomain(email);
      return verifyEmailWithPolicy(email, {
        timeoutBucketsMs: TIMEOUT_BUCKETS_MS,
        retryBackoffMs: RETRY_BACKOFF_MS
      });
    });

    const byEmail = new Map<string, VerificationPolicyResult>();
    for (const item of verifiedUnique) {
      byEmail.set(item.email, item);
    }

    const outcomes = job.rows.map((row) => {
      const mapped = byEmail.get(row.email) ?? fallbackUnknownResult(row.email);
      return {
        rowNumber: row.rowNumber,
        rawValue: row.rawValue,
        email: row.email,
        status: mapped.status,
        reasonCode: mapped.reasonCode,
        reasonMessage: mapped.reasonMessage,
        confidenceScore: mapped.confidenceScore,
        latencyMs: mapped.latencyMs,
        attemptCount: mapped.attemptCount,
        error: mapped.error
      };
    });

    const retryCount = verifiedUnique.reduce((sum, item) => sum + Math.max(0, item.attemptCount - 1), 0);
    const timeoutCount = verifiedUnique.reduce((sum, item) => (item.timeoutError ? sum + 1 : sum), 0);
    const providerErrorCount = verifiedUnique.reduce((sum, item) => (item.providerError ? sum + 1 : sum), 0);
    const totalLatencyMs = verifiedUnique.reduce((sum, item) => sum + Math.max(0, item.latencyMs), 0);

    await finalizeJobWithResults(job.jobId, outcomes, {
      retryCount,
      timeoutCount,
      providerErrorCount,
      totalLatencyMs
    });

    const safeCount = verifiedUnique.reduce((sum, item) => (item.status === "safe" ? sum + 1 : sum), 0);
    const riskyCount = verifiedUnique.reduce((sum, item) => (item.status === "risky" ? sum + 1 : sum), 0);
    const invalidCount = verifiedUnique.reduce((sum, item) => (item.status === "invalid" ? sum + 1 : sum), 0);
    const unknownCount = verifiedUnique.reduce((sum, item) => (item.status === "unknown" ? sum + 1 : sum), 0);

    await recordVerificationMetrics({
      safeCount,
      riskyCount,
      invalidCount,
      unknownCount,
      providerErrorCount,
      timeoutCount,
      retryCount,
      totalLatencyMs
    });
  } catch {
    await markJobFailedAndRefund(job.jobId).catch(() => undefined);
  }
}

async function drainQueue() {
  if (draining) return;
  draining = true;

  try {
    while (activeJobs < MAX_PARALLEL_JOBS && queuedJobs.size > 0) {
      const next = queuedJobs.entries().next();
      if (next.done) break;

      const [jobId, payload] = next.value;
      queuedJobs.delete(jobId);
      processingJobs.add(jobId);
      activeJobs += 1;

      void processQueueJob(payload).finally(() => {
        activeJobs = Math.max(0, activeJobs - 1);
        processingJobs.delete(jobId);
        void drainQueue();
      });
    }
  } finally {
    draining = false;
  }
}

export function enqueueVerificationJob(payload: QueueJobPayload): boolean {
  if (queuedJobs.has(payload.jobId) || processingJobs.has(payload.jobId)) {
    return false;
  }

  queuedJobs.set(payload.jobId, payload);
  void drainQueue();
  return true;
}

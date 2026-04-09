import {
  CreditEntryType,
  JobStatus,
  Prisma,
  ReachabilityStatus,
  VerificationReasonCode
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Reachability, ReasonCode } from "@/lib/verification";

const DEFAULT_TRIAL_CREDITS = Number(process.env.DEFAULT_TRIAL_CREDITS ?? "100");
const TRANSACTION_MAX_RETRIES = 1;
const TRANSACTION_RETRY_DELAY_MS = 250;

type ReserveCreditsInput = {
  clerkUserId: string;
  email?: string | null;
  sourceFileName?: string | null;
  sourceColumn?: string | null;
  idempotencyKey?: string | null;
  totalRows: number;
  totalEmails: number;
  creditsNeeded: number;
};

type ReserveCreditsResult = {
  accountId: string;
  jobId: string;
  remainingCredits: number;
  reused: boolean;
  status: JobStatus;
};

type JobResultInput = {
  rowNumber?: number | null;
  rawValue?: string | null;
  email: string;
  status: Reachability;
  reasonCode: ReasonCode;
  reasonMessage: string;
  confidenceScore: number;
  latencyMs: number;
  attemptCount: number;
  error?: string | null;
};

type FinalizeJobStatsInput = {
  retryCount?: number;
  timeoutCount?: number;
  providerErrorCount?: number;
  totalLatencyMs?: number;
};

export class InsufficientCreditsError extends Error {
  readonly available: number;
  readonly required: number;

  constructor(available: number, required: number) {
    super("Insufficient credits");
    this.available = available;
    this.required = required;
  }
}

function getInitialCredits(): number {
  if (!Number.isFinite(DEFAULT_TRIAL_CREDITS)) {
    return 100;
  }

  return Math.max(0, Math.floor(DEFAULT_TRIAL_CREDITS));
}

function mapReachability(status: Reachability): ReachabilityStatus {
  if (status === "safe") return ReachabilityStatus.SAFE;
  if (status === "risky") return ReachabilityStatus.RISKY;
  if (status === "invalid") return ReachabilityStatus.INVALID;
  return ReachabilityStatus.UNKNOWN;
}

function mapReasonCode(code: ReasonCode): VerificationReasonCode {
  if (code === "deliverable") return VerificationReasonCode.DELIVERABLE;
  if (code === "catch_all") return VerificationReasonCode.CATCH_ALL;
  if (code === "disposable") return VerificationReasonCode.DISPOSABLE;
  if (code === "role_account") return VerificationReasonCode.ROLE_ACCOUNT;
  if (code === "smtp_rejected") return VerificationReasonCode.SMTP_REJECTED;
  if (code === "mailbox_disabled") return VerificationReasonCode.MAILBOX_DISABLED;
  if (code === "mailbox_full") return VerificationReasonCode.MAILBOX_FULL;
  if (code === "syntax_invalid") return VerificationReasonCode.SYNTAX_INVALID;
  if (code === "engine_timeout") return VerificationReasonCode.ENGINE_TIMEOUT;
  if (code === "engine_http_error") return VerificationReasonCode.ENGINE_HTTP_ERROR;
  if (code === "engine_network_error") return VerificationReasonCode.ENGINE_NETWORK_ERROR;
  return VerificationReasonCode.UNKNOWN;
}

function sanitizeIdempotencyKey(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function isClerkUserIdConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (!Array.isArray(target)) {
    return false;
  }

  return target.includes("clerkUserId");
}

function isTransactionStartTimeout(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028") {
    return true;
  }

  if (error instanceof Error && error.message.includes("Unable to start a transaction in the given time")) {
    return true;
  }

  return false;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransactionRetry<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let attempts = 0;

  while (true) {
    try {
      return await prisma.$transaction(handler);
    } catch (error) {
      const canRetry = attempts < TRANSACTION_MAX_RETRIES && isTransactionStartTimeout(error);
      if (!canRetry) {
        throw error;
      }

      attempts += 1;
      await wait(TRANSACTION_RETRY_DELAY_MS * attempts);
    }
  }
}

export async function ensureUserAccount(clerkUserId: string, email?: string | null) {
  const initialCredits = getInitialCredits();

  let account = await prisma.userAccount.findUnique({
    where: { clerkUserId }
  });

  if (!account) {
    try {
      account = await prisma.userAccount.create({
        data: {
          clerkUserId,
          email: email ?? null,
          credits: initialCredits,
          subscription: {
            create: {
              plan: "trial",
              status: "TRIAL"
            }
          },
          ledgers: {
            create: {
              entryType: CreditEntryType.GRANT,
              amount: initialCredits,
              balanceAfter: initialCredits,
              reason: "Initial trial credits"
            }
          }
        }
      });
    } catch (error) {
      if (!isClerkUserIdConflict(error)) {
        throw error;
      }

      account = await prisma.userAccount.findUniqueOrThrow({
        where: { clerkUserId }
      });
    }
  } else if (email && account.email !== email) {
    account = await prisma.userAccount.update({
      where: { id: account.id },
      data: { email }
    });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: account.id }
  });

  if (!subscription) {
    await prisma.subscription.create({
      data: {
        userId: account.id,
        plan: "trial",
        status: "TRIAL"
      }
    });
  }

  return prisma.userAccount.findUniqueOrThrow({
    where: { id: account.id },
    include: {
      subscription: true
    }
  });
}

export async function reserveCreditsAndCreateJob(input: ReserveCreditsInput): Promise<ReserveCreditsResult> {
  return withTransactionRetry(async (tx) => {
    const initialCredits = getInitialCredits();
    const idempotencyKey = sanitizeIdempotencyKey(input.idempotencyKey);
    let baseAccount = await tx.userAccount.findUnique({
      where: { clerkUserId: input.clerkUserId }
    });

    if (!baseAccount) {
      try {
        baseAccount = await tx.userAccount.create({
          data: {
            clerkUserId: input.clerkUserId,
            email: input.email ?? null,
            credits: initialCredits
          }
        });
      } catch (error) {
        if (!isClerkUserIdConflict(error)) {
          throw error;
        }

        baseAccount = await tx.userAccount.findUniqueOrThrow({
          where: { clerkUserId: input.clerkUserId }
        });
      }
    } else if (input.email && baseAccount.email !== input.email) {
      baseAccount = await tx.userAccount.update({
        where: { id: baseAccount.id },
        data: { email: input.email }
      });
    }

    const subscription = await tx.subscription.findUnique({
      where: { userId: baseAccount.id }
    });

    if (!subscription) {
      await tx.subscription.create({
        data: {
          userId: baseAccount.id,
          plan: "trial",
          status: "TRIAL"
        }
      });
    }

    const hasGrantEntry = await tx.creditLedger.findFirst({
      where: {
        userId: baseAccount.id,
        reason: "Initial trial credits"
      },
      select: { id: true }
    });

    if (!hasGrantEntry) {
      await tx.creditLedger.create({
        data: {
          userId: baseAccount.id,
          entryType: CreditEntryType.GRANT,
          amount: initialCredits,
          balanceAfter: baseAccount.credits,
          reason: "Initial trial credits"
        }
      });
    }

    const freshAccount = await tx.userAccount.findUniqueOrThrow({
      where: { id: baseAccount.id },
      select: { id: true, credits: true }
    });

    if (idempotencyKey) {
      const existingJob = await tx.verificationJob.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: freshAccount.id,
            idempotencyKey
          }
        },
        select: {
          id: true,
          status: true
        }
      });

      if (existingJob) {
        return {
          accountId: freshAccount.id,
          jobId: existingJob.id,
          remainingCredits: freshAccount.credits,
          reused: true,
          status: existingJob.status
        };
      }
    }

    if (freshAccount.credits < input.creditsNeeded) {
      throw new InsufficientCreditsError(freshAccount.credits, input.creditsNeeded);
    }

    const remainingCredits = freshAccount.credits - input.creditsNeeded;

    await tx.userAccount.update({
      where: { id: freshAccount.id },
      data: { credits: remainingCredits }
    });

    await tx.creditLedger.create({
      data: {
        userId: freshAccount.id,
        entryType: CreditEntryType.USAGE,
        amount: -input.creditsNeeded,
        balanceAfter: remainingCredits,
        reason: "Bulk verification usage",
        metadata: {
          sourceFileName: input.sourceFileName ?? null,
          sourceColumn: input.sourceColumn ?? null,
          totalRows: input.totalRows,
          totalEmails: input.totalEmails,
          idempotencyKey
        }
      }
    });

    const job = await tx.verificationJob.create({
      data: {
        userId: freshAccount.id,
        idempotencyKey,
        sourceFileName: input.sourceFileName ?? null,
        sourceColumn: input.sourceColumn ?? null,
        totalRows: input.totalRows,
        totalEmails: input.totalEmails,
        creditsUsed: input.creditsNeeded,
        status: JobStatus.QUEUED,
        queuedAt: new Date()
      }
    });

    return {
      accountId: freshAccount.id,
      jobId: job.id,
      remainingCredits,
      reused: false,
      status: job.status
    };
  });
}

export async function claimQueuedJob(jobId: string): Promise<boolean> {
  const claimed = await prisma.verificationJob.updateMany({
    where: {
      id: jobId,
      status: JobStatus.QUEUED
    },
    data: {
      status: JobStatus.PROCESSING,
      startedAt: new Date()
    }
  });

  return claimed.count > 0;
}

export async function finalizeJobWithResults(jobId: string, outcomes: JobResultInput[], stats?: FinalizeJobStatsInput) {
  let safeCount = 0;
  let riskyCount = 0;
  let invalidCount = 0;
  let unknownCount = 0;

  for (const item of outcomes) {
    if (item.status === "safe") safeCount += 1;
    else if (item.status === "risky") riskyCount += 1;
    else if (item.status === "invalid") invalidCount += 1;
    else unknownCount += 1;
  }

  if (outcomes.length > 0) {
    await prisma.verificationResult.createMany({
      data: outcomes.map((item) => ({
        jobId,
        rowNumber: item.rowNumber ?? null,
        rawValue: item.rawValue ?? null,
        email: item.email,
        isReachable: mapReachability(item.status),
        reasonCode: mapReasonCode(item.reasonCode),
        reasonMessage: item.reasonMessage,
        confidenceScore: Math.max(1, Math.min(99, Math.floor(item.confidenceScore))),
        latencyMs: Math.max(0, Math.floor(item.latencyMs)),
        attemptCount: Math.max(1, Math.floor(item.attemptCount)),
        error: item.error ?? null
      }))
    });
  }

  const now = new Date();
  const existingJob = await prisma.verificationJob.findUnique({
    where: { id: jobId },
    select: {
      startedAt: true,
      createdAt: true
    }
  });

  const startedAt = existingJob?.startedAt ?? existingJob?.createdAt ?? now;
  const processingMs = Math.max(0, now.getTime() - startedAt.getTime());
  const computedRetryCount = outcomes.reduce((sum, item) => sum + Math.max(0, item.attemptCount - 1), 0);
  const computedTimeoutCount = outcomes.reduce(
    (sum, item) => (item.reasonCode === "engine_timeout" ? sum + 1 : sum),
    0
  );
  const computedProviderErrorCount = outcomes.reduce(
    (sum, item) => (item.reasonCode.startsWith("engine_") ? sum + 1 : sum),
    0
  );
  const totalLatencyMs =
    stats?.totalLatencyMs ?? outcomes.reduce((sum, item) => sum + Math.max(0, Math.floor(item.latencyMs)), 0);
  const averageLatencyMs = outcomes.length > 0 ? Math.round(totalLatencyMs / outcomes.length) : null;
  const successRate =
    outcomes.length > 0 ? Number(((safeCount + riskyCount + invalidCount) / outcomes.length).toFixed(4)) : null;
  const unknownRate = outcomes.length > 0 ? Number((unknownCount / outcomes.length).toFixed(4)) : null;

  return prisma.verificationJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.COMPLETED,
      startedAt,
      completedAt: now,
      processingMs,
      safeCount,
      riskyCount,
      invalidCount,
      unknownCount,
      retryCount: stats?.retryCount ?? computedRetryCount,
      timeoutCount: stats?.timeoutCount ?? computedTimeoutCount,
      providerErrorCount: stats?.providerErrorCount ?? computedProviderErrorCount,
      averageLatencyMs,
      successRate,
      unknownRate
    },
    select: {
      id: true,
      status: true,
      totalRows: true,
      totalEmails: true,
      creditsUsed: true,
      safeCount: true,
      riskyCount: true,
      invalidCount: true,
      unknownCount: true,
      retryCount: true,
      timeoutCount: true,
      providerErrorCount: true,
      averageLatencyMs: true,
      successRate: true,
      unknownRate: true,
      startedAt: true,
      completedAt: true,
      processingMs: true,
      createdAt: true
    }
  });
}

export async function markJobFailedAndRefund(jobId: string) {
  return withTransactionRetry(async (tx) => {
    const job = await tx.verificationJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        userId: true,
        status: true,
        creditsUsed: true
      }
    });

    if (!job) {
      return null;
    }

    if (job.status !== JobStatus.QUEUED && job.status !== JobStatus.PROCESSING) {
      const account = await tx.userAccount.findUnique({
        where: { id: job.userId },
        select: { credits: true }
      });

      return {
        jobId: job.id,
        refundedCredits: 0,
        remainingCredits: account?.credits ?? 0
      };
    }

    const account = await tx.userAccount.findUniqueOrThrow({
      where: { id: job.userId },
      select: { credits: true }
    });

    const refundedCredits = Math.max(0, job.creditsUsed);
    const nextBalance = account.credits + refundedCredits;

    await tx.verificationJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date()
      }
    });

    if (refundedCredits > 0) {
      await tx.userAccount.update({
        where: { id: job.userId },
        data: { credits: nextBalance }
      });

      await tx.creditLedger.create({
        data: {
          userId: job.userId,
          entryType: CreditEntryType.REFUND,
          amount: refundedCredits,
          balanceAfter: nextBalance,
          reason: "Bulk verification refund",
          metadata: {
            jobId: job.id
          }
        }
      });
    }

    return {
      jobId: job.id,
      refundedCredits,
      remainingCredits: refundedCredits > 0 ? nextBalance : account.credits
    };
  });
}

export async function getDashboardSnapshot(clerkUserId: string, email?: string | null) {
  const account = await ensureUserAccount(clerkUserId, email);

  const [recentJobs, recentLedger] = await Promise.all([
    prisma.verificationJob.findMany({
      where: { userId: account.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        sourceFileName: true,
        sourceColumn: true,
        totalEmails: true,
        creditsUsed: true,
        status: true,
        safeCount: true,
        riskyCount: true,
        invalidCount: true,
        unknownCount: true,
        createdAt: true
      }
    }),
    prisma.creditLedger.findMany({
      where: { userId: account.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        entryType: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        createdAt: true
      }
    })
  ]);

  return {
    account: {
      id: account.id,
      clerkUserId: account.clerkUserId,
      email: account.email,
      credits: account.credits,
      subscription: account.subscription
    },
    recentJobs,
    recentLedger
  };
}

import { auth, currentUser } from "@clerk/nextjs/server";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { enqueueVerificationJob } from "@/lib/server/verification-queue";
import { applyRateLimit, extractClientIp } from "@/lib/server/rate-limit";
import {
  InsufficientCreditsError,
  markJobFailedAndRefund,
  reserveCreditsAndCreateJob
} from "@/lib/server/user-account";

type RowInput = {
  rowNumber?: number;
  rawValue?: string;
  email?: string;
};

type BulkVerifyRequest = {
  sourceFileName?: string;
  sourceColumn?: string;
  idempotencyKey?: string;
  rows?: RowInput[];
};

const MAX_ROWS_PER_JOB = 5000;
const USER_LIMIT_PER_MINUTE = Number(process.env.VERIFYFLOW_USER_JOBS_PER_MINUTE ?? "12");
const IP_LIMIT_PER_MINUTE = Number(process.env.VERIFYFLOW_IP_JOBS_PER_MINUTE ?? "30");

function normalizeRow(row: RowInput) {
  const rowNumber = Number.isFinite(row.rowNumber) ? Number(row.rowNumber) : null;
  const rawValue = typeof row.rawValue === "string" ? row.rawValue : "";
  const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";

  return {
    rowNumber,
    rawValue,
    email
  };
}

function resolvePrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>): string | null {
  if (!user) return null;
  if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
  return user.emailAddresses[0]?.emailAddress ?? null;
}

function sanitizeIdempotencyKey(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function parseLimit(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

export async function POST(request: NextRequest) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = extractClientIp(request.headers);
  const ipRate = applyRateLimit({
    key: `bulk-ip:${ip}`,
    limit: parseLimit(IP_LIMIT_PER_MINUTE, 30),
    windowMs: 60_000
  });

  if (!ipRate.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests from this network. Please retry shortly.",
        retryAfterMs: Math.max(0, ipRate.resetAt - Date.now())
      },
      { status: 429 }
    );
  }

  const userRate = applyRateLimit({
    key: `bulk-user:${userId}`,
    limit: parseLimit(USER_LIMIT_PER_MINUTE, 12),
    windowMs: 60_000
  });

  if (!userRate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit reached for bulk jobs. Please retry in a minute.",
        retryAfterMs: Math.max(0, userRate.resetAt - Date.now())
      },
      { status: 429 }
    );
  }

  let body: BulkVerifyRequest;
  try {
    body = (await request.json()) as BulkVerifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows.map(normalizeRow) : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided." }, { status: 400 });
  }

  if (rows.length > MAX_ROWS_PER_JOB) {
    return NextResponse.json(
      { error: `Maximum ${MAX_ROWS_PER_JOB} rows can be processed in one job.` },
      { status: 400 }
    );
  }

  const rowsWithEmail = rows.filter((row) => row.email.length > 0);
  if (rowsWithEmail.length === 0) {
    return NextResponse.json({ error: "No email values detected in selected column." }, { status: 400 });
  }

  const uniqueEmails = [...new Set(rowsWithEmail.map((row) => row.email))];
  const clerkUser = await currentUser();
  const accountEmail = resolvePrimaryEmail(clerkUser);
  const requestIdempotencyKey = sanitizeIdempotencyKey(
    request.headers.get("x-idempotency-key") ?? body.idempotencyKey ?? null
  );

  let reservedJobId = "";
  let shouldRefundOnError = false;

  try {
    const reserved = await reserveCreditsAndCreateJob({
      clerkUserId: userId,
      email: accountEmail,
      sourceFileName: typeof body.sourceFileName === "string" ? body.sourceFileName.slice(0, 200) : null,
      sourceColumn: typeof body.sourceColumn === "string" ? body.sourceColumn.slice(0, 120) : null,
      idempotencyKey: requestIdempotencyKey,
      totalRows: rows.length,
      totalEmails: uniqueEmails.length,
      creditsNeeded: uniqueEmails.length
    });

    reservedJobId = reserved.jobId;
    shouldRefundOnError = !reserved.reused;

    if (reserved.status === JobStatus.QUEUED) {
      enqueueVerificationJob({
        jobId: reserved.jobId,
        rows: rowsWithEmail
      });
    }

    return NextResponse.json(
      {
        job: {
          id: reserved.jobId,
          status: reserved.status,
          totalRows: rows.length,
          totalEmails: uniqueEmails.length,
          creditsUsed: uniqueEmails.length
        },
        remainingCredits: reserved.remainingCredits,
        reused: reserved.reused,
        queued: reserved.status === JobStatus.QUEUED || reserved.status === JobStatus.PROCESSING
      },
      { status: 202 }
    );
  } catch (error) {
    if (reservedJobId && shouldRefundOnError) {
      await markJobFailedAndRefund(reservedJobId).catch(() => undefined);
    }

    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits.",
          availableCredits: error.available,
          requiredCredits: error.required,
          upgradeUrl: process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_GROWTH_URL ?? null
        },
        { status: 402 }
      );
    }

    const message = error instanceof Error ? error.message : "Bulk verification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

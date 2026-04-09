import { ReachabilityStatus, VerificationReasonCode } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function mapReachability(status: ReachabilityStatus): "safe" | "risky" | "invalid" | "unknown" {
  if (status === ReachabilityStatus.SAFE) return "safe";
  if (status === ReachabilityStatus.RISKY) return "risky";
  if (status === ReachabilityStatus.INVALID) return "invalid";
  return "unknown";
}

function mapReasonCode(code: VerificationReasonCode | null): string | null {
  if (!code) return null;
  return code.toLowerCase();
}

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = params.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
  }

  const account = await prisma.userAccount.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, credits: true }
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const job = await prisma.verificationJob.findFirst({
    where: {
      id: jobId,
      userId: account.id
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
      queuedAt: true,
      startedAt: true,
      completedAt: true,
      processingMs: true,
      createdAt: true,
      results: {
        orderBy: [{ rowNumber: "asc" }, { email: "asc" }],
        select: {
          rowNumber: true,
          rawValue: true,
          email: true,
          isReachable: true,
          reasonCode: true,
          reasonMessage: true,
          confidenceScore: true,
          latencyMs: true,
          attemptCount: true,
          error: true
        }
      }
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      job: {
        id: job.id,
        status: job.status,
        totalRows: job.totalRows,
        totalEmails: job.totalEmails,
        creditsUsed: job.creditsUsed,
        safeCount: job.safeCount,
        riskyCount: job.riskyCount,
        invalidCount: job.invalidCount,
        unknownCount: job.unknownCount,
        retryCount: job.retryCount,
        timeoutCount: job.timeoutCount,
        providerErrorCount: job.providerErrorCount,
        averageLatencyMs: job.averageLatencyMs,
        successRate: job.successRate,
        unknownRate: job.unknownRate,
        queuedAt: job.queuedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        processingMs: job.processingMs,
        createdAt: job.createdAt
      },
      remainingCredits: account.credits,
      results: job.results.map((item) => ({
        rowNumber: item.rowNumber,
        rawValue: item.rawValue,
        email: item.email,
        status: mapReachability(item.isReachable),
        reasonCode: mapReasonCode(item.reasonCode),
        reasonMessage: item.reasonMessage,
        confidenceScore: item.confidenceScore,
        latencyMs: item.latencyMs,
        attemptCount: item.attemptCount,
        error: item.error ?? undefined
      }))
    },
    { status: 200 }
  );
}

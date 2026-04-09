import { prisma } from "@/lib/prisma";

export type VerificationMetricsInput = {
  safeCount: number;
  riskyCount: number;
  invalidCount: number;
  unknownCount: number;
  providerErrorCount: number;
  timeoutCount: number;
  retryCount: number;
  totalLatencyMs: number;
};

function toBucketStart(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

export async function recordVerificationMetrics(input: VerificationMetricsInput) {
  const bucketStart = toBucketStart(new Date());
  const totalChecks = input.safeCount + input.riskyCount + input.invalidCount + input.unknownCount;

  await prisma.verificationMetricBucket.upsert({
    where: { bucketStart },
    create: {
      bucketStart,
      totalChecks,
      safeChecks: input.safeCount,
      riskyChecks: input.riskyCount,
      invalidChecks: input.invalidCount,
      unknownChecks: input.unknownCount,
      providerErrorCount: input.providerErrorCount,
      timeoutCount: input.timeoutCount,
      retryCount: input.retryCount,
      totalLatencyMs: BigInt(Math.max(0, Math.floor(input.totalLatencyMs)))
    },
    update: {
      totalChecks: { increment: totalChecks },
      safeChecks: { increment: input.safeCount },
      riskyChecks: { increment: input.riskyCount },
      invalidChecks: { increment: input.invalidCount },
      unknownChecks: { increment: input.unknownCount },
      providerErrorCount: { increment: input.providerErrorCount },
      timeoutCount: { increment: input.timeoutCount },
      retryCount: { increment: input.retryCount },
      totalLatencyMs: {
        increment: BigInt(Math.max(0, Math.floor(input.totalLatencyMs)))
      }
    }
  });
}


type Bucket = {
  resetAt: number;
  used: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  cost?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function applyRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const cost = Math.max(1, input.cost ?? 1);
  const existing = buckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    const next: Bucket = {
      resetAt: now + input.windowMs,
      used: cost
    };
    buckets.set(input.key, next);

    return {
      allowed: cost <= input.limit,
      remaining: Math.max(0, input.limit - cost),
      resetAt: next.resetAt
    };
  }

  const nextUsed = existing.used + cost;
  existing.used = nextUsed;
  buckets.set(input.key, existing);

  return {
    allowed: nextUsed <= input.limit,
    remaining: Math.max(0, input.limit - nextUsed),
    resetAt: existing.resetAt
  };
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return "unknown";
}


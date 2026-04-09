export type Reachability = "safe" | "risky" | "invalid" | "unknown";
export type ReasonCode =
  | "deliverable"
  | "catch_all"
  | "disposable"
  | "role_account"
  | "smtp_rejected"
  | "mailbox_disabled"
  | "mailbox_full"
  | "syntax_invalid"
  | "engine_timeout"
  | "engine_http_error"
  | "engine_network_error"
  | "unknown";

export type VerificationResult = {
  input: string;
  is_reachable: Reachability;
  syntax: {
    is_valid_syntax: boolean;
    domain: string | null;
    username: string | null;
  };
  mx: {
    accepts_mail: boolean;
  };
  smtp: {
    can_connect_smtp: boolean;
    is_deliverable: boolean;
    is_catch_all: boolean;
    has_full_inbox: boolean;
    is_disabled: boolean;
  };
  misc: {
    is_disposable: boolean;
    is_role_account: boolean;
  };
};

export type VerificationPolicyResult = {
  email: string;
  status: Reachability;
  reasonCode: ReasonCode;
  reasonMessage: string;
  confidenceScore: number;
  latencyMs: number;
  attemptCount: number;
  providerError: boolean;
  timeoutError: boolean;
  error?: string;
};

type VerifyOptions = {
  timeoutMs?: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

function resolveEngineBaseUrl(): string {
  return (process.env.VERIFYFLOW_ENGINE_URL ?? "http://localhost:8080").replace(/\/$/, "");
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeReachability(value: unknown): Reachability {
  if (value === "safe" || value === "risky" || value === "invalid" || value === "unknown") {
    return value;
  }

  return "unknown";
}

export async function verifyEmailWithEngine(email: string, options?: VerifyOptions): Promise<VerificationResult> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${resolveEngineBaseUrl()}/v0/check_email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to_email: email
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`ENGINE_HTTP_${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const [username = null, domain = null] = email.includes("@") ? email.split("@", 2) : [null, null];
    const syntax = (payload.syntax ?? {}) as Record<string, unknown>;
    const mx = (payload.mx ?? {}) as Record<string, unknown>;
    const smtp = (payload.smtp ?? {}) as Record<string, unknown>;
    const misc = (payload.misc ?? {}) as Record<string, unknown>;

    return {
      input: email,
      is_reachable: normalizeReachability(payload.is_reachable),
      syntax: {
        is_valid_syntax: normalizeBoolean(syntax.is_valid_syntax),
        domain: typeof syntax.domain === "string" ? syntax.domain : domain,
        username: typeof syntax.username === "string" ? syntax.username : username
      },
      mx: {
        accepts_mail: normalizeBoolean(mx.accepts_mail)
      },
      smtp: {
        can_connect_smtp: normalizeBoolean(smtp.can_connect_smtp),
        is_deliverable: normalizeBoolean(smtp.is_deliverable),
        is_catch_all: normalizeBoolean(smtp.is_catch_all),
        has_full_inbox: normalizeBoolean(smtp.has_full_inbox),
        is_disabled: normalizeBoolean(smtp.is_disabled)
      },
      misc: {
        is_disposable: normalizeBoolean(misc.is_disposable),
        is_role_account: normalizeBoolean(misc.is_role_account)
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function classifyFromEngine(result: VerificationResult): {
  status: Reachability;
  reasonCode: ReasonCode;
  reasonMessage: string;
  confidenceScore: number;
} {
  if (!result.syntax.is_valid_syntax) {
    return {
      status: "invalid",
      reasonCode: "syntax_invalid",
      reasonMessage: "Email syntax is invalid.",
      confidenceScore: 2
    };
  }

  if (result.misc.is_disposable) {
    return {
      status: "invalid",
      reasonCode: "disposable",
      reasonMessage: "Disposable mailbox detected.",
      confidenceScore: 8
    };
  }

  if (result.smtp.is_disabled) {
    return {
      status: "invalid",
      reasonCode: "mailbox_disabled",
      reasonMessage: "Mailbox appears disabled.",
      confidenceScore: 10
    };
  }

  if (!result.smtp.is_deliverable) {
    return {
      status: "invalid",
      reasonCode: "smtp_rejected",
      reasonMessage: "SMTP server did not confirm deliverability.",
      confidenceScore: 14
    };
  }

  if (result.smtp.has_full_inbox) {
    return {
      status: "risky",
      reasonCode: "mailbox_full",
      reasonMessage: "Inbox appears full.",
      confidenceScore: 42
    };
  }

  if (result.smtp.is_catch_all) {
    return {
      status: "risky",
      reasonCode: "catch_all",
      reasonMessage: "Domain is catch-all.",
      confidenceScore: 48
    };
  }

  if (result.misc.is_role_account) {
    return {
      status: "risky",
      reasonCode: "role_account",
      reasonMessage: "Role-based mailbox detected.",
      confidenceScore: 56
    };
  }

  if (result.is_reachable === "risky") {
    return {
      status: "risky",
      reasonCode: "unknown",
      reasonMessage: "Mailbox appears risky.",
      confidenceScore: 52
    };
  }

  if (result.is_reachable === "invalid") {
    return {
      status: "invalid",
      reasonCode: "smtp_rejected",
      reasonMessage: "Mailbox is not deliverable.",
      confidenceScore: 16
    };
  }

  if (result.is_reachable === "unknown") {
    return {
      status: "unknown",
      reasonCode: "unknown",
      reasonMessage: "Unable to confirm mailbox status.",
      confidenceScore: 24
    };
  }

  return {
    status: "safe",
    reasonCode: "deliverable",
    reasonMessage: "Mailbox is reachable.",
    confidenceScore: 90
  };
}

function classifyEngineFailure(error: unknown): {
  status: Reachability;
  reasonCode: ReasonCode;
  reasonMessage: string;
  confidenceScore: number;
  timeoutError: boolean;
  providerError: boolean;
  errorText: string;
} {
  const text = error instanceof Error ? error.message : "Verification failed.";
  const upper = text.toUpperCase();

  if (upper.includes("ABORT")) {
    return {
      status: "unknown",
      reasonCode: "engine_timeout",
      reasonMessage: "Verification engine timeout.",
      confidenceScore: 18,
      timeoutError: true,
      providerError: false,
      errorText: text
    };
  }

  if (upper.startsWith("ENGINE_HTTP_")) {
    return {
      status: "unknown",
      reasonCode: "engine_http_error",
      reasonMessage: "Verification engine HTTP error.",
      confidenceScore: 20,
      timeoutError: false,
      providerError: true,
      errorText: text
    };
  }

  return {
    status: "unknown",
    reasonCode: "engine_network_error",
    reasonMessage: "Verification engine network error.",
    confidenceScore: 22,
    timeoutError: false,
    providerError: true,
    errorText: text
  };
}

export async function verifyEmailWithPolicy(
  email: string,
  options?: {
    timeoutBucketsMs?: number[];
    retryBackoffMs?: number;
  }
): Promise<VerificationPolicyResult> {
  const timeouts = options?.timeoutBucketsMs?.length ? options.timeoutBucketsMs : [5000, 9000, 14000];
  const baseBackoff = options?.retryBackoffMs ?? 300;
  const start = Date.now();
  let providerError = false;
  let timeoutError = false;
  let lastFailure:
    | {
        status: Reachability;
        reasonCode: ReasonCode;
        reasonMessage: string;
        confidenceScore: number;
        timeoutError: boolean;
        providerError: boolean;
        errorText: string;
      }
    | undefined;

  for (let attempt = 1; attempt <= timeouts.length; attempt += 1) {
    const timeoutMs = timeouts[attempt - 1];
    try {
      const result = await verifyEmailWithEngine(email, { timeoutMs });
      const classified = classifyFromEngine(result);
      const latencyMs = Date.now() - start;
      const confidencePenalty = (attempt - 1) * 8;

      return {
        email,
        status: classified.status,
        reasonCode: classified.reasonCode,
        reasonMessage: classified.reasonMessage,
        confidenceScore: clamp(classified.confidenceScore - confidencePenalty, 1, 99),
        latencyMs,
        attemptCount: attempt,
        providerError,
        timeoutError,
        error: undefined
      };
    } catch (error) {
      lastFailure = classifyEngineFailure(error);
      providerError = providerError || lastFailure.providerError;
      timeoutError = timeoutError || lastFailure.timeoutError;

      if (attempt < timeouts.length) {
        const backoff = baseBackoff * 2 ** (attempt - 1);
        await wait(backoff);
      }
    }
  }

  const latencyMs = Date.now() - start;
  const fallback = lastFailure ?? {
    status: "unknown" as Reachability,
    reasonCode: "unknown" as ReasonCode,
    reasonMessage: "Unable to verify email.",
    confidenceScore: 20,
    timeoutError: false,
    providerError: false,
    errorText: "Unable to verify email."
  };

  return {
    email,
    status: fallback.status,
    reasonCode: fallback.reasonCode,
    reasonMessage: fallback.reasonMessage,
    confidenceScore: fallback.confidenceScore,
    latencyMs,
    attemptCount: timeouts.length,
    providerError,
    timeoutError,
    error: fallback.errorText
  };
}

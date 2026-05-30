export type AuthCallbackDiagnosticReason =
  | "supabase_auth_not_configured"
  | "missing_callback_credentials"
  | "supabase_callback_error"
  | "otp_expired_or_reused"
  | "pkce_code_verifier_missing"
  | "exchange_code_for_session_failure"
  | "verify_otp_failure"
  | "unexpected_exception";

export function logAuthCallbackDiagnostic(
  reason: AuthCallbackDiagnosticReason,
  details: Record<string, unknown> = {}
): void {
  console.error("[auth-callback]", {
    reason,
    ...sanitizeAuthCallbackDiagnosticDetails(details),
  });
}

export function sanitizeAuthCallbackDiagnosticDetails(
  details: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) {
      continue;
    }

    if (
      key === "code" ||
      key === "tokenHash" ||
      key === "token_hash" ||
      key === "userId" ||
      key === "user_id" ||
      key === "serviceRoleKey" ||
      key === "access_token" ||
      key === "refresh_token"
    ) {
      continue;
    }

    if (key === "errorDescription" && typeof value === "string") {
      sanitized.errorDescription = sanitizeErrorDescription(value);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

function sanitizeErrorDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) {
    return "present";
  }

  if (trimmed.length > 120) {
    return `${trimmed.slice(0, 117)}...`;
  }

  return trimmed;
}

export function classifyAuthCallbackExchangeFailure(
  message: string | null | undefined
): AuthCallbackDiagnosticReason {
  const normalized = message?.toLowerCase() ?? "";

  if (
    normalized.includes("expired") ||
    normalized.includes("invalid grant") ||
    normalized.includes("already been used") ||
    normalized.includes("reused")
  ) {
    return "otp_expired_or_reused";
  }

  if (
    normalized.includes("pkce") ||
    normalized.includes("code verifier") ||
    normalized.includes("verifier")
  ) {
    return "pkce_code_verifier_missing";
  }

  return "exchange_code_for_session_failure";
}

export function classifyAuthCallbackVerifyOtpFailure(
  message: string | null | undefined
): AuthCallbackDiagnosticReason {
  const normalized = message?.toLowerCase() ?? "";

  if (
    normalized.includes("expired") ||
    normalized.includes("invalid") ||
    normalized.includes("already been used")
  ) {
    return "otp_expired_or_reused";
  }

  return "verify_otp_failure";
}

export const REVIEW_LOGIN_SEND_FAILED_ERROR = "login_send_failed" as const;

export function reviewLoginSendErrorMessage(error: string | null | undefined): string | null {
  if (error === REVIEW_LOGIN_SEND_FAILED_ERROR) {
    return "Unable to send login link. Confirm the email is approved for operator access.";
  }

  return null;
}

export const REVIEW_LOGIN_SENT_QUERY = "sent" as const;

export function reviewLoginSendSuccessMessage(
  sent: string | null | undefined
): string | null {
  if (sent === "1") {
    return "Check your email for the internal review queue login link.";
  }

  return null;
}

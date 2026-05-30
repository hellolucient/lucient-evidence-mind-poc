export type OperatorLoginDiagnosticReason =
  | "missing_email"
  | "invalid_email"
  | "supabase_auth_not_configured"
  | "supabase_service_role_not_configured"
  | "auth_user_not_found"
  | "auth_user_lookup_failed"
  | "workspace_membership_not_found"
  | "membership_lookup_failed"
  | "magic_link_send_failure"
  | "unexpected_exception";

export function logOperatorLoginDiagnostic(
  reason: OperatorLoginDiagnosticReason,
  details: Record<string, unknown> = {}
): void {
  console.error("[operator-login]", {
    reason,
    ...sanitizeDiagnosticDetails(details),
  });
}

function sanitizeDiagnosticDetails(
  details: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) {
      continue;
    }

    if (
      key === "userId" ||
      key === "user_id" ||
      key === "serviceRoleKey" ||
      key === "token" ||
      key === "code"
    ) {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export function operatorLoginClientMessage(
  reason: OperatorLoginDiagnosticReason
): string {
  switch (reason) {
    case "missing_email":
      return "Email is required.";
    case "invalid_email":
      return "Enter a valid operator email address.";
    case "supabase_auth_not_configured":
      return "Supabase Auth is not configured for operator login.";
    default:
      return "Unable to send login link. Confirm the email is approved for operator access.";
  }
}

export const OPERATOR_LOGIN_GENERIC_FAILURE_MESSAGE =
  "Unable to send login link. Confirm the email is approved for operator access.";

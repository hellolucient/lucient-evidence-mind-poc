import { buildReviewLoginCallbackUrl } from "@/lib/supabase/auth-redirect";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

import { normalizeOperatorLoginEmail } from "@/lib/review/operator-login-email";
import { validateApprovedOperatorEmail } from "@/lib/review/operator-login-eligibility";
import {
  logOperatorLoginDiagnostic,
  operatorLoginClientMessage,
  type OperatorLoginDiagnosticReason,
} from "@/lib/review/operator-login-diagnostics";

export type OperatorLoginSendState = {
  ok: boolean;
  message: string;
};

export async function sendApprovedOperatorLoginLink(options: {
  email: string;
  siteOrigin: string;
}): Promise<OperatorLoginSendState> {
  if (!isSupabaseAuthConfigured()) {
    logOperatorLoginDiagnostic("supabase_auth_not_configured");
    return {
      ok: false,
      message: operatorLoginClientMessage("supabase_auth_not_configured"),
    };
  }

  const rawEmail = options.email;
  if (!rawEmail.trim()) {
    logOperatorLoginDiagnostic("missing_email");
    return {
      ok: false,
      message: operatorLoginClientMessage("missing_email"),
    };
  }

  const normalizedEmail = normalizeOperatorLoginEmail(rawEmail);
  if (!normalizedEmail) {
    logOperatorLoginDiagnostic("invalid_email", { emailLength: rawEmail.trim().length });
    return {
      ok: false,
      message: operatorLoginClientMessage("invalid_email"),
    };
  }

  try {
    const eligibility = await validateApprovedOperatorEmail(normalizedEmail);
    if (!eligibility.ok) {
      logOperatorLoginDiagnostic(eligibility.reason, {
        email: normalizedEmail,
        supabaseUrlHost: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? safeHost(process.env.NEXT_PUBLIC_SUPABASE_URL)
          : null,
      });
      return {
        ok: false,
        message: operatorLoginClientMessage(eligibility.reason),
      };
    }

    const supabase = await createSupabaseAuthServerClient();
    const redirectTo = buildReviewLoginCallbackUrl(options.siteOrigin);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      logOperatorLoginDiagnostic("magic_link_send_failure", {
        email: normalizedEmail,
        redirectHost: safeHost(redirectTo),
        supabaseErrorMessage: error.message,
        supabaseErrorStatus: error.status ?? null,
      });
      return {
        ok: false,
        message: operatorLoginClientMessage("magic_link_send_failure"),
      };
    }

    return {
      ok: true,
      message: "Check your email for the internal review queue login link.",
    };
  } catch (error) {
    logOperatorLoginDiagnostic("unexpected_exception", {
      email: normalizedEmail,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
    return {
      ok: false,
      message: operatorLoginClientMessage("unexpected_exception"),
    };
  }
}

function safeHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function operatorLoginResponseIsSafe(state: OperatorLoginSendState): boolean {
  const serialized = JSON.stringify(state).toLowerCase();
  const forbidden = ["uuid", "service_role", "token", "auth_code", "user_id"];

  return !forbidden.some((term) => serialized.includes(term));
}

export type { OperatorLoginDiagnosticReason };

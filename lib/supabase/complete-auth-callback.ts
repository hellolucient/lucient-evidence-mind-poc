import type { EmailOtpType } from "@supabase/supabase-js";

import {
  type AuthCallbackParams,
  hasAuthCallbackCredentials,
  hasSupabaseCallbackError,
} from "@/lib/supabase/auth-callback";
import {
  classifyAuthCallbackExchangeFailure,
  classifyAuthCallbackVerifyOtpFailure,
  logAuthCallbackDiagnostic,
  type AuthCallbackDiagnosticReason,
} from "@/lib/supabase/auth-callback-diagnostics";
import type { SupabaseAuthClient } from "@/lib/supabase/auth-server";

export type AuthCallbackCompletionResult =
  | { ok: true }
  | { ok: false; reason: AuthCallbackDiagnosticReason };

export async function completeAuthCallback(
  supabase: SupabaseAuthClient,
  params: AuthCallbackParams
): Promise<AuthCallbackCompletionResult> {
  if (hasSupabaseCallbackError(params)) {
    logAuthCallbackDiagnostic("supabase_callback_error", {
      error: params.error,
      errorCode: params.errorCode,
      errorDescription: params.errorDescription,
    });
    return { ok: false, reason: "supabase_callback_error" };
  }

  if (params.code) {
    const authResult = await supabase.auth.exchangeCodeForSession(params.code);

    if (authResult.error) {
      const reason = classifyAuthCallbackExchangeFailure(authResult.error.message);
      logAuthCallbackDiagnostic(reason, {
        authMethod: "exchange_code_for_session",
        supabaseErrorMessage: authResult.error.message,
        supabaseErrorStatus: authResult.error.status ?? null,
      });
      return { ok: false, reason };
    }

    return { ok: true };
  }

  if (params.tokenHash && params.type) {
    const authResult = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type as EmailOtpType,
    });

    if (authResult.error) {
      const reason = classifyAuthCallbackVerifyOtpFailure(authResult.error.message);
      logAuthCallbackDiagnostic(reason, {
        authMethod: "verify_otp",
        supabaseErrorMessage: authResult.error.message,
        supabaseErrorStatus: authResult.error.status ?? null,
      });
      return { ok: false, reason };
    }

    return { ok: true };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    logAuthCallbackDiagnostic("unexpected_exception", {
      authMethod: "implicit_session_from_url",
      errorMessage: error.message,
    });
    return { ok: false, reason: "unexpected_exception" };
  }

  if (data.session) {
    return { ok: true };
  }

  if (!hasAuthCallbackCredentials(params)) {
    logAuthCallbackDiagnostic("missing_callback_credentials", {
      hasCode: Boolean(params.code),
      hasTokenHash: Boolean(params.tokenHash),
      hasType: Boolean(params.type),
    });
    return { ok: false, reason: "missing_callback_credentials" };
  }

  logAuthCallbackDiagnostic("verify_otp_failure", {
    authMethod: "implicit_session_from_url",
    supabaseErrorMessage: "session_not_established",
  });
  return { ok: false, reason: "verify_otp_failure" };
}

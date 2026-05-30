import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  buildAuthCallbackFailureRedirect,
  buildAuthCallbackSuccessRedirect,
  hasAuthCallbackCredentials,
  hasSupabaseCallbackError,
  parseAuthCallbackParams,
  resolveAuthRedirectOrigin,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-callback";
import {
  classifyAuthCallbackExchangeFailure,
  classifyAuthCallbackVerifyOtpFailure,
  logAuthCallbackDiagnostic,
} from "@/lib/supabase/auth-callback-diagnostics";
import { isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";
import { createSupabaseAuthRouteHandlerClient } from "@/lib/supabase/auth-route-handler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseAuthCallbackParams(url);
  const origin = resolveAuthRedirectOrigin(request);
  const nextPath = sanitizeAuthNextPath(params.next);

  try {
    if (!isSupabaseAuthConfigured()) {
      logAuthCallbackDiagnostic("supabase_auth_not_configured");
      return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
    }

    if (hasSupabaseCallbackError(params)) {
      logAuthCallbackDiagnostic("supabase_callback_error", {
        error: params.error,
        errorCode: params.errorCode,
        errorDescription: params.errorDescription,
      });
      return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
    }

    if (!hasAuthCallbackCredentials(params)) {
      logAuthCallbackDiagnostic("missing_callback_credentials", {
        hasCode: Boolean(params.code),
        hasTokenHash: Boolean(params.tokenHash),
        hasType: Boolean(params.type),
      });
      return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
    }

    const response = NextResponse.redirect(buildAuthCallbackSuccessRedirect(origin, nextPath));
    const supabase = await createSupabaseAuthRouteHandlerClient(response);

    const authResult = params.code
      ? await supabase.auth.exchangeCodeForSession(params.code)
      : await supabase.auth.verifyOtp({
          token_hash: params.tokenHash!,
          type: params.type! as EmailOtpType,
        });

    if (authResult.error) {
      const reason = params.code
        ? classifyAuthCallbackExchangeFailure(authResult.error.message)
        : classifyAuthCallbackVerifyOtpFailure(authResult.error.message);

      logAuthCallbackDiagnostic(reason, {
        authMethod: params.code ? "exchange_code_for_session" : "verify_otp",
        supabaseErrorMessage: authResult.error.message,
        supabaseErrorStatus: authResult.error.status ?? null,
      });
      return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
    }

    return response;
  } catch (error) {
    logAuthCallbackDiagnostic("unexpected_exception", {
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
  }
}

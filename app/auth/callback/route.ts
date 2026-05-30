import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  buildAuthCallbackFailureRedirect,
  buildAuthCallbackSuccessRedirect,
  hasAuthCallbackCredentials,
  parseAuthCallbackParams,
  resolveAuthRedirectOrigin,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-callback";
import { isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";
import { createSupabaseAuthRouteHandlerClient } from "@/lib/supabase/auth-route-handler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseAuthCallbackParams(url);
  const origin = resolveAuthRedirectOrigin(request);
  const nextPath = sanitizeAuthNextPath(params.next);

  if (!isSupabaseAuthConfigured()) {
    return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
  }

  if (!hasAuthCallbackCredentials(params)) {
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
    return NextResponse.redirect(buildAuthCallbackFailureRedirect(origin));
  }

  return response;
}

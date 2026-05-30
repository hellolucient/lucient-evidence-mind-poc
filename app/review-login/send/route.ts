import { NextResponse } from "next/server";

import { sendApprovedOperatorLoginLink } from "@/lib/review/send-operator-login-link";
import { resolveAuthRedirectOrigin } from "@/lib/supabase/auth-callback";
import {
  REVIEW_LOGIN_SEND_FAILED_ERROR,
  REVIEW_LOGIN_SENT_QUERY,
} from "@/lib/supabase/auth-callback-diagnostics";
import { createSupabaseAuthRouteHandlerClient } from "@/lib/supabase/auth-route-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = resolveAuthRedirectOrigin(request);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");

  const successResponse = NextResponse.redirect(
    `${origin}/review-login?${REVIEW_LOGIN_SENT_QUERY}=1`,
    303
  );
  const supabase = await createSupabaseAuthRouteHandlerClient(successResponse);
  const result = await sendApprovedOperatorLoginLink({
    email,
    siteOrigin: origin,
    authClient: supabase,
  });

  if (!result.ok) {
    return NextResponse.redirect(
      `${origin}/review-login?error=${REVIEW_LOGIN_SEND_FAILED_ERROR}`,
      303
    );
  }

  return successResponse;
}

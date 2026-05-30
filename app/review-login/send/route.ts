import { NextResponse } from "next/server";

import { sendApprovedOperatorLoginLink } from "@/lib/review/send-operator-login-link";
import {
  REVIEW_LOGIN_SEND_FAILED_ERROR,
  REVIEW_LOGIN_SENT_QUERY,
} from "@/lib/supabase/auth-callback-diagnostics";
import { resolveSiteOriginFromRequest } from "@/lib/supabase/auth-redirect";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = resolveSiteOriginFromRequest(request);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");

  const result = await sendApprovedOperatorLoginLink({
    email,
    siteOrigin: origin,
  });

  if (!result.ok) {
    return NextResponse.redirect(
      `${origin}/review-login?error=${REVIEW_LOGIN_SEND_FAILED_ERROR}`,
      303
    );
  }

  return NextResponse.redirect(`${origin}/review-login?${REVIEW_LOGIN_SENT_QUERY}=1`, 303);
}

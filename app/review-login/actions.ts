"use server";

import { headers } from "next/headers";

import { resolveSiteOrigin } from "@/lib/supabase/auth-redirect";
import {
  sendApprovedOperatorLoginLink,
  type OperatorLoginSendState,
} from "@/lib/review/send-operator-login-link";

export type ReviewLoginState = OperatorLoginSendState;

async function getSiteOrigin(): Promise<string> {
  const headerStore = await headers();

  return resolveSiteOrigin({
    configuredSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    forwardedHost: headerStore.get("x-forwarded-host"),
    host: headerStore.get("host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
  });
}

export async function sendReviewLoginLink(
  _prevState: ReviewLoginState,
  formData: FormData
): Promise<ReviewLoginState> {
  return sendApprovedOperatorLoginLink({
    email: String(formData.get("email") ?? ""),
    siteOrigin: await getSiteOrigin(),
  });
}

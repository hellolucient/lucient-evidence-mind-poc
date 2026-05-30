"use server";

import { headers } from "next/headers";

import {
  buildReviewLoginCallbackUrl,
  resolveSiteOrigin,
} from "@/lib/supabase/auth-redirect";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export type ReviewLoginState = {
  ok: boolean;
  message: string;
};

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
  if (!isSupabaseAuthConfigured()) {
    return {
      ok: false,
      message: "Supabase Auth is not configured for operator login.",
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      message: "Email is required.",
    };
  }

  const supabase = await createSupabaseAuthServerClient();
  const redirectTo = buildReviewLoginCallbackUrl(await getSiteOrigin());
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return {
      ok: false,
      message: "Unable to send login link. Confirm the email is approved for operator access.",
    };
  }

  return {
    ok: true,
    message: "Check your email for the internal review queue login link.",
  };
}

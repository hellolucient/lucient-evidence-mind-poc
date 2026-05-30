"use server";

import { headers } from "next/headers";

import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export type ReviewLoginState = {
  ok: boolean;
  message: string;
};

async function getSiteOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
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
  const redirectTo = `${await getSiteOrigin()}/auth/callback?next=/review-items`;
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

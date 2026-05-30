import { NextResponse } from "next/server";

import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") || "/review-items";

  if (!isSupabaseAuthConfigured()) {
    return NextResponse.redirect(new URL("/review-items", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/review-login", request.url));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/review-login", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

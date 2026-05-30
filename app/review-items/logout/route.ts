import { NextResponse } from "next/server";

import {
  createSupabaseAuthServerClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseAuthServerClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/review-login", request.url), 303);
}

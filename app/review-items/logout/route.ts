import { NextResponse } from "next/server";

import { resolveAuthRedirectOrigin } from "@/lib/supabase/auth-callback";
import {
  createSupabaseAuthRouteHandlerClient,
} from "@/lib/supabase/auth-route-handler";
import { isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = resolveAuthRedirectOrigin(request);
  const response = NextResponse.redirect(`${origin}/review-login`, 303);

  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseAuthRouteHandlerClient(response);
    await supabase.auth.signOut();
  }

  return response;
}

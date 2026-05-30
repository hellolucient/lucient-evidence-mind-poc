import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { getSupabaseAuthEnvConfig } from "@/lib/supabase/auth-server";

export async function createSupabaseAuthRouteHandlerClient(response: NextResponse) {
  const { url, anonKey } = getSupabaseAuthEnvConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase Auth client credentials are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}

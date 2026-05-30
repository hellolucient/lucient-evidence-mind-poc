import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { logAuthCallbackDiagnostic } from "@/lib/supabase/auth-callback-diagnostics";

export type SupabaseAuthClient = SupabaseClient;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getSupabaseAuthEnvConfig(): {
  url: string | null;
  anonKey: string | null;
} {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null,
  };
}

export async function createSupabaseAuthServerClient() {
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
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          logAuthCallbackDiagnostic("unexpected_exception", {
            context: "supabase_auth_server_client_set_all",
            errorMessage: error instanceof Error ? error.message : "unknown_error",
          });
        }
      },
    },
  });
}

export async function getSupabaseAuthUser() {
  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const client = await createSupabaseAuthServerClient();
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

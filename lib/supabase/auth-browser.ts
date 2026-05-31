import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAuthEnvConfig, type SupabaseAuthClient } from "@/lib/supabase/auth-config";

export function createSupabaseAuthBrowserClient(): SupabaseAuthClient {
  const { url, anonKey } = getSupabaseAuthEnvConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase Auth client credentials are not configured.");
  }

  return createBrowserClient(url, anonKey);
}

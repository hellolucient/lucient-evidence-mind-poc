import { createClient } from "@supabase/supabase-js";

import { getSupabaseAuthEnvConfig, type SupabaseAuthClient } from "@/lib/supabase/auth-config";

export function createSupabaseAuthImplicitSendClient(): SupabaseAuthClient {
  const { url, anonKey } = getSupabaseAuthEnvConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase Auth client credentials are not configured.");
  }

  return createClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

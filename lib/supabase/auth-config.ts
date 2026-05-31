import type { SupabaseClient } from "@supabase/supabase-js";

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

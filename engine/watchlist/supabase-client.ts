import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const WATCHLIST_TOPICS_TABLE = "watchlist_topics";

export function getSupabaseEnvConfig(): {
  url: string | null;
  serviceRoleKey: string | null;
  hasSupabaseUrl: boolean;
  hasSupabaseServiceRoleKey: boolean;
  supabaseUrlHost: string | null;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  let supabaseUrlHost: string | null = null;
  if (url) {
    try {
      supabaseUrlHost = new URL(url).host;
    } catch {
      supabaseUrlHost = null;
    }
  }

  return {
    url,
    serviceRoleKey,
    hasSupabaseUrl: Boolean(url),
    hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
    supabaseUrlHost,
  };
}

export function createSupabaseServerClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseEnvConfig();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { WATCHLIST_TOPICS_TABLE };

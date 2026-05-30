import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const WATCHLIST_TOPICS_TABLE = "watchlist_topics";
const WATCH_RUNS_TABLE = "watch_runs";
const EVIDENCE_ALERTS_TABLE = "evidence_alerts";
const EVIDENCE_REVIEW_ITEMS_TABLE = "evidence_review_items";
const EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE = "evidence_review_item_audit_events";

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

export {
  WATCHLIST_TOPICS_TABLE,
  WATCH_RUNS_TABLE,
  EVIDENCE_ALERTS_TABLE,
  EVIDENCE_REVIEW_ITEMS_TABLE,
  EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE,
};

/**
 * PLACEHOLDER ONLY — not imported by production code.
 *
 * Documents the expected shape of a future durable WatchlistStore adapter.
 * Implement one adapter when a persistence provider is chosen and configured.
 *
 * Possible future providers:
 * - Supabase (Postgres + row-level security)
 * - Vercel KV / Redis (key-value with JSON documents)
 * - Postgres (direct connection or via ORM)
 * - Other durable store (DynamoDB, PlanetScale, etc.)
 *
 * Required durable fields per watch topic (see docs/future-watchlist-persistence-schema.md):
 * - watch_topic_id, claim_family, label, active, frequency
 * - last_checked_utc, next_check_utc
 * - known_pmids, baseline_evidence_grade, baseline_policy
 * - query_mode, raw_query, structured_query, query_hash, query_version
 * - last_alert, last_heartbeat
 * - created_at, updated_at
 *
 * Privacy: store MUST NOT persist client exact wording, client IDs, brand
 * confidential copy, private legal notes, or commercial strategy.
 */

import type {
  WatchTopicState,
  WatchTopicStatePatch,
  WatchlistStore,
  WatchlistStoreStatus,
} from "./watchlist-store";

export class DurableWatchlistStorePlaceholder implements WatchlistStore {
  async listWatchTopics(): Promise<WatchTopicState[]> {
    throw new Error(
      "DurableWatchlistStorePlaceholder is not implemented. Configure a durable provider first."
    );
  }

  async getWatchTopic(_watchTopicId: string): Promise<WatchTopicState | null> {
    throw new Error(
      "DurableWatchlistStorePlaceholder is not implemented. Configure a durable provider first."
    );
  }

  async saveWatchTopic(_topic: WatchTopicState): Promise<void> {
    throw new Error(
      "DurableWatchlistStorePlaceholder is not implemented. Configure a durable provider first."
    );
  }

  async updateWatchTopicState(
    _watchTopicId: string,
    _patch: WatchTopicStatePatch
  ): Promise<WatchTopicState | null> {
    throw new Error(
      "DurableWatchlistStorePlaceholder is not implemented. Configure a durable provider first."
    );
  }

  async seedDefaultWatchTopicsIfEmpty(): Promise<void> {
    throw new Error(
      "DurableWatchlistStorePlaceholder is not implemented. Configure a durable provider first."
    );
  }

  getStoreStatus(): WatchlistStoreStatus {
    return {
      durable: true,
      store: "durable_placeholder",
      adapter: "DurableWatchlistStorePlaceholder",
      state_survives_cold_start: true,
      suitable_for_production_monitoring: false,
      next_step:
        "Replace placeholder with a configured durable adapter (Supabase, Vercel KV, Postgres, etc.).",
    };
  }
}

/**
 * Example future wiring (not active):
 *
 * export function getWatchlistStore(): WatchlistStore {
 *   if (process.env.WATCHLIST_STORE === "supabase") {
 *     return new SupabaseWatchlistStore();
 *   }
 *   if (process.env.WATCHLIST_STORE === "vercel_kv") {
 *     return new VercelKvWatchlistStore();
 *   }
 *   return getInMemoryWatchlistStore();
 * }
 */

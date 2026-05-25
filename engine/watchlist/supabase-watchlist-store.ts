import type { SupabaseClient } from "@supabase/supabase-js";

import { createSeedWatchTopic } from "./in-memory-watchlist-store";
import {
  createSupabaseServerClient,
  WATCHLIST_TOPICS_TABLE,
} from "./supabase-client";
import type {
  StoredLastAlert,
  StoredLastHeartbeat,
  WatchFrequency,
  WatchTopicState,
  WatchTopicStatePatch,
  WatchlistStore,
  WatchlistStoreStatus,
} from "./watchlist-store";

type WatchlistTopicsRow = {
  watch_topic_id: string;
  claim_family: string;
  label: string;
  active: boolean;
  frequency: string;
  last_checked_utc: string | null;
  next_check_utc: string | null;
  known_pmids: string[] | null;
  baseline_evidence_grade: string;
  baseline_policy: string;
  query_mode: string;
  raw_query: string;
  structured_query: string | null;
  query_hash: string;
  query_version: string;
  last_alert: StoredLastAlert | null;
  last_heartbeat: StoredLastHeartbeat | null;
  created_at: string;
  updated_at: string;
};

const SUPABASE_STORE_STATUS: WatchlistStoreStatus = {
  durable: true,
  store: "supabase",
  adapter: "SupabaseWatchlistStore",
  state_survives_cold_start: true,
  suitable_for_production_monitoring: true,
  next_step: "Configure Vercel cron or scheduled trigger for autonomous monitoring.",
  watch_topic_loaded_from: "database",
  watch_topic_saved: true,
};

function rowToWatchTopic(row: WatchlistTopicsRow): WatchTopicState {
  return {
    watch_topic_id: row.watch_topic_id,
    claim_family: row.claim_family,
    label: row.label,
    active: row.active,
    frequency: row.frequency as WatchFrequency,
    last_checked_utc: row.last_checked_utc,
    next_check_utc: row.next_check_utc,
    baseline: {
      known_pmids: row.known_pmids ?? [],
      baseline_evidence_grade: row.baseline_evidence_grade,
      baseline_policy: row.baseline_policy,
      baseline_created_utc: row.created_at ?? null,
    },
    query_strategy: {
      mode: row.query_mode === "raw" ? "raw" : "structured",
      raw_query: row.raw_query,
      structured_query: row.structured_query,
      query_hash: row.query_hash,
      query_version: row.query_version,
    },
    last_alert: row.last_alert,
    last_heartbeat: row.last_heartbeat,
  };
}

function watchTopicToInsertRow(topic: WatchTopicState): Record<string, unknown> {
  const now = new Date().toISOString();

  return {
    watch_topic_id: topic.watch_topic_id,
    claim_family: topic.claim_family,
    label: topic.label,
    active: topic.active,
    frequency: topic.frequency,
    last_checked_utc: topic.last_checked_utc,
    next_check_utc: topic.next_check_utc,
    known_pmids: topic.baseline.known_pmids,
    baseline_evidence_grade: topic.baseline.baseline_evidence_grade,
    baseline_policy: topic.baseline.baseline_policy,
    query_mode: topic.query_strategy.mode,
    raw_query: topic.query_strategy.raw_query,
    structured_query: topic.query_strategy.structured_query,
    query_hash: topic.query_strategy.query_hash,
    query_version: topic.query_strategy.query_version,
    last_alert: topic.last_alert,
    last_heartbeat: topic.last_heartbeat,
    created_at: topic.baseline.baseline_created_utc ?? now,
    updated_at: now,
  };
}

function applyPatch(
  existing: WatchTopicState,
  patch: WatchTopicStatePatch
): WatchTopicState {
  return {
    ...existing,
    last_checked_utc:
      patch.last_checked_utc !== undefined
        ? patch.last_checked_utc
        : existing.last_checked_utc,
    next_check_utc:
      patch.next_check_utc !== undefined
        ? patch.next_check_utc
        : existing.next_check_utc,
    baseline: patch.baseline
      ? { ...existing.baseline, ...patch.baseline }
      : existing.baseline,
    query_strategy: patch.query_strategy
      ? { ...existing.query_strategy, ...patch.query_strategy }
      : existing.query_strategy,
    last_alert:
      patch.last_alert !== undefined ? patch.last_alert : existing.last_alert,
    last_heartbeat:
      patch.last_heartbeat !== undefined
        ? patch.last_heartbeat
        : existing.last_heartbeat,
  };
}

function watchTopicToUpdateRow(topic: WatchTopicState): Record<string, unknown> {
  return {
    claim_family: topic.claim_family,
    label: topic.label,
    active: topic.active,
    frequency: topic.frequency,
    last_checked_utc: topic.last_checked_utc,
    next_check_utc: topic.next_check_utc,
    known_pmids: topic.baseline.known_pmids,
    baseline_evidence_grade: topic.baseline.baseline_evidence_grade,
    baseline_policy: topic.baseline.baseline_policy,
    query_mode: topic.query_strategy.mode,
    raw_query: topic.query_strategy.raw_query,
    structured_query: topic.query_strategy.structured_query,
    query_hash: topic.query_strategy.query_hash,
    query_version: topic.query_strategy.query_version,
    last_alert: topic.last_alert,
    last_heartbeat: topic.last_heartbeat,
    updated_at: new Date().toISOString(),
  };
}

export class SupabaseWatchlistStore implements WatchlistStore {
  constructor(private readonly client: SupabaseClient) {}

  static create(): SupabaseWatchlistStore {
    return new SupabaseWatchlistStore(createSupabaseServerClient());
  }

  async verifyConnection(): Promise<void> {
    const { error } = await this.client
      .from(WATCHLIST_TOPICS_TABLE)
      .select("watch_topic_id")
      .limit(1);

    if (error) {
      throw new Error(`Supabase watchlist_topics probe failed: ${error.message}`);
    }
  }

  async listWatchTopics(): Promise<WatchTopicState[]> {
    const { data, error } = await this.client
      .from(WATCHLIST_TOPICS_TABLE)
      .select("*")
      .order("watch_topic_id", { ascending: true });

    if (error) {
      throw new Error(`Failed to list watch topics: ${error.message}`);
    }

    return ((data ?? []) as WatchlistTopicsRow[]).map(rowToWatchTopic);
  }

  async getWatchTopic(watchTopicId: string): Promise<WatchTopicState | null> {
    const { data, error } = await this.client
      .from(WATCHLIST_TOPICS_TABLE)
      .select("*")
      .eq("watch_topic_id", watchTopicId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get watch topic ${watchTopicId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return rowToWatchTopic(data as WatchlistTopicsRow);
  }

  async saveWatchTopic(topic: WatchTopicState): Promise<void> {
    const { error } = await this.client
      .from(WATCHLIST_TOPICS_TABLE)
      .upsert(watchTopicToInsertRow(topic), { onConflict: "watch_topic_id" });

    if (error) {
      throw new Error(`Failed to save watch topic ${topic.watch_topic_id}: ${error.message}`);
    }
  }

  async updateWatchTopicState(
    watchTopicId: string,
    patch: WatchTopicStatePatch
  ): Promise<WatchTopicState | null> {
    const existing = await this.getWatchTopic(watchTopicId);
    if (!existing) {
      return null;
    }

    const updated = applyPatch(existing, patch);
    const { error } = await this.client
      .from(WATCHLIST_TOPICS_TABLE)
      .update(watchTopicToUpdateRow(updated))
      .eq("watch_topic_id", watchTopicId);

    if (error) {
      throw new Error(
        `Failed to update watch topic ${watchTopicId}: ${error.message}`
      );
    }

    return updated;
  }

  async seedDefaultWatchTopicsIfEmpty(): Promise<void> {
    const { count, error: countError } = await this.client
      .from(WATCHLIST_TOPICS_TABLE)
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw new Error(
        `Failed to check watchlist_topics row count: ${countError.message}`
      );
    }

    if ((count ?? 0) > 0) {
      return;
    }

    const existingSeed = await this.getWatchTopic("watch-magnesium-cortisol");
    if (existingSeed) {
      return;
    }

    await this.saveWatchTopic(createSeedWatchTopic());
  }

  getStoreStatus(): WatchlistStoreStatus {
    return SUPABASE_STORE_STATUS;
  }
}

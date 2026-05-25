import type { ContributingSourceToDelta } from "@/lib/delta-attribution";

export type WatchFrequency = "weekly" | "monthly" | "quarterly";

export type StoredLastAlert = {
  alert_type: string;
  alert_summary: string;
  generated_at: string;
  contributing_sources_to_delta: ContributingSourceToDelta[];
  evidence_delta_change_level: string;
  delta_confidence: number;
};

export type StoredLastHeartbeat = {
  emitted: boolean;
  summary: string;
  no_material_change: boolean;
  generated_at: string;
};

export type StoredQueryStrategy = {
  mode: "structured" | "raw";
  raw_query: string;
  structured_query: string | null;
  query_hash: string;
  query_version: string;
};

export type WatchTopicBaselineState = {
  known_pmids: string[];
  baseline_evidence_grade: string;
  baseline_policy: string;
  baseline_created_utc: string | null;
};

export type WatchTopicState = {
  watch_topic_id: string;
  claim_family: string;
  label: string;
  active: boolean;
  frequency: WatchFrequency;
  last_checked_utc: string | null;
  next_check_utc: string | null;
  baseline: WatchTopicBaselineState;
  query_strategy: StoredQueryStrategy;
  last_alert: StoredLastAlert | null;
  last_heartbeat: StoredLastHeartbeat | null;
};

export type WatchTopicStatePatch = {
  last_checked_utc?: string | null;
  next_check_utc?: string | null;
  baseline?: Partial<WatchTopicBaselineState>;
  query_strategy?: Partial<StoredQueryStrategy>;
  last_alert?: StoredLastAlert | null;
  last_heartbeat?: StoredLastHeartbeat | null;
};

export type WatchlistStoreStatus = {
  durable: boolean;
  store: string;
  adapter: string;
  state_survives_cold_start: boolean;
  suitable_for_production_monitoring: boolean;
  next_step: string;
  watch_topic_loaded_from?: "database" | "memory";
  watch_topic_saved?: boolean;
  fallback_reason?: string | null;
};

export type WatchlistStoreEnvDebug = {
  has_supabase_url: boolean;
  has_supabase_service_role_key: boolean;
  supabase_url_host: string | null;
  selected_store: "supabase" | "in_memory";
  fallback_reason: string | null;
};

export type WatchlistStoreSelection = {
  store: WatchlistStore;
  env_debug: WatchlistStoreEnvDebug;
};

export interface WatchlistStore {
  listWatchTopics(): Promise<WatchTopicState[]>;
  getWatchTopic(watchTopicId: string): Promise<WatchTopicState | null>;
  saveWatchTopic(topic: WatchTopicState): Promise<void>;
  updateWatchTopicState(
    watchTopicId: string,
    patch: WatchTopicStatePatch
  ): Promise<WatchTopicState | null>;
  seedDefaultWatchTopicsIfEmpty(): Promise<void>;
  getStoreStatus(): WatchlistStoreStatus;
}

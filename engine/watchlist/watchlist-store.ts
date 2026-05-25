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

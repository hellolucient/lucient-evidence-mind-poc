import {
  MAGNESIUM_CORTISOL_CLAIM_FAMILY,
  MAGNESIUM_CORTISOL_STRUCTURED_QUERY,
  WATCH_MAGNESIUM_CORTISOL_TOPIC_ID,
} from "@/lib/structured-query";

import { buildStoredQueryHash } from "./query-hash";
import type {
  StoredQueryStrategy,
  WatchTopicState,
  WatchTopicStatePatch,
  WatchlistStore,
  WatchlistStoreStatus,
} from "./watchlist-store";

export const MAGNESIUM_CORTISOL_QUERY_VERSION = "watch-magnesium-cortisol@v1";

const MAGNESIUM_CORTISOL_BASELINE_POLICY =
  "Avoid direct cortisol-regulation claims; use relaxation/general wellbeing wording unless stronger direct human evidence emerges.";

const MAGNESIUM_CORTISOL_RAW_QUERY = "Magnesium for cortisol regulation";

function buildSeedQueryStrategy(watchTopicId: string): StoredQueryStrategy {
  const strategy = {
    mode: "structured" as const,
    raw_query: MAGNESIUM_CORTISOL_RAW_QUERY,
    structured_query: MAGNESIUM_CORTISOL_STRUCTURED_QUERY,
    query_version: MAGNESIUM_CORTISOL_QUERY_VERSION,
  };

  return {
    ...strategy,
    query_hash: buildStoredQueryHash(watchTopicId, strategy),
  };
}

export function createSeedWatchTopic(): WatchTopicState {
  return {
    watch_topic_id: WATCH_MAGNESIUM_CORTISOL_TOPIC_ID,
    claim_family: MAGNESIUM_CORTISOL_CLAIM_FAMILY,
    label: "Magnesium and cortisol/stress physiology",
    active: true,
    frequency: "weekly",
    last_checked_utc: null,
    next_check_utc: null,
    baseline: {
      known_pmids: [],
      baseline_evidence_grade: "low",
      baseline_policy: MAGNESIUM_CORTISOL_BASELINE_POLICY,
      baseline_created_utc: null,
    },
    query_strategy: buildSeedQueryStrategy(WATCH_MAGNESIUM_CORTISOL_TOPIC_ID),
    last_alert: null,
    last_heartbeat: null,
  };
}

const IN_MEMORY_STORE_STATUS: WatchlistStoreStatus = {
  durable: false,
  store: "in_memory",
  adapter: "InMemoryWatchlistStore",
  state_survives_cold_start: false,
  suitable_for_production_monitoring: false,
  next_step: "Select and configure a durable store before real autonomous monitoring.",
};

export class InMemoryWatchlistStore implements WatchlistStore {
  private topics: Map<string, WatchTopicState> = new Map();

  async listWatchTopics(): Promise<WatchTopicState[]> {
    return [...this.topics.values()];
  }

  async getWatchTopic(watchTopicId: string): Promise<WatchTopicState | null> {
    return this.topics.get(watchTopicId) ?? null;
  }

  async saveWatchTopic(topic: WatchTopicState): Promise<void> {
    this.topics.set(topic.watch_topic_id, structuredClone(topic));
  }

  async updateWatchTopicState(
    watchTopicId: string,
    patch: WatchTopicStatePatch
  ): Promise<WatchTopicState | null> {
    const existing = this.topics.get(watchTopicId);
    if (!existing) {
      return null;
    }

    const updated: WatchTopicState = {
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

    this.topics.set(watchTopicId, updated);
    return updated;
  }

  async seedDefaultWatchTopicsIfEmpty(): Promise<void> {
    if (this.topics.size > 0) {
      return;
    }

    const seed = createSeedWatchTopic();
    this.topics.set(seed.watch_topic_id, seed);
  }

  getStoreStatus(): WatchlistStoreStatus {
    return IN_MEMORY_STORE_STATUS;
  }
}

/** Singleton in-memory store for the current serverless instance. */
let defaultStore: InMemoryWatchlistStore | null = null;

export function getInMemoryWatchlistStore(): InMemoryWatchlistStore {
  if (!defaultStore) {
    defaultStore = new InMemoryWatchlistStore();
  }

  return defaultStore;
}

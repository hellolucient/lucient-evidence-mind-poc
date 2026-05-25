import { createHash } from "crypto";

import type { ContributingSourceToDelta } from "./delta-attribution";
import {
  buildQueryStrategy,
  MAGNESIUM_CORTISOL_CLAIM_FAMILY,
  MAGNESIUM_CORTISOL_STRUCTURED_QUERY,
  WATCH_MAGNESIUM_CORTISOL_TOPIC_ID,
} from "./structured-query";

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

export type WatchlistState = {
  watch_topics: WatchTopicState[];
};

export const MAGNESIUM_CORTISOL_QUERY_VERSION = "watch-magnesium-cortisol@v1";

const MAGNESIUM_CORTISOL_BASELINE_POLICY =
  "Avoid direct cortisol-regulation claims; use relaxation/general wellbeing wording unless stronger direct human evidence emerges.";

const MAGNESIUM_CORTISOL_RAW_QUERY = "Magnesium for cortisol regulation";

/** POC in-memory state; resets when the serverless instance cold-starts. */
let inMemoryWatchlistState: WatchlistState | null = null;

function buildSeedQueryStrategy(): StoredQueryStrategy {
  const strategy = {
    mode: "structured" as const,
    raw_query: MAGNESIUM_CORTISOL_RAW_QUERY,
    structured_query: MAGNESIUM_CORTISOL_STRUCTURED_QUERY,
    query_version: MAGNESIUM_CORTISOL_QUERY_VERSION,
  };

  return {
    ...strategy,
    query_hash: hashQueryStrategy(strategy),
  };
}

export function createSeedWatchlistState(): WatchlistState {
  return {
    watch_topics: [
      {
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
        query_strategy: buildSeedQueryStrategy(),
        last_alert: null,
        last_heartbeat: null,
      },
    ],
  };
}

export function hashQueryStrategy(input: {
  query_version: string;
  mode: string;
  raw_query: string;
  structured_query: string | null;
}): string {
  const payload = JSON.stringify({
    query_version: input.query_version,
    mode: input.mode,
    raw_query: input.raw_query,
    structured_query: input.structured_query ?? "",
  });

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function resolveCurrentQueryHash(topic: WatchTopicState): string {
  const built = buildQueryStrategy(
    topic.query_strategy.raw_query,
    topic.watch_topic_id,
    topic.claim_family,
    topic.query_strategy.mode === "structured"
  );

  return hashQueryStrategy({
    query_version: topic.query_strategy.query_version,
    mode: built.mode,
    raw_query: built.raw_query,
    structured_query: built.structured_query,
  });
}

export async function loadWatchlistState(): Promise<WatchlistState> {
  if (!inMemoryWatchlistState) {
    inMemoryWatchlistState = createSeedWatchlistState();
  }

  return inMemoryWatchlistState;
}

/** No-op for POC: state is held in memory and mutated in place. */
export async function saveWatchlistState(state: WatchlistState): Promise<void> {
  void state;
}

export function calculateNextCheckUtc(
  fromIso: string,
  frequency: WatchFrequency
): string {
  const date = new Date(fromIso);

  switch (frequency) {
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case "monthly":
      date.setUTCDate(date.getUTCDate() + 30);
      break;
    case "quarterly":
      date.setUTCDate(date.getUTCDate() + 90);
      break;
  }

  return date.toISOString();
}

export function getDueWatchTopics(
  state: WatchlistState,
  force: boolean,
  nowIso: string
): { due: WatchTopicState[]; skipped: WatchTopicState[] } {
  const active = state.watch_topics.filter((topic) => topic.active);
  const now = new Date(nowIso).getTime();

  if (force) {
    return { due: active, skipped: [] };
  }

  const due: WatchTopicState[] = [];
  const skipped: WatchTopicState[] = [];

  for (const topic of active) {
    if (!topic.next_check_utc) {
      due.push(topic);
      continue;
    }

    if (new Date(topic.next_check_utc).getTime() <= now) {
      due.push(topic);
    } else {
      skipped.push(topic);
    }
  }

  return { due, skipped };
}

export function mergeKnownPmids(
  previousKnown: string[],
  foundPmids: string[]
): { merged: string[]; added: string[] } {
  const previousSet = new Set(previousKnown);
  const added = foundPmids.filter((pmid) => !previousSet.has(pmid));
  const merged = [...new Set([...previousKnown, ...foundPmids])];

  return { merged, added };
}

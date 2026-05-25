import {
  createSeedWatchTopic,
  getWatchlistStore,
  hashQueryStrategy,
  MAGNESIUM_CORTISOL_QUERY_VERSION,
  resolveCurrentQueryHash,
  type StoredLastAlert,
  type StoredLastHeartbeat,
  type StoredQueryStrategy,
  type WatchFrequency,
  type WatchTopicBaselineState,
  type WatchTopicState,
  type WatchTopicStatePatch,
  type WatchlistStore,
  type WatchlistStoreStatus,
} from "@/engine/watchlist";

export type {
  StoredLastAlert,
  StoredLastHeartbeat,
  StoredQueryStrategy,
  WatchFrequency,
  WatchTopicBaselineState,
  WatchTopicState,
  WatchTopicStatePatch,
  WatchlistStore,
  WatchlistStoreStatus,
};

export {
  createSeedWatchTopic,
  getWatchlistStore,
  hashQueryStrategy,
  MAGNESIUM_CORTISOL_QUERY_VERSION,
  resolveCurrentQueryHash,
};

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
  topics: WatchTopicState[],
  force: boolean,
  nowIso: string
): { due: WatchTopicState[]; skipped: WatchTopicState[] } {
  const active = topics.filter((topic) => topic.active);
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

/** @deprecated Use getWatchlistStore().seedDefaultWatchTopicsIfEmpty() instead. */
export async function loadWatchlistState(): Promise<{ watch_topics: WatchTopicState[] }> {
  const store = getWatchlistStore();
  await store.seedDefaultWatchTopicsIfEmpty();
  const watch_topics = await store.listWatchTopics();
  return { watch_topics };
}

/** @deprecated State is persisted via WatchlistStore.updateWatchTopicState(). */
export async function saveWatchlistState(_state: {
  watch_topics: WatchTopicState[];
}): Promise<void> {
  void _state;
}

/** @deprecated Use createSeedWatchTopic() from engine/watchlist. */
export function createSeedWatchlistState(): { watch_topics: WatchTopicState[] } {
  return { watch_topics: [createSeedWatchTopic()] };
}

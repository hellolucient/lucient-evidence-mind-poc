import { getInMemoryWatchlistStore } from "./in-memory-watchlist-store";
import type { WatchlistStore } from "./watchlist-store";

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
} from "./watchlist-store";

export {
  buildStoredQueryHash,
  hashQueryStrategy,
  hashStoredQueryStrategy,
  resolveCurrentQueryHash,
} from "./query-hash";

export {
  createSeedWatchTopic,
  getInMemoryWatchlistStore,
  InMemoryWatchlistStore,
  MAGNESIUM_CORTISOL_QUERY_VERSION,
} from "./in-memory-watchlist-store";

/** Returns the active watchlist store. Defaults to in-memory for POC Phase 10.5. */
export function getWatchlistStore(): WatchlistStore {
  return getInMemoryWatchlistStore();
}

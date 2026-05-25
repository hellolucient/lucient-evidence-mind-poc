import type {
  WatchlistStore,
  WatchlistStoreEnvDebug,
  WatchlistStoreSelection,
} from "./watchlist-store";

export type {
  StoredLastAlert,
  StoredLastHeartbeat,
  StoredQueryStrategy,
  WatchFrequency,
  WatchTopicBaselineState,
  WatchTopicState,
  WatchTopicStatePatch,
  WatchlistStore,
  WatchlistStoreEnvDebug,
  WatchlistStoreSelection,
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

export { SupabaseWatchlistStore } from "./supabase-watchlist-store";
export { createSupabaseServerClient, getSupabaseEnvConfig } from "./supabase-client";

export {
  buildPersistenceStatus,
  getWatchlistStore,
  resolveWatchlistStore,
} from "./store-selector";

import { getInMemoryWatchlistStore } from "./in-memory-watchlist-store";
import { SupabaseWatchlistStore } from "./supabase-watchlist-store";
import { getSupabaseEnvConfig } from "./supabase-client";
import type {
  WatchlistStore,
  WatchlistStoreEnvDebug,
  WatchlistStoreSelection,
} from "./watchlist-store";

let cachedSelection: WatchlistStoreSelection | null = null;
let selectionPromise: Promise<WatchlistStoreSelection> | null = null;

function buildInMemorySelection(
  envDebug: WatchlistStoreEnvDebug
): WatchlistStoreSelection {
  return {
    store: getInMemoryWatchlistStore(),
    env_debug: envDebug,
  };
}

async function selectWatchlistStore(): Promise<WatchlistStoreSelection> {
  const env = getSupabaseEnvConfig();

  if (!env.hasSupabaseUrl || !env.hasSupabaseServiceRoleKey) {
    const fallbackReason = !env.hasSupabaseUrl
      ? "NEXT_PUBLIC_SUPABASE_URL is not configured."
      : "SUPABASE_SERVICE_ROLE_KEY is not configured.";

    return buildInMemorySelection({
      has_supabase_url: env.hasSupabaseUrl,
      has_supabase_service_role_key: env.hasSupabaseServiceRoleKey,
      supabase_url_host: env.supabaseUrlHost,
      selected_store: "in_memory",
      fallback_reason: fallbackReason,
    });
  }

  try {
    const supabaseStore = SupabaseWatchlistStore.create();
    await supabaseStore.verifyConnection();

    return {
      store: supabaseStore,
      env_debug: {
        has_supabase_url: true,
        has_supabase_service_role_key: true,
        supabase_url_host: env.supabaseUrlHost,
        selected_store: "supabase",
        fallback_reason: null,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Supabase watchlist store initialization failed.";

    return buildInMemorySelection({
      has_supabase_url: true,
      has_supabase_service_role_key: true,
      supabase_url_host: env.supabaseUrlHost,
      selected_store: "in_memory",
      fallback_reason: message,
    });
  }
}

export async function resolveWatchlistStore(): Promise<WatchlistStoreSelection> {
  if (cachedSelection) {
    return cachedSelection;
  }

  if (!selectionPromise) {
    selectionPromise = selectWatchlistStore().then((selection) => {
      cachedSelection = selection;
      return selection;
    });
  }

  return selectionPromise;
}

/** @deprecated Use resolveWatchlistStore() for async adapter selection. */
export function getWatchlistStore(): WatchlistStore {
  if (cachedSelection) {
    return cachedSelection.store;
  }

  return getInMemoryWatchlistStore();
}

export function buildPersistenceStatus(
  selection: WatchlistStoreSelection
): ReturnType<WatchlistStore["getStoreStatus"]> {
  const status = selection.store.getStoreStatus();

  if (selection.env_debug.selected_store === "in_memory") {
    return {
      ...status,
      fallback_reason: selection.env_debug.fallback_reason,
    };
  }

  return status;
}

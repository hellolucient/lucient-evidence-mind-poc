/** Single source of truth for watchtower runtime diagnostic phase markers. */
export const CURRENT_WATCH_PHASE = "18" as const;

export type CurrentWatchPhase = typeof CURRENT_WATCH_PHASE;

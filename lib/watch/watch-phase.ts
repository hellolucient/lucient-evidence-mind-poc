/** Centralized watchtower phase marker for cron responses and watch run logging. */
export const CURRENT_WATCH_PHASE = "28" as const;

export type CurrentWatchPhase = typeof CURRENT_WATCH_PHASE;

/** Current watchtower runtime diagnostic phase for cron responses and watch_runs rows. */
export const WATCH_RUNTIME_PHASE = "15" as const;

export type WatchRuntimePhase = typeof WATCH_RUNTIME_PHASE;

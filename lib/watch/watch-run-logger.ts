import {
  createSupabaseServerClient,
  getSupabaseEnvConfig,
  WATCH_RUNS_TABLE,
} from "@/engine/watchlist/supabase-client";
import type { RunDueResponse } from "@/lib/watch-run-due";
import type { EvidenceAlertPersistenceSummary } from "./evidence-alert-store";

export type WatchRunStatus = "success" | "error";

export type WatchRunRecordInput = {
  started_at: string;
  finished_at: string;
  trigger: string;
  source: string;
  phase: string;
  durable: boolean;
  store: string;
  adapter: string;
  force: boolean;
  dry_run: boolean;
  checked_count: number;
  skipped_count: number;
  alerts_count: number;
  errors_count: number;
  status: WatchRunStatus;
  error_message?: string | null;
  response_summary?: Record<string, unknown> | null;
};

export type WatchRunLogResult = {
  logged: boolean;
  watch_run_id: string | null;
  reason?: string;
};

export type WatchRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string;
  source: string;
  phase: string;
  durable: boolean;
  store: string;
  adapter: string;
  force: boolean;
  dry_run: boolean;
  checked_count: number;
  skipped_count: number;
  alerts_count: number;
  errors_count: number;
  status: string;
  error_message: string | null;
  response_summary: Record<string, unknown> | null;
  created_at: string;
};

type WatchRunsInsertRow = {
  started_at: string;
  finished_at: string;
  trigger: string;
  source: string;
  phase: string;
  durable: boolean;
  store: string;
  adapter: string;
  force: boolean;
  dry_run: boolean;
  checked_count: number;
  skipped_count: number;
  alerts_count: number;
  errors_count: number;
  status: string;
  error_message: string | null;
  response_summary: Record<string, unknown> | null;
};

const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
  /\b(api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi,
];

export function sanitizeWatchRunErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "Unknown watch run error.";
  const redacted = SECRET_PATTERNS.reduce(
    (message, pattern) => message.replace(pattern, "[redacted]"),
    raw
  );

  return redacted.slice(0, 500);
}

export function isWatchRunLoggingConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

function buildWatchRunInsertRow(input: WatchRunRecordInput): WatchRunsInsertRow {
  return {
    started_at: input.started_at,
    finished_at: input.finished_at,
    trigger: input.trigger,
    source: input.source,
    phase: input.phase,
    durable: input.durable,
    store: input.store,
    adapter: input.adapter,
    force: input.force,
    dry_run: input.dry_run,
    checked_count: input.checked_count,
    skipped_count: input.skipped_count,
    alerts_count: input.alerts_count,
    errors_count: input.errors_count,
    status: input.status,
    error_message: input.error_message ?? null,
    response_summary: input.response_summary ?? null,
  };
}

export function buildRunDueResponseSummary(
  route: string,
  runDue: RunDueResponse,
  alertPersistence?: EvidenceAlertPersistenceSummary
): Record<string, unknown> {
  return {
    route,
    run_id: runDue.run_id,
    mode: runDue.mode,
    watches_found: runDue.watches_found,
    watches_run: runDue.watches_run,
    watches_skipped: runDue.watches_skipped,
    result_statuses: runDue.results.map((result) => ({
      watch_topic_id: result.watch_topic_id,
      status: result.status,
      alert_required: result.evidence_change_alert.alert_required,
    })),
    ...(alertPersistence
      ? {
          evidence_alerts_logged: alertPersistence.evidence_alerts_logged,
          evidence_alerts_duplicate_skipped:
            alertPersistence.evidence_alerts_duplicate_skipped,
        }
      : {}),
  };
}

export function buildRunDueWatchRunInput(options: {
  route: "/api/watch/run-due" | "/api/watch/cron";
  trigger: string;
  source: string;
  phase: string;
  startedAt: string;
  finishedAt: string;
  runDue: RunDueResponse;
  status?: WatchRunStatus;
  errorMessage?: string | null;
  alertPersistence?: EvidenceAlertPersistenceSummary;
}): WatchRunRecordInput {
  const alertsCount = options.runDue.results.filter(
    (result) => result.evidence_change_alert.alert_required
  ).length;
  const errorsCount = options.runDue.results.filter(
    (result) => result.status === "error"
  ).length;
  const status =
    options.status ??
    (errorsCount > 0 && options.runDue.watches_run === 0 ? "error" : "success");

  return {
    started_at: options.startedAt,
    finished_at: options.finishedAt,
    trigger: options.trigger,
    source: options.source,
    phase: options.phase,
    durable: options.runDue.persistence_status.durable,
    store: options.runDue.persistence_status.store,
    adapter: options.runDue.persistence_status.adapter,
    force: options.runDue.force,
    dry_run: options.runDue.dry_run,
    checked_count: options.runDue.watches_run,
    skipped_count: options.runDue.watches_skipped,
    alerts_count: alertsCount,
    errors_count: errorsCount,
    status,
    error_message: options.errorMessage ?? null,
    response_summary: buildRunDueResponseSummary(
      options.route,
      options.runDue,
      options.alertPersistence
    ),
  };
}

export async function logWatchRun(
  input: WatchRunRecordInput
): Promise<WatchRunLogResult> {
  if (input.dry_run) {
    return {
      logged: false,
      watch_run_id: null,
      reason: "dry_run_skipped",
    };
  }

  if (!isWatchRunLoggingConfigured()) {
    return {
      logged: false,
      watch_run_id: null,
      reason: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(WATCH_RUNS_TABLE)
      .insert(buildWatchRunInsertRow(input))
      .select("id")
      .single();

    if (error) {
      return {
        logged: false,
        watch_run_id: null,
        reason: sanitizeWatchRunErrorMessage(error),
      };
    }

    return {
      logged: true,
      watch_run_id: data.id,
    };
  } catch (error) {
    return {
      logged: false,
      watch_run_id: null,
      reason: sanitizeWatchRunErrorMessage(error),
    };
  }
}

export async function logWatchRunFailure(input: {
  startedAt: string;
  finishedAt: string;
  trigger: string;
  source: string;
  phase: string;
  route: string;
  durable?: boolean;
  store?: string;
  adapter?: string;
  force?: boolean;
  dryRun?: boolean;
  error: unknown;
}): Promise<WatchRunLogResult> {
  if (input.dryRun) {
    return {
      logged: false,
      watch_run_id: null,
      reason: "dry_run_skipped",
    };
  }

  return logWatchRun({
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    trigger: input.trigger,
    source: input.source,
    phase: input.phase,
    durable: input.durable ?? false,
    store: input.store ?? "unknown",
    adapter: input.adapter ?? "unknown",
    force: input.force ?? false,
    dry_run: input.dryRun ?? false,
    checked_count: 0,
    skipped_count: 0,
    alerts_count: 0,
    errors_count: 1,
    status: "error",
    error_message: sanitizeWatchRunErrorMessage(input.error),
    response_summary: {
      route: input.route,
      stage: "watch_run_failed",
    },
  });
}

export async function listWatchRuns(
  limit = 20
): Promise<{ runs: WatchRunRow[]; error?: string }> {
  if (!isWatchRunLoggingConfigured()) {
    return {
      runs: [],
      error: "supabase_not_configured",
    };
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(WATCH_RUNS_TABLE)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      return {
        runs: [],
        error: sanitizeWatchRunErrorMessage(error),
      };
    }

    return {
      runs: (data ?? []) as WatchRunRow[],
    };
  } catch (error) {
    return {
      runs: [],
      error: sanitizeWatchRunErrorMessage(error),
    };
  }
}

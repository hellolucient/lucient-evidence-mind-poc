import {
  authorizeCronRequest,
  buildCronUnauthorizedResponse,
  isCronSecretConfigured,
  type CronAuthFailure,
  type CronAuthTrigger,
} from "./cron-auth";
import { buildRunDueResponse } from "./watch-run-due";
import {
  buildRunDueWatchRunInput,
  logWatchRun,
  logWatchRunFailure,
} from "./watch/watch-run-logger";

export type WatchCronResponse = {
  ok: true;
  phase: "13";
  route: "/api/watch/cron";
  trigger: CronAuthTrigger;
  source: CronAuthTrigger;
  durable: boolean;
  store: string;
  adapter: string;
  force: false;
  dry_run: false;
  checked_count: number;
  skipped_count: number;
  alerts_count: number;
  errors_count: number;
  started_at: string;
  finished_at: string;
  cron_secret_configured: boolean;
  watch_run_logged: boolean;
  watch_run_id: string | null;
};

export type WatchCronUnauthorizedResponse = ReturnType<
  typeof buildCronUnauthorizedResponse
>;

export type WatchCronRequestHeaders = {
  authorization: string | null;
  userAgent: string | null;
};

export function authorizeWatchCronRequest(
  headers: WatchCronRequestHeaders
):
  | { authorized: true; trigger: CronAuthTrigger }
  | { authorized: false; body: WatchCronUnauthorizedResponse } {
  const auth = authorizeCronRequest(headers);

  if (!auth.authorized) {
    return {
      authorized: false,
      body: buildCronUnauthorizedResponse(auth as CronAuthFailure),
    };
  }

  return { authorized: true, trigger: auth.trigger };
}

export async function buildWatchCronResponse(
  trigger: CronAuthTrigger
): Promise<WatchCronResponse> {
  const startedAt = new Date().toISOString();

  try {
    const runDue = await buildRunDueResponse({
      force: false,
      dry_run: false,
    });
    const finishedAt = new Date().toISOString();
    const alertsCount = runDue.results.filter(
      (result) => result.evidence_change_alert.alert_required
    ).length;
    const errorsCount = runDue.results.filter(
      (result) => result.status === "error"
    ).length;

    const logResult = await logWatchRun(
      buildRunDueWatchRunInput({
        route: "/api/watch/cron",
        trigger,
        source: trigger,
        phase: "13",
        startedAt,
        finishedAt,
        runDue,
        status: "success",
      })
    );

    return {
      ok: true,
      phase: "13",
      route: "/api/watch/cron",
      trigger,
      source: trigger,
      durable: runDue.persistence_status.durable,
      store: runDue.persistence_status.store,
      adapter: runDue.persistence_status.adapter,
      force: false,
      dry_run: false,
      checked_count: runDue.watches_run,
      skipped_count: runDue.watches_skipped,
      alerts_count: alertsCount,
      errors_count: errorsCount,
      started_at: startedAt,
      finished_at: finishedAt,
      cron_secret_configured: isCronSecretConfigured(),
      watch_run_logged: logResult.logged,
      watch_run_id: logResult.watch_run_id,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await logWatchRunFailure({
      startedAt,
      finishedAt,
      trigger,
      source: trigger,
      phase: "13",
      route: "/api/watch/cron",
      force: false,
      dryRun: false,
      error,
    });
    throw error;
  }
}

import {
  authorizeCronRequest,
  buildCronUnauthorizedResponse,
  isCronSecretConfigured,
  type CronAuthFailure,
  type CronAuthTrigger,
} from "./cron-auth";
import {
  isPrivacySafeRunDueDigestsResponse,
  runDueEvidenceMindDigests,
  type RunDueEvidenceMindDigestsResult,
} from "./watch/evidence-mind-digest-scheduler";
import { CURRENT_WATCH_PHASE } from "./watch/watch-phase";

export const MIND_DIGEST_CRON_ROUTE = "/api/mind-digests/run-due" as const;

export type MindDigestCronResponse = {
  ok: true;
  phase: typeof CURRENT_WATCH_PHASE;
  route: typeof MIND_DIGEST_CRON_ROUTE;
  trigger: CronAuthTrigger;
  workspace_count: number;
  generated_count: number;
  skipped_existing_count: number;
  error_count: number;
  digest_ids: string[];
  workspace_results: RunDueEvidenceMindDigestsResult["workspace_results"];
  started_at: string;
  finished_at: string;
  cron_secret_configured: boolean;
};

export type MindDigestCronUnauthorizedResponse = ReturnType<
  typeof buildCronUnauthorizedResponse
>;

export type MindDigestCronRequestHeaders = {
  authorization: string | null;
  userAgent: string | null;
};

export function authorizeMindDigestCronRequest(
  headers: MindDigestCronRequestHeaders
):
  | { authorized: true; trigger: CronAuthTrigger }
  | { authorized: false; body: MindDigestCronUnauthorizedResponse } {
  const auth = authorizeCronRequest(headers);

  if (!auth.authorized) {
    return {
      authorized: false,
      body: buildCronUnauthorizedResponse(auth as CronAuthFailure, MIND_DIGEST_CRON_ROUTE),
    };
  }

  return { authorized: true, trigger: auth.trigger };
}

export async function buildMindDigestCronResponse(
  trigger: CronAuthTrigger
): Promise<MindDigestCronResponse> {
  const startedAt = new Date().toISOString();
  const runDue = await runDueEvidenceMindDigests();
  const finishedAt = new Date().toISOString();

  return {
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: MIND_DIGEST_CRON_ROUTE,
    trigger,
    workspace_count: runDue.workspace_results.length,
    generated_count: runDue.generated_count,
    skipped_existing_count: runDue.skipped_existing_count,
    error_count: runDue.error_count,
    digest_ids: runDue.digest_ids,
    workspace_results: runDue.workspace_results,
    started_at: startedAt,
    finished_at: finishedAt,
    cron_secret_configured: isCronSecretConfigured(),
  };
}

export function isPrivacySafeMindDigestCronResponse(
  response: Record<string, unknown>
): boolean {
  return isPrivacySafeRunDueDigestsResponse(response);
}

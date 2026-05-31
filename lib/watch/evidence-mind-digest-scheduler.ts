import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { SCHEDULED_DIGEST_WORKSPACE_IDS } from "@/lib/review/evidence-mind-digest-constants";
import { generateEvidenceMindDigestForWorkspace } from "@/lib/watch/evidence-mind-digest-generator";

export type ScheduledDigestWorkspaceOutcome = "generated" | "skipped_existing" | "error";

export type ScheduledDigestWorkspaceResult = {
  workspace_id: string;
  outcome: ScheduledDigestWorkspaceOutcome;
  digest_id?: string;
  error?: string;
};

export type RunDueEvidenceMindDigestsResult = {
  workspace_results: ScheduledDigestWorkspaceResult[];
  generated_count: number;
  skipped_existing_count: number;
  error_count: number;
  digest_ids: string[];
};

export function buildScheduledDigestAccess(): ReviewQueueAccessContext {
  return {
    authorized: true,
    mode: "break_glass",
    workspaceIds: null,
  };
}

export async function runDueEvidenceMindDigests(
  workspaceIds: readonly string[] = SCHEDULED_DIGEST_WORKSPACE_IDS
): Promise<RunDueEvidenceMindDigestsResult> {
  const access = buildScheduledDigestAccess();
  const workspace_results: ScheduledDigestWorkspaceResult[] = [];
  const digest_ids: string[] = [];
  let generated_count = 0;
  let skipped_existing_count = 0;
  let error_count = 0;

  for (const workspaceId of workspaceIds) {
    const result = await generateEvidenceMindDigestForWorkspace(access, {
      workspaceId,
      generationSource: "scheduled",
    });

    if (!result.ok) {
      error_count += 1;
      workspace_results.push({
        workspace_id: workspaceId,
        outcome: "error",
        error: result.error,
      });
      continue;
    }

    if (result.duplicate_skipped) {
      skipped_existing_count += 1;
      workspace_results.push({
        workspace_id: workspaceId,
        outcome: "skipped_existing",
        digest_id: result.digest.id,
      });
      digest_ids.push(result.digest.id);
      continue;
    }

    generated_count += 1;
    workspace_results.push({
      workspace_id: workspaceId,
      outcome: "generated",
      digest_id: result.digest.id,
    });
    digest_ids.push(result.digest.id);
  }

  return {
    workspace_results,
    generated_count,
    skipped_existing_count,
    error_count,
    digest_ids,
  };
}

export function isPrivacySafeRunDueDigestsResponse(response: Record<string, unknown>): boolean {
  const forbiddenKeys = [
    "authorization",
    "cron_secret",
    "service_role",
    "token",
    "secret",
    "password",
    "email",
  ];

  for (const key of Object.keys(response)) {
    if (forbiddenKeys.some((forbidden) => key.toLowerCase().includes(forbidden))) {
      return false;
    }
  }

  return true;
}

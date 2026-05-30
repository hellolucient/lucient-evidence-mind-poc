import { afterEach, describe, expect, it, vi } from "vitest";
import { getDueWatchTopics } from "./watchlist-state";
import type { WatchTopicState } from "./watchlist-state";

vi.mock("./watch-run-due", () => ({
  buildRunDueResponse: vi.fn(),
}));

vi.mock("./watch/watch-run-logger", () => ({
  buildRunDueWatchRunInput: vi.fn((options) => options),
  logWatchRun: vi.fn(),
  logWatchRunFailure: vi.fn(),
}));

vi.mock("./watch/evidence-alert-store", () => ({
  persistEvidenceAlertsFromRunDue: vi.fn(),
  linkEvidenceAlertsToWatchRun: vi.fn(),
  toEvidenceAlertPersistenceSummary: vi.fn((result) => ({
    evidence_alerts_logged: result.evidence_alerts_logged,
    evidence_alerts_duplicate_skipped: result.evidence_alerts_duplicate_skipped,
  })),
}));

import { buildRunDueResponse } from "./watch-run-due";
import { logWatchRun } from "./watch/watch-run-logger";
import {
  linkEvidenceAlertsToWatchRun,
  persistEvidenceAlertsFromRunDue,
} from "./watch/evidence-alert-store";
import {
  authorizeWatchCronRequest,
  buildWatchCronResponse,
} from "./watch-cron";

const mockedBuildRunDueResponse = vi.mocked(buildRunDueResponse);
const mockedLogWatchRun = vi.mocked(logWatchRun);
const mockedPersistEvidenceAlerts = vi.mocked(persistEvidenceAlertsFromRunDue);
const mockedLinkEvidenceAlerts = vi.mocked(linkEvidenceAlertsToWatchRun);

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("watch-cron", () => {
  it("returns unauthorized body for missing auth", () => {
    process.env.CRON_SECRET = "secret";

    const result = authorizeWatchCronRequest({
      authorization: null,
      userAgent: "curl/8.0",
    });

    expect(result.authorized).toBe(false);
    if (result.authorized) {
      return;
    }

    expect(result.body).toMatchObject({
      ok: false,
      phase: "13",
      route: "/api/watch/cron",
      cron_secret_configured: true,
    });
    expect(mockedLogWatchRun).not.toHaveBeenCalled();
    expect(mockedPersistEvidenceAlerts).not.toHaveBeenCalled();
  });

  it("calls run-due service with force=false and dry_run=false", async () => {
    mockedBuildRunDueResponse.mockResolvedValue({
      run_id: "test-run",
      generated_at: "2026-05-27T02:00:00.000Z",
      mode: "scheduled_watch_simulation",
      force: false,
      dry_run: false,
      watches_found: 1,
      watches_run: 0,
      watches_skipped: 1,
      results: [
        {
          watch_topic_id: "watch-1",
          claim_family: "claim-1",
          status: "skipped",
          previous_known_pmids_count: 2,
          current_known_pmids_count: 2,
          new_pmids: [],
          query_hash: "hash-1",
          query_version: "v1",
          evidence_delta: {
            change_level: "none",
            direction: "no_change",
            delta_summary: "Watch topic not due for scheduled check.",
            delta_confidence: 1,
            contributing_sources_to_delta: [],
            non_contributing_sources: [],
            alert_reason_codes: ["WATCH_NOT_DUE"],
            alert_threshold_explanation: "Scheduled check skipped.",
          },
          evidence_change_alert: {
            alert_required: false,
            alert_type: "none",
            affected_claim_family_id: "claim-1",
            affected_workspace_ids_visible_to_mind: false,
            app_should_map_to_private_workspaces: true,
            alert_summary: "Watch not due.",
          },
          heartbeat: {
            emitted: false,
            summary: "Watch not due; no heartbeat emitted.",
            no_material_change: true,
          },
          state_update: {
            updated: false,
            last_checked_utc: "2026-05-26T02:00:00.000Z",
            next_check_utc: "2026-06-02T02:00:00.000Z",
            baseline_pmids_added: [],
          },
        },
      ],
      privacy_boundary: {
        scheduled_runner_receives: [],
        scheduled_runner_does_not_receive: [],
        app_maps_back_to_clients: true,
      },
      persistence_status: {
        durable: true,
        store: "supabase",
        adapter: "SupabaseWatchlistStore",
        state_survives_cold_start: true,
        suitable_for_production_monitoring: true,
        next_step: "done",
      },
      persistence_warning: {
        durable: true,
        reason: "Watchlist state is persisted to Supabase watchlist_topics.",
        next_step: "Configure Vercel cron or scheduled trigger for autonomous monitoring.",
      },
      limitations: [],
    });
    mockedLogWatchRun.mockResolvedValue({
      logged: true,
      watch_run_id: "run-uuid-123",
    });
    mockedPersistEvidenceAlerts.mockResolvedValue({
      configured: true,
      persisted: true,
      evidence_alerts_logged: 0,
      evidence_alerts_duplicate_skipped: 0,
      evidence_alert_ids: [],
    });

    process.env.CRON_SECRET = "secret";
    const response = await buildWatchCronResponse("manual_authorized");

    expect(mockedBuildRunDueResponse).toHaveBeenCalledWith({
      force: false,
      dry_run: false,
    });
    expect(mockedPersistEvidenceAlerts).toHaveBeenCalledWith({
      runDue: expect.objectContaining({ run_id: "test-run" }),
      watchRunId: null,
      dryRun: false,
    });
    expect(mockedLogWatchRun).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: "manual_authorized",
        source: "manual_authorized",
        phase: "14",
      })
    );
    expect(mockedLinkEvidenceAlerts).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      ok: true,
      phase: "14",
      route: "/api/watch/cron",
      trigger: "manual_authorized",
      source: "manual_authorized",
      durable: true,
      store: "supabase",
      adapter: "SupabaseWatchlistStore",
      force: false,
      dry_run: false,
      checked_count: 0,
      skipped_count: 1,
      alerts_count: 0,
      errors_count: 0,
      cron_secret_configured: true,
      watch_run_logged: true,
      watch_run_id: "run-uuid-123",
      evidence_alerts_logged: 0,
      evidence_alerts_duplicate_skipped: 0,
      evidence_alert_ids: [],
    });
    expect(response.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.finished_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("links persisted alerts to watch_run_id when alerts were inserted", async () => {
    mockedBuildRunDueResponse.mockResolvedValue({
      run_id: "test-run",
      generated_at: "2026-05-27T02:00:00.000Z",
      mode: "scheduled_watch_simulation",
      force: false,
      dry_run: false,
      watches_found: 1,
      watches_run: 1,
      watches_skipped: 0,
      results: [],
      privacy_boundary: {
        scheduled_runner_receives: [],
        scheduled_runner_does_not_receive: [],
        app_maps_back_to_clients: true,
      },
      persistence_status: {
        durable: true,
        store: "supabase",
        adapter: "SupabaseWatchlistStore",
        state_survives_cold_start: true,
        suitable_for_production_monitoring: true,
        next_step: "done",
      },
      persistence_warning: {
        durable: true,
        reason: "persisted",
        next_step: "done",
      },
      limitations: [],
    });
    mockedPersistEvidenceAlerts.mockResolvedValue({
      configured: true,
      persisted: true,
      evidence_alerts_logged: 1,
      evidence_alerts_duplicate_skipped: 0,
      evidence_alert_ids: ["alert-uuid-1"],
    });
    mockedLogWatchRun.mockResolvedValue({
      logged: true,
      watch_run_id: "run-uuid-456",
    });

    await buildWatchCronResponse("vercel_cron");

    expect(mockedLinkEvidenceAlerts).toHaveBeenCalledWith(
      ["alert-uuid-1"],
      "run-uuid-456"
    );
  });

  it("respects next_check_utc when force=false via shared due-run logic", () => {
    const topic: WatchTopicState = {
      watch_topic_id: "watch-1",
      claim_family: "claim-1",
      label: "Test watch",
      active: true,
      frequency: "weekly",
      last_checked_utc: "2026-05-26T02:00:00.000Z",
      next_check_utc: "2026-06-02T02:00:00.000Z",
      baseline: {
        known_pmids: ["123"],
        baseline_evidence_grade: "low",
        baseline_policy: "policy",
        baseline_created_utc: "2026-05-26T02:00:00.000Z",
      },
      query_strategy: {
        mode: "structured",
        raw_query: "query",
        structured_query: "structured query",
        query_hash: "hash",
        query_version: "v1",
      },
      last_alert: null,
      last_heartbeat: null,
    };

    const { due, skipped } = getDueWatchTopics(
      [topic],
      false,
      "2026-05-27T02:00:00.000Z"
    );

    expect(due).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockReviewInsert = vi.fn();
const mockReviewSelect = vi.fn();
const mockReviewSingle = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockIn = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) =>
    mockCreateSupabaseServerClient(...args),
  EVIDENCE_ALERTS_TABLE: "evidence_alerts",
  EVIDENCE_REVIEW_ITEMS_TABLE: "evidence_review_items",
}));

import {
  buildEvidenceAlertCandidates,
  linkEvidenceAlertsToWatchRun,
  persistEvidenceAlertsFromRunDue,
} from "./evidence-alert-store";
import type { WatchCheckResponse } from "@/lib/watch-check";
import type { RunDueResponse } from "@/lib/watch-run-due";
import type { WatchTopicState } from "@/lib/watchlist-state";

const topic: WatchTopicState = {
  watch_topic_id: "watch-magnesium-cortisol",
  claim_family: "magnesium_cortisol_stress",
  label: "Magnesium cortisol",
  active: true,
  frequency: "weekly",
  last_checked_utc: "2026-05-26T02:00:00.000Z",
  next_check_utc: "2026-05-20T02:00:00.000Z",
  baseline: {
    known_pmids: ["111"],
    baseline_evidence_grade: "low",
    baseline_policy: "cautious",
    baseline_created_utc: "2026-05-26T02:00:00.000Z",
  },
  query_strategy: {
    mode: "structured",
    raw_query: "magnesium cortisol",
    structured_query: "structured query",
    query_hash: "hash",
    query_version: "v1",
  },
  last_alert: null,
  last_heartbeat: null,
};

function buildCheck(newPmids: string[]): WatchCheckResponse {
  return {
    watch_check_id: "check-1",
    generated_at: "2026-05-30T21:00:00.000Z",
    workspace_id: "demo",
    watch_topic_id: topic.watch_topic_id,
    claim_family: topic.claim_family,
    query_used: "magnesium cortisol query",
    query_strategy: {
      mode: "structured",
      raw_query: "magnesium cortisol",
      structured_query: "structured query",
      watch_topic_id: topic.watch_topic_id,
      query_intent: "monitor magnesium",
      exclusion_terms_applied: [],
    },
    baseline: {
      last_checked_date: "2026-05-26",
      known_pmids: ["111"],
      baseline_evidence_grade: "low",
      baseline_policy: "cautious",
    },
    pubmed_check: {
      status: "success",
      records_found: 2,
      known_records_found: 1,
      new_records_found: newPmids.length,
      new_pmids: newPmids,
      found_pmids: ["111", ...newPmids],
    },
    new_sources: newPmids.map((pmid) => ({
      source_id: `pubmed-${pmid}`,
      source_type: "pubmed" as const,
      source_rank: 1,
      title: `Study ${pmid}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      publication_year: 2026,
      evidence_level: "clinical_trial" as const,
      relevance_to_claim: "direct" as const,
      supports_claim: "mixed" as const,
      summary: "Summary text",
      meta: {
        pmid,
        doi: null,
        journal: "Test Journal",
        publication_date: "2026-01-01",
        citation: "Citation",
      },
      methodology: {
        study_design: "randomized_controlled_trial" as const,
        sample_size: 100,
        population: "adults",
        duration: "8 weeks",
      },
      analysis: {
        outcomes: ["cortisol"],
        effect_summary: "Reduced cortisol",
        claim_alignment: "mixed" as const,
        alignment_confidence: 0.7,
        relevance_score: 0.8,
      },
      study_limitations: [],
      regulatory_flags: [],
      regulatory_context: [],
    })),
    evidence_delta: {
      change_level: "possible_material",
      direction: "strengthens_support",
      delta_summary: "New evidence found",
      delta_confidence: 0.65,
      contributing_sources_to_delta: [],
      non_contributing_sources: [],
      alert_reason_codes: [],
      alert_threshold_explanation: "Material threshold crossed",
    },
    policy_impact: {
      policy_change_recommended: false,
      previous_policy: "cautious",
      recommended_policy: "cautious",
      policy_reason: "Review first",
    },
    evidence_change_alert: {
      alert_required: true,
      alert_type: "human_review",
      affected_claim_family_id: topic.claim_family,
      affected_workspace_ids_visible_to_mind: false,
      app_should_map_to_private_workspaces: true,
      alert_summary: "New material evidence",
    },
    privacy_boundary: {
      mind_receives: [],
      mind_does_not_receive: [],
      app_maps_back_to_clients: true,
    },
    limitations: [],
  };
}

function buildRunDueWithCandidates(
  candidates: ReturnType<typeof buildEvidenceAlertCandidates>
): RunDueResponse {
  return {
    run_id: "run-1",
    generated_at: "2026-05-30T21:00:00.000Z",
    mode: "scheduled_watch_simulation",
    force: false,
    dry_run: false,
    watches_found: 1,
    watches_run: 1,
    watches_skipped: 0,
    results: [
      {
        watch_topic_id: topic.watch_topic_id,
        claim_family: topic.claim_family,
        status: "completed",
        previous_known_pmids_count: 1,
        current_known_pmids_count: 2,
        new_pmids: candidates.map((candidate) => candidate.external_id),
        query_hash: "hash",
        query_version: "v1",
        evidence_delta: buildCheck([]).evidence_delta,
        evidence_change_alert: buildCheck([]).evidence_change_alert,
        heartbeat: {
          emitted: false,
          summary: "alert",
          no_material_change: false,
        },
        state_update: {
          updated: true,
          last_checked_utc: "2026-05-30T21:00:00.000Z",
          next_check_utc: "2026-06-06T21:00:00.000Z",
          baseline_pmids_added: candidates.map((candidate) => candidate.external_id),
        },
        new_evidence_candidates: candidates,
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
      reason: "persisted",
      next_step: "done",
    },
    limitations: [],
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mockFrom.mockImplementation((table: string) => {
    if (table === "evidence_review_items") {
      return {
        insert: mockReviewInsert,
      };
    }

    return {
      insert: mockInsert,
      update: mockUpdate,
    };
  });
  mockInsert.mockReturnValue({
    select: mockSelect,
  });
  mockReviewInsert.mockReturnValue({
    select: mockReviewSelect,
  });
  mockReviewSelect.mockReturnValue({
    single: mockReviewSingle,
  });
  mockSelect.mockReturnValue({
    single: mockSingle,
  });
  mockUpdate.mockReturnValue({
    in: mockIn,
  });
  mockIn.mockResolvedValue({ error: null });
  mockCreateSupabaseServerClient.mockReturnValue({
    from: mockFrom,
  });
  mockGetSupabaseEnvConfig.mockReturnValue({
    hasSupabaseUrl: true,
    hasSupabaseServiceRoleKey: true,
  });
});

describe("evidence-alert-store", () => {
  it("builds one candidate per new PMID", () => {
    const candidates = buildEvidenceAlertCandidates(buildCheck(["222"]), topic);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      watchlist_item_id: topic.watch_topic_id,
      claim_family: topic.claim_family,
      source: "pubmed",
      external_id: "222",
      external_id_type: "pmid",
      alert_type: "human_review",
    });
  });

  it("persists a new PMID as one evidence_alerts row", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "alert-uuid-1" },
      error: null,
    });

    const candidates = buildEvidenceAlertCandidates(buildCheck(["333"]), topic);
    const result = await persistEvidenceAlertsFromRunDue({
      runDue: buildRunDueWithCandidates(candidates),
      watchRunId: null,
    });

    expect(result.evidence_alerts_logged).toBe(1);
    expect(result.evidence_alert_ids).toEqual(["alert-uuid-1"]);
    expect(mockFrom).toHaveBeenCalledWith("evidence_alerts");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        external_id: "333",
        claim_family: topic.claim_family,
        watch_run_id: null,
      })
    );
  });

  it("skips duplicate PMID rows on repeat run", async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: { id: "alert-uuid-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });

    const candidates = buildEvidenceAlertCandidates(buildCheck(["444"]), topic);
    const runDue = buildRunDueWithCandidates(candidates);

    const first = await persistEvidenceAlertsFromRunDue({ runDue, watchRunId: null });
    const second = await persistEvidenceAlertsFromRunDue({ runDue, watchRunId: null });

    expect(first.evidence_alerts_logged).toBe(1);
    expect(second.evidence_alerts_logged).toBe(0);
    expect(second.evidence_alerts_duplicate_skipped).toBe(1);
  });

  it("does not persist when no new PMIDs were detected", async () => {
    const result = await persistEvidenceAlertsFromRunDue({
      runDue: buildRunDueWithCandidates([]),
      watchRunId: null,
    });

    expect(result.evidence_alerts_logged).toBe(0);
    expect(result.evidence_alert_ids).toEqual([]);
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("links inserted alerts to watch_run_id after cron logging", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "alert-uuid-99" },
      error: null,
    });

    const candidates = buildEvidenceAlertCandidates(buildCheck(["555"]), topic);
    const result = await persistEvidenceAlertsFromRunDue({
      runDue: buildRunDueWithCandidates(candidates),
      watchRunId: null,
    });

    await linkEvidenceAlertsToWatchRun(result.evidence_alert_ids, "run-uuid-123");

    expect(mockUpdate).toHaveBeenCalledWith({
      watch_run_id: "run-uuid-123",
      updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(mockIn).toHaveBeenCalledWith("id", ["alert-uuid-99"]);
  });

  it("skips persistence when dry_run is true", async () => {
    const candidates = buildEvidenceAlertCandidates(buildCheck(["666"]), topic);
    const result = await persistEvidenceAlertsFromRunDue({
      runDue: { ...buildRunDueWithCandidates(candidates), dry_run: true },
      watchRunId: null,
      dryRun: true,
    });

    expect(result.evidence_alerts_logged).toBe(0);
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("does not create review handoff items by default", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "alert-uuid-1" },
      error: null,
    });

    const candidates = buildEvidenceAlertCandidates(buildCheck(["777"]), topic);
    const result = await persistEvidenceAlertsFromRunDue({
      runDue: buildRunDueWithCandidates(candidates),
      watchRunId: null,
    });

    expect(result.evidence_alerts_logged).toBe(1);
    expect(result.review_items_logged).toBeUndefined();
    expect(mockReviewInsert).not.toHaveBeenCalled();
  });

  it("creates review handoff items when EIE_ENABLE_REVIEW_HANDOFFS is true", async () => {
    vi.stubEnv("EIE_ENABLE_REVIEW_HANDOFFS", "true");

    mockSingle.mockResolvedValue({
      data: { id: "alert-uuid-handoff" },
      error: null,
    });
    mockReviewSingle.mockResolvedValue({
      data: { id: "review-uuid-handoff" },
      error: null,
    });

    const candidates = buildEvidenceAlertCandidates(buildCheck(["888"]), topic);
    const result = await persistEvidenceAlertsFromRunDue({
      runDue: buildRunDueWithCandidates(candidates),
      watchRunId: "run-uuid-handoff",
    });

    expect(result.review_items_logged).toBe(1);
    expect(result.review_item_ids).toEqual(["review-uuid-handoff"]);
    expect(mockReviewInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence_alert_id: "alert-uuid-handoff",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
      })
    );
  });
});

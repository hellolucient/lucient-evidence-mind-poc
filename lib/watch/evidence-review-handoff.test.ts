import { describe, expect, it, vi } from "vitest";

const mockFindAffectedClientClaimsForClaimFamilyAsync = vi.fn();

vi.mock("./affected-client-claims-resolver", () => ({
  findAffectedClientClaimsForClaimFamilyAsync: (...args: unknown[]) =>
    mockFindAffectedClientClaimsForClaimFamilyAsync(...args),
}));

import { DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS } from "./client-claim-mapper";
import type { EvidenceAlertCandidate } from "./evidence-alert-store";
import {
  buildReviewHandoffItem,
  buildReviewItemsForEvidenceAlert,
  buildReviewItemsForEvidenceAlertAsync,
  buildReviewItemsFromAlertCandidate,
  buildScheduledRunnerSafeHandoffSummary,
  isReviewHandoffEnabled,
  scheduledRunnerPayloadExcludesPrivateClaimText,
} from "./evidence-review-handoff";

const alertCandidate: EvidenceAlertCandidate = {
  watchlist_item_id: "watch-magnesium-cortisol",
  claim_family: "magnesium_cortisol_stress",
  source: "pubmed",
  external_id: "99988877",
  external_id_type: "pmid",
  alert_type: "human_review",
  severity: "medium",
  summary: "New material evidence for magnesium cortisol stress claim family.",
  raw_payload: {
    signal: "human_review_required",
    severity: "medium",
    human_review_required: true,
    client_claim_re_review_required: true,
    signal_classification: {
      signal: "human_review_required",
      severity: "medium",
      human_review_required: true,
      client_claim_re_review_required: true,
      reason_codes: ["material_delta"],
    },
  },
};

describe("evidence-review-handoff", () => {
  it("builds a review handoff item for an evidence alert and affected claim", () => {
    const result = buildReviewItemsForEvidenceAlert({
      evidence_alert_id: "alert-uuid-1",
      watch_run_id: "run-uuid-1",
      claim_family_id: "magnesium_cortisol_stress",
      external_id: "99988877",
      raw_payload: alertCandidate.raw_payload,
    });

    expect(result.affected_claim_count).toBe(1);
    expect(result.items[0]).toMatchObject({
      evidence_alert_id: "alert-uuid-1",
      watch_run_id: "run-uuid-1",
      workspace_id: DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS.workspace_id,
      client_claim_id: DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS.id,
      claim_family_id: "magnesium_cortisol_stress",
      signal: "human_review_required",
      severity: "medium",
      human_review_required: true,
      client_claim_re_review_required: true,
      status: "open",
    });
  });

  it("builds review items asynchronously using durable mapping resolution", async () => {
    mockFindAffectedClientClaimsForClaimFamilyAsync.mockResolvedValueOnce([
      {
        ...DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS,
        id: "durable-claim-001",
      },
    ]);

    const result = await buildReviewItemsForEvidenceAlertAsync({
      evidence_alert_id: "alert-uuid-async",
      watch_run_id: "run-uuid-async",
      claim_family_id: "magnesium_cortisol_stress",
      external_id: "99988877",
      raw_payload: alertCandidate.raw_payload,
    });

    expect(result.affected_claim_count).toBe(1);
    expect(result.items[0].client_claim_id).toBe("durable-claim-001");
  });

  it("returns no review items for unknown claim families", () => {
    const result = buildReviewItemsForEvidenceAlert({
      evidence_alert_id: "alert-uuid-2",
      watch_run_id: null,
      claim_family_id: "unknown_claim_family",
      raw_payload: alertCandidate.raw_payload,
    });

    expect(result.affected_claim_count).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("carries signal classification fields from alert candidates", () => {
    const result = buildReviewItemsFromAlertCandidate({
      candidate: alertCandidate,
      evidence_alert_id: "alert-uuid-3",
      watch_run_id: "run-uuid-3",
    });

    expect(result.items[0]).toMatchObject({
      signal: "human_review_required",
      severity: "medium",
      human_review_required: true,
      client_claim_re_review_required: true,
    });
  });

  it("defaults review handoffs to disabled unless explicitly enabled", () => {
    expect(isReviewHandoffEnabled()).toBe(false);
  });

  it("respects the privacy boundary for scheduled runner safe summaries", () => {
    const item = buildReviewHandoffItem(
      {
        evidence_alert_id: "alert-uuid-4",
        watch_run_id: null,
        claim_family_id: "magnesium_cortisol_stress",
        external_id: "12345",
        raw_payload: alertCandidate.raw_payload,
      },
      DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS
    );

    const safeSummary = buildScheduledRunnerSafeHandoffSummary(item);

    expect(safeSummary).not.toHaveProperty("claim_text");
    expect(scheduledRunnerPayloadExcludesPrivateClaimText(safeSummary)).toBe(true);
    expect(JSON.stringify(safeSummary).toLowerCase()).not.toContain(
      "magnesium therapy helps reduce cortisol"
    );
  });

  it("does not embed private claim text in scheduled runner style payloads", () => {
    const scheduledRunnerPayload = {
      phase: "17",
      results: [
        {
          claim_family: "magnesium_cortisol_stress",
          evidence_change_alert: { alert_required: true },
          new_evidence_candidates: [
            {
              external_id: "12345",
              raw_payload: alertCandidate.raw_payload,
            },
          ],
        },
      ],
    };

    expect(scheduledRunnerPayloadExcludesPrivateClaimText(scheduledRunnerPayload)).toBe(
      true
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClaimExtractionById = vi.fn();

vi.mock("@/lib/watch/claim-extraction-store", () => ({
  getClaimExtractionById: (...args: unknown[]) => mockGetClaimExtractionById(...args),
  isClaimExtractionPersistenceConfigured: () => true,
}));

import { buildClaimsExtractionReviewPageData } from "@/lib/review/claims-extraction-review-page";

const operatorAccess = {
  authorized: true as const,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const candidateClaim = {
  candidate_claim_id: "candidate-001",
  workspace_id: "demo-workspace-spa-menu",
  source_document_id: "doc-001",
  extraction_run_id: "run-001",
  claim_text: "supports deep sleep",
  normalized_claim_text: "supports deep sleep",
  source_excerpt: "support deep sleep",
  source_location: "line 1",
  claim_type: "sleep",
  claim_family: "sleep_support",
  subject: "Magnesium Calm Ritual",
  predicate: "supports sleep",
  object: "sleep",
  claim_strength: "moderate",
  evidence_sensitivity: "medium",
  is_direct_claim: true,
  needs_research: true,
  status: "candidate",
  created_at: "2026-06-23T10:00:00.000Z",
  updated_at: "2026-06-23T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetClaimExtractionById.mockResolvedValue({
    extraction: {
      extraction_id: "run-001",
      workspace_id: "demo-workspace-spa-menu",
      source_document_id: "doc-001",
      extractor_type: "rule_based_v1",
      status: "completed",
      candidate_claim_count: 1,
      error_message: null,
      created_at: "2026-06-23T10:00:00.000Z",
      updated_at: "2026-06-23T10:00:00.000Z",
    },
    source_document: {
      source_document_id: "doc-001",
      workspace_id: "demo-workspace-spa-menu",
      title: "Magnesium Calm Ritual",
      source_type: "spa_menu",
      source_text: "Magnesium Calm Ritual: support deep sleep.",
      source_url: null,
      created_at: "2026-06-23T10:00:00.000Z",
      updated_at: "2026-06-23T10:00:00.000Z",
    },
    candidate_claims: [candidateClaim],
  });
});

describe("claims extraction review page data builder", () => {
  it("loads extraction summary and candidate claims for review", async () => {
    const pageData = await buildClaimsExtractionReviewPageData("run-001", operatorAccess);

    expect(pageData.configured).toBe(true);
    expect(pageData.extractionId).toBe("run-001");
    expect(pageData.sourceTitle).toBe("Magnesium Calm Ritual");
    expect(pageData.sourceType).toBe("spa_menu");
    expect(pageData.extractionStatus).toBe("completed");
    expect(pageData.candidateCount).toBe(1);
    expect(pageData.candidateClaims).toEqual([candidateClaim]);
    expect(pageData.detailError).toBeNull();
  });

  it("surfaces accepted and rejected candidate statuses", async () => {
    mockGetClaimExtractionById.mockResolvedValue({
      extraction: {
        extraction_id: "run-001",
        status: "completed",
        candidate_claim_count: 2,
      },
      source_document: {
        title: "Magnesium Calm Ritual",
        source_type: "spa_menu",
        source_text: "source",
      },
      candidate_claims: [
        { ...candidateClaim, status: "accepted" },
        { ...candidateClaim, candidate_claim_id: "candidate-002", status: "rejected" },
      ],
    });

    const pageData = await buildClaimsExtractionReviewPageData("run-001", operatorAccess);

    expect(pageData.candidateClaims.map((claim) => claim.status)).toEqual([
      "accepted",
      "rejected",
    ]);
  });
});

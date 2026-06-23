import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetWellnessClaimById = vi.fn();
const mockListClaimResearchRuns = vi.fn();
const mockGetClaimResearchRunById = vi.fn();
const mockIsWellnessClaimsPersistenceConfigured = vi.fn();
const mockIsClaimResearchPersistenceConfigured = vi.fn();

vi.mock("@/lib/watch/wellness-claims-store", () => ({
  getWellnessClaimById: (...args: unknown[]) => mockGetWellnessClaimById(...args),
  isWellnessClaimsPersistenceConfigured: (...args: unknown[]) =>
    mockIsWellnessClaimsPersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/claim-research-store", () => ({
  listClaimResearchRuns: (...args: unknown[]) => mockListClaimResearchRuns(...args),
  getClaimResearchRunById: (...args: unknown[]) => mockGetClaimResearchRunById(...args),
  isClaimResearchPersistenceConfigured: (...args: unknown[]) =>
    mockIsClaimResearchPersistenceConfigured(...args),
}));

import { buildClaimDetailPageData } from "@/lib/review/claims-detail-page";

const operatorAccess = {
  authorized: true as const,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const registeredClaim = {
  claim_id: "claim-001",
  workspace_id: "demo-workspace-spa-menu",
  source_document_id: "doc-001",
  source_candidate_claim_id: "candidate-001",
  claim_text: "supports deep sleep",
  normalized_claim_text: "supports deep sleep",
  claim_type: "sleep",
  claim_family: "sleep_support",
  subject: "Magnesium Calm Ritual",
  predicate: "supports sleep",
  object: "sleep",
  claim_strength: "moderate",
  evidence_sensitivity: "medium",
  source_excerpt: "support deep sleep",
  source_location: "line 1",
  status: "active",
  review_status: "accepted",
  research_status: "completed",
  created_at: "2026-06-23T10:05:00.000Z",
  updated_at: "2026-06-23T11:00:00.000Z",
};

const researchRun = {
  research_run_id: "run-001",
  claim_id: "claim-001",
  workspace_id: "demo-workspace-spa-menu",
  status: "completed",
  research_mode: "mock_evidence_v1",
  query_text: "Magnesium Calm Ritual magnesium sleep quality",
  evidence_posture: "mixed",
  evidence_strength: "low",
  risk_level: "medium",
  risk_score: 55,
  summary:
    "Magnesium may have some evidence related to sleep quality in certain populations, but broad spa-treatment claims should be worded cautiously.",
  safer_wording: "May support relaxation and healthy sleep routines.",
  research_notes: "Controlled demo research mode (mock_evidence_v1). Not live PubMed retrieval.",
  citation_count: 2,
  error_message: null,
  created_at: "2026-06-23T11:00:00.000Z",
  updated_at: "2026-06-23T11:00:00.000Z",
  citations: [],
};

beforeEach(() => {
  mockIsWellnessClaimsPersistenceConfigured.mockReturnValue(true);
  mockIsClaimResearchPersistenceConfigured.mockReturnValue(true);
  mockGetWellnessClaimById.mockResolvedValue({ claim: registeredClaim });
  mockListClaimResearchRuns.mockResolvedValue({ runs: [researchRun] });
  mockGetClaimResearchRunById.mockResolvedValue({
    run: { ...researchRun, citations: [{ citation_id: "citation-001", title: "Demo citation" }] },
  });
});

describe("claims detail page", () => {
  it("loads claim detail with latest research run", async () => {
    const pageData = await buildClaimDetailPageData("claim-001", operatorAccess);

    expect(pageData.claim?.claim_text).toBe("supports deep sleep");
    expect(pageData.latestResearchRun?.evidence_posture).toBe("mixed");
    expect(pageData.researchRuns).toHaveLength(1);
    expect(pageData.detailError).toBeNull();
  });

  it("returns not found message for missing claim", async () => {
    mockGetWellnessClaimById.mockResolvedValue({ claim: null });

    const pageData = await buildClaimDetailPageData("missing-claim", operatorAccess);

    expect(pageData.claim).toBeNull();
    expect(pageData.detailErrorMessage).toBe("Claim not found.");
  });
});

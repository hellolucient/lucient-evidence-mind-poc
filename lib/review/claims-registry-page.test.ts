import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListWellnessClaims = vi.fn();

vi.mock("@/lib/watch/wellness-claims-store", () => ({
  listWellnessClaims: (...args: unknown[]) => mockListWellnessClaims(...args),
  isWellnessClaimsPersistenceConfigured: () => true,
}));

import { buildClaimsRegistryPageData } from "@/lib/review/claims-registry-page";

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
  research_status: "not_started",
  created_at: "2026-06-23T10:05:00.000Z",
  updated_at: "2026-06-23T10:05:00.000Z",
  extraction_run_id: "run-001",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListWellnessClaims.mockResolvedValue({ claims: [registeredClaim] });
});

describe("claims registry page data builder", () => {
  it("loads registered claims for default workspace", async () => {
    const pageData = await buildClaimsRegistryPageData({}, operatorAccess);

    expect(pageData.configured).toBe(true);
    expect(pageData.defaultWorkspaceId).toBe("demo-workspace-spa-menu");
    expect(pageData.claims).toEqual([registeredClaim]);
    expect(pageData.listError).toBeNull();
  });

  it("returns empty claims list when none registered", async () => {
    mockListWellnessClaims.mockResolvedValue({ claims: [] });

    const pageData = await buildClaimsRegistryPageData({}, operatorAccess);

    expect(pageData.claims).toEqual([]);
    expect(pageData.listErrorMessage).toBeNull();
  });
});

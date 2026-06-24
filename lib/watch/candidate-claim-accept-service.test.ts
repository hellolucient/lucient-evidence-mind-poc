import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

const mockGetCandidate = vi.fn();
const mockUpdateCandidate = vi.fn();
const mockCreateClientClaim = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/lib/watch/candidate-claims-store", () => ({
  getCandidateClaimById: (...args: unknown[]) => mockGetCandidate(...args),
  updateCandidateClaim: (...args: unknown[]) => mockUpdateCandidate(...args),
}));

vi.mock("@/lib/watch/client-claims-store", () => ({
  createClientClaim: (...args: unknown[]) => mockCreateClientClaim(...args),
}));

vi.mock("@/lib/watch/mind-claim-intelligence-audit-store", () => ({
  recordMindClaimIntelligenceAuditEvent: (...args: unknown[]) => mockAudit(...args),
}));

import { acceptCandidateClaimToClientRegistry } from "@/lib/watch/candidate-claim-accept-service";

const access: ReviewQueueAccessContext = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("acceptCandidateClaimToClientRegistry", () => {
  it("creates durable client_claims on accept", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: {
        candidate_claim_id: "cand-1",
        workspace_id: "demo-workspace-spa-menu",
        claim_text: "deeply relaxing treatment",
        claim_family: "spa_relaxation",
        risk_level: "low",
        operator_edited_claim_text: null,
        review_status: "pending",
      },
    });

    mockCreateClientClaim.mockResolvedValue({
      ok: true,
      claim: {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "deeply-relaxing-treatment-cand-1",
        claim_text: "deeply relaxing treatment",
        status: "active",
      },
    });

    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { candidate_claim_id: "cand-1", review_status: "accepted" },
    });

    const result = await acceptCandidateClaimToClientRegistry("cand-1", access);

    expect(result.ok).toBe(true);
    expect(mockCreateClientClaim).toHaveBeenCalledTimes(1);
    expect(mockUpdateCandidate).toHaveBeenCalledWith(
      "cand-1",
      access,
      expect.objectContaining({ review_status: "accepted" })
    );
  });
});

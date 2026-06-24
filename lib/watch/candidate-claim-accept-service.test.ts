import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

const mockGetCandidate = vi.fn();
const mockUpdateCandidate = vi.fn();
const mockCreateClientClaim = vi.fn();
const mockGetClientClaim = vi.fn();
const mockUpdateClientClaimStatus = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/lib/watch/candidate-claims-store", () => ({
  getCandidateClaimById: (...args: unknown[]) => mockGetCandidate(...args),
  updateCandidateClaim: (...args: unknown[]) => mockUpdateCandidate(...args),
}));

vi.mock("@/lib/watch/client-claims-store", () => ({
  createClientClaim: (...args: unknown[]) => mockCreateClientClaim(...args),
  getClientClaimByClientClaimId: (...args: unknown[]) => mockGetClientClaim(...args),
  updateClientClaimStatus: (...args: unknown[]) => mockUpdateClientClaimStatus(...args),
}));

vi.mock("@/lib/watch/mind-claim-intelligence-audit-store", () => ({
  recordMindClaimIntelligenceAuditEvent: (...args: unknown[]) => mockAudit(...args),
}));

import {
  acceptCandidateClaimToClientRegistry,
  CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS,
  rejectCandidateClaimReview,
  undoCandidateClaimReviewDecision,
} from "@/lib/watch/candidate-claim-accept-service";

const access: ReviewQueueAccessContext = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
};

const pendingCandidate = {
  candidate_claim_id: "cand-12345678",
  workspace_id: "demo-workspace-spa-menu",
  claim_text: "deeply relaxing treatment",
  claim_family: "spa_relaxation",
  risk_level: "low",
  operator_edited_claim_text: null,
  review_status: "pending",
};

const activeClientClaim = {
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "deeply-relaxing-treatment-cand-123",
  claim_text: "deeply relaxing treatment",
  claim_source_type: "marketing_copy",
  claim_source_label: "Mind candidate claim acceptance",
  source_url: null,
  claim_family: "spa_relaxation",
  risk_level: "low",
  status: "active",
  created_at: "2026-06-24T00:00:00.000Z",
  updated_at: "2026-06-24T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("candidate claim review lifecycle", () => {
  it("pending candidate can be accepted", async () => {
    mockGetCandidate.mockResolvedValue({ claim: pendingCandidate });
    mockCreateClientClaim.mockResolvedValue({ ok: true, claim: activeClientClaim });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "accepted" },
    });

    const result = await acceptCandidateClaimToClientRegistry("cand-12345678", access);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotent).toBe(false);
    }
    expect(mockCreateClientClaim).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "accepted" }),
      access
    );
  });

  it("pending candidate can be rejected", async () => {
    mockGetCandidate.mockResolvedValue({ claim: pendingCandidate });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "rejected" },
    });

    const result = await rejectCandidateClaimReview("cand-12345678", access);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotent).toBe(false);
    }
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "rejected" }),
      access
    );
  });

  it("accepted candidate cannot be directly rejected", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "accepted" },
    });

    const result = await rejectCandidateClaimReview("cand-12345678", access);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("undo_acceptance_required");
    }
    expect(mockUpdateCandidate).not.toHaveBeenCalled();
  });

  it("rejected candidate cannot be directly accepted", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "rejected" },
    });

    const result = await acceptCandidateClaimToClientRegistry("cand-12345678", access);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("undo_required");
    }
    expect(mockCreateClientClaim).not.toHaveBeenCalled();
  });

  it("accepted candidate undo returns candidate to pending", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "accepted" },
    });
    mockGetClientClaim.mockResolvedValue({ claim: activeClientClaim });
    mockUpdateClientClaimStatus.mockResolvedValue({
      ok: true,
      claim: { ...activeClientClaim, status: CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS },
    });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "pending" },
    });

    const result = await undoCandidateClaimReviewDecision("cand-12345678", access);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.undo_type).toBe("acceptance_undone");
      expect(result.candidate_claim.review_status).toBe("pending");
    }
    expect(mockUpdateCandidate).toHaveBeenCalledWith(
      "cand-12345678",
      access,
      expect.objectContaining({ review_status: "pending" })
    );
  });

  it("accepted candidate undo sets linked client_claims row to withdrawn, not active", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "accepted" },
    });
    mockGetClientClaim.mockResolvedValue({ claim: activeClientClaim });
    mockUpdateClientClaimStatus.mockResolvedValue({
      ok: true,
      claim: { ...activeClientClaim, status: CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS },
    });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "pending" },
    });

    await undoCandidateClaimReviewDecision("cand-12345678", access);

    expect(mockUpdateClientClaimStatus).toHaveBeenCalledWith(
      "demo-workspace-spa-menu",
      "deeply-relaxing-treatment-cand-123",
      CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS,
      access
    );
    expect(CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS).not.toBe("active");
  });

  it("rejected candidate undo returns candidate to pending", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "rejected" },
    });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "pending" },
    });

    const result = await undoCandidateClaimReviewDecision("cand-12345678", access);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.undo_type).toBe("rejection_undone");
      expect(result.client_claim_status_updated).toBe(false);
    }
    expect(mockUpdateClientClaimStatus).not.toHaveBeenCalled();
  });

  it("undo pending candidate returns safe conflict", async () => {
    mockGetCandidate.mockResolvedValue({ claim: pendingCandidate });

    const result = await undoCandidateClaimReviewDecision("cand-12345678", access);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("nothing_to_undo");
    }
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("accepting the same candidate twice does not create duplicate active client_claims", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "accepted" },
    });
    mockGetClientClaim.mockResolvedValue({ claim: activeClientClaim });

    const result = await acceptCandidateClaimToClientRegistry("cand-12345678", access);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotent).toBe(true);
    }
    expect(mockCreateClientClaim).not.toHaveBeenCalled();
  });

  it("writes acceptance_undone audit event", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "accepted" },
    });
    mockGetClientClaim.mockResolvedValue({ claim: activeClientClaim });
    mockUpdateClientClaimStatus.mockResolvedValue({
      ok: true,
      claim: { ...activeClientClaim, status: CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS },
    });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "pending" },
    });

    await undoCandidateClaimReviewDecision("cand-12345678", access);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "acceptance_undone",
        event_summary: "Candidate acceptance undone; registered claim was withdrawn.",
        metadata: {
          previous_review_status: "accepted",
          new_review_status: "pending",
          client_claim_status_updated: true,
        },
      }),
      access
    );
  });

  it("writes rejection_undone audit event", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "rejected" },
    });
    mockUpdateCandidate.mockResolvedValue({
      ok: true,
      claim: { ...pendingCandidate, review_status: "pending" },
    });

    await undoCandidateClaimReviewDecision("cand-12345678", access);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "rejection_undone",
        event_summary: "Candidate rejection undone; candidate returned to pending review.",
        metadata: {
          previous_review_status: "rejected",
          new_review_status: "pending",
        },
      }),
      access
    );
  });

  it("rejecting the same candidate twice is idempotent", async () => {
    mockGetCandidate.mockResolvedValue({
      claim: { ...pendingCandidate, review_status: "rejected" },
    });

    const result = await rejectCandidateClaimReview("cand-12345678", access);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotent).toBe(true);
    }
    expect(mockUpdateCandidate).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

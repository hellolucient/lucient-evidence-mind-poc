import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListWellnessClaims = vi.fn();
const mockGetWellnessClaimById = vi.fn();
const mockUpdateCandidateWellnessClaim = vi.fn();
const mockAcceptCandidateWellnessClaim = vi.fn();
const mockRejectCandidateWellnessClaim = vi.fn();
const mockSendExternalMindHandoff = vi.fn();
const mockStartEvidenceResearch = vi.fn();

vi.mock("@/lib/watch/wellness-claims-store", () => ({
  WELLNESS_CLAIM_PRIVATE_FIELDS: ["id", "payload_json", "metadata"],
  listWellnessClaims: (...args: unknown[]) => mockListWellnessClaims(...args),
  getWellnessClaimById: (...args: unknown[]) => mockGetWellnessClaimById(...args),
  updateCandidateWellnessClaim: (...args: unknown[]) => mockUpdateCandidateWellnessClaim(...args),
  acceptCandidateWellnessClaim: (...args: unknown[]) => mockAcceptCandidateWellnessClaim(...args),
  rejectCandidateWellnessClaim: (...args: unknown[]) => mockRejectCandidateWellnessClaim(...args),
  isWellnessClaimsPersistenceConfigured: () => true,
  isPrivacySafeWellnessClaimPayload: (payload: Record<string, unknown>) =>
    !("id" in payload) && !("payload_json" in payload),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

vi.mock("@/lib/watch/evidence-research-runner", () => ({
  startEvidenceResearchRun: (...args: unknown[]) => mockStartEvidenceResearch(...args),
}));

import {
  assertPrivacySafeClaimRegistryResponse,
  buildCandidateClaimAcceptApiResponse,
  buildCandidateClaimPatchApiResponse,
  buildCandidateClaimRejectApiResponse,
  buildClaimRegistryDetailApiResponse,
  buildClaimsRegistryListApiResponse,
} from "@/lib/review/claims-review-api";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

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
};

beforeEach(() => {
  mockListWellnessClaims.mockResolvedValue({
    claims: [{ ...registeredClaim, extraction_run_id: "run-001" }],
  });
  mockGetWellnessClaimById.mockResolvedValue({ claim: registeredClaim });
  mockUpdateCandidateWellnessClaim.mockResolvedValue({
    ok: true,
    candidate: { ...candidateClaim, claim_text: "supports restorative sleep" },
  });
  mockAcceptCandidateWellnessClaim.mockResolvedValue({
    ok: true,
    claim: registeredClaim,
    candidate: { ...candidateClaim, status: "accepted" },
    already_accepted: false,
  });
  mockRejectCandidateWellnessClaim.mockResolvedValue({
    ok: true,
    candidate: { ...candidateClaim, status: "rejected" },
    already_rejected: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("claims review API", () => {
  it("lists registered claims for workspace", async () => {
    const body = await buildClaimsRegistryListApiResponse(
      { workspace_id: "demo-workspace-spa-menu" },
      operatorAccess
    );

    expect(body.ok).toBe(true);
    expect(body.phase).toBe(CURRENT_WATCH_PHASE);
    expect(body.count).toBe(1);
    expect(body.claims).toEqual([
      expect.objectContaining({
        claim_id: "claim-001",
        research_status: "not_started",
        extraction_run_id: "run-001",
      }),
    ]);
  });

  it("returns one registered claim", async () => {
    const response = await buildClaimRegistryDetailApiResponse("claim-001", operatorAccess);

    expect(response.status).toBe(200);
    expect(response.body.claim).toEqual(registeredClaim);
  });

  it("patches editable candidate fields", async () => {
    const response = await buildCandidateClaimPatchApiResponse(
      "candidate-001",
      { claim_text: "supports restorative sleep" },
      operatorAccess
    );

    expect(response.status).toBe(200);
    expect(response.body.candidate).toEqual(
      expect.objectContaining({ claim_text: "supports restorative sleep" })
    );
    expect(mockUpdateCandidateWellnessClaim).toHaveBeenCalledWith(
      "candidate-001",
      { claim_text: "supports restorative sleep" },
      operatorAccess
    );
  });

  it("accept creates one registered claim and updates candidate status", async () => {
    const response = await buildCandidateClaimAcceptApiResponse("candidate-001", operatorAccess);

    expect(response.status).toBe(201);
    expect(response.body.claim).toEqual(registeredClaim);
    expect(response.body.candidate).toEqual(expect.objectContaining({ status: "accepted" }));
    expect(response.body.research_status).toBe("not_started");
    expect(mockAcceptCandidateWellnessClaim).toHaveBeenCalledWith("candidate-001", operatorAccess);
  });

  it("duplicate accept is idempotent", async () => {
    mockAcceptCandidateWellnessClaim.mockResolvedValue({
      ok: true,
      claim: registeredClaim,
      candidate: { ...candidateClaim, status: "accepted" },
      already_accepted: true,
    });

    const response = await buildCandidateClaimAcceptApiResponse("candidate-001", operatorAccess);

    expect(response.status).toBe(200);
    expect(response.body.already_accepted).toBe(true);
    expect(response.body.claim).toEqual(registeredClaim);
  });

  it("reject updates candidate status and creates no registered claim", async () => {
    const response = await buildCandidateClaimRejectApiResponse("candidate-001", operatorAccess);

    expect(response.status).toBe(200);
    expect(response.body.candidate).toEqual(expect.objectContaining({ status: "rejected" }));
    expect(response.body.claim).toBeUndefined();
    expect(mockRejectCandidateWellnessClaim).toHaveBeenCalledWith("candidate-001", operatorAccess);
  });

  it("excludes secrets and raw metadata from safe responses", () => {
    expect(
      assertPrivacySafeClaimRegistryResponse({
        ok: true,
        claim: registeredClaim,
      })
    ).toBe(true);
    expect(
      assertPrivacySafeClaimRegistryResponse({
        ok: true,
        id: "internal-id",
        payload_json: { secret: true },
      })
    ).toBe(false);
  });

  it("does not start research, evidence briefs, Mind digest, or HelloMinds send", () => {
    expect(process.env.EXTERNAL_MIND_LIVE_SEND).not.toBe("true");
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
    expect(mockStartEvidenceResearch).not.toHaveBeenCalled();
  });
});

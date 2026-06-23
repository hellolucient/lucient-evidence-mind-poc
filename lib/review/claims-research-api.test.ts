import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRunControlledClaimResearchForClaim = vi.fn();
const mockListClaimResearchRuns = vi.fn();
const mockGetClaimResearchRunById = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/watch/claim-research-store", () => ({
  CLAIM_RESEARCH_PRIVATE_FIELDS: ["id", "payload_json", "metadata"],
  isClaimResearchPersistenceConfigured: () => true,
  isPrivacySafeClaimResearchPayload: (payload: Record<string, unknown>) =>
    !("id" in payload) && !("payload_json" in payload),
  runControlledClaimResearchForClaim: (...args: unknown[]) =>
    mockRunControlledClaimResearchForClaim(...args),
  listClaimResearchRuns: (...args: unknown[]) => mockListClaimResearchRuns(...args),
  getClaimResearchRunById: (...args: unknown[]) => mockGetClaimResearchRunById(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import {
  assertPrivacySafeClaimResearchResponse,
  buildClaimResearchPostApiResponse,
  buildClaimResearchRunDetailApiResponse,
  buildClaimResearchRunsListApiResponse,
} from "@/lib/review/claims-research-api";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

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
  citations: [
    {
      citation_id: "citation-001",
      title: "Magnesium supplementation and sleep quality: a narrative review (demo placeholder)",
      source: "Demo literature summary",
      url: null,
      publication_year: 2021,
      evidence_type: "review",
      relevance: "medium",
      summary: "Reviews suggest magnesium may support sleep in some adults.",
      created_at: "2026-06-23T11:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  mockRunControlledClaimResearchForClaim.mockResolvedValue({
    ok: true,
    claim: registeredClaim,
    run: researchRun,
  });
  mockListClaimResearchRuns.mockResolvedValue({ runs: [researchRun] });
  mockGetClaimResearchRunById.mockResolvedValue({ run: researchRun });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("claims research API", () => {
  it("rejects missing claim", async () => {
    mockRunControlledClaimResearchForClaim.mockResolvedValue({
      ok: false,
      error: "claim_not_found",
    });

    const response = await buildClaimResearchPostApiResponse("missing-claim", operatorAccess);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("claim_not_found");
  });

  it("rejects non-research-eligible claim", async () => {
    mockRunControlledClaimResearchForClaim.mockResolvedValue({
      ok: false,
      error: "claim_not_research_eligible",
    });

    const response = await buildClaimResearchPostApiResponse("claim-001", operatorAccess);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("claim_not_research_eligible");
  });

  it("creates one research run with safe summarized result", async () => {
    const response = await buildClaimResearchPostApiResponse("claim-001", operatorAccess);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.phase).toBe(CURRENT_WATCH_PHASE);
    expect(response.body.controlled_mode).toBe(true);
    expect(response.body.research_run).toEqual(
      expect.objectContaining({
        research_mode: "mock_evidence_v1",
        evidence_posture: "mixed",
        evidence_strength: "low",
        risk_level: "medium",
        safer_wording: "May support relaxation and healthy sleep routines.",
      })
    );
    expect(response.body.claim).toEqual(
      expect.objectContaining({ research_status: "completed" })
    );
    expect(mockRunControlledClaimResearchForClaim).toHaveBeenCalledWith("claim-001", operatorAccess);
  });

  it("lists research runs for a claim", async () => {
    const response = await buildClaimResearchRunsListApiResponse("claim-001", operatorAccess);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.research_runs).toEqual([researchRun]);
  });

  it("returns one research run detail with citations", async () => {
    const response = await buildClaimResearchRunDetailApiResponse(
      "claim-001",
      "run-001",
      operatorAccess
    );

    expect(response.status).toBe(200);
    expect(response.body.research_run).toEqual(researchRun);
    expect(response.body.research_run).toEqual(
      expect.objectContaining({
        citations: expect.arrayContaining([
          expect.objectContaining({ citation_id: "citation-001" }),
        ]),
      })
    );
  });

  it("excludes secrets and raw private fields", () => {
    expect(
      assertPrivacySafeClaimResearchResponse({
        ok: true,
        research_run: researchRun,
      })
    ).toBe(true);
    expect(
      assertPrivacySafeClaimResearchResponse({
        ok: true,
        id: "internal-id",
        payload_json: { secret: true },
      })
    ).toBe(false);
  });

  it("does not call HelloMinds send or require EXTERNAL_MIND_LIVE_SEND", () => {
    expect(process.env.EXTERNAL_MIND_LIVE_SEND).not.toBe("true");
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetWellnessClaimById = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: mockMaybeSingle,
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  WELLNESS_CLAIMS_TABLE: "wellness_claims",
  CLAIM_RESEARCH_RUNS_TABLE: "claim_research_runs",
  CLAIM_RESEARCH_CITATIONS_TABLE: "claim_research_citations",
}));

vi.mock("@/lib/watch/wellness-claims-store", () => ({
  getWellnessClaimById: (...args: unknown[]) => mockGetWellnessClaimById(...args),
}));

import {
  isPrivacySafeClaimResearchPayload,
  runControlledClaimResearchForClaim,
  toPrivacySafeClaimResearchRun,
} from "@/lib/watch/claim-research-store";

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
};

const researchRunRow = {
  id: "run-001",
  workspace_id: "demo-workspace-spa-menu",
  claim_id: "claim-001",
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
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({ data: [], error: null });

  let insertCallCount = 0;
  mockInsert.mockImplementation(() => {
    insertCallCount += 1;
    return {
      select: () => {
        if (insertCallCount === 1) {
          return { single: mockSingle };
        }

        return Promise.resolve({
          data: [
            {
              id: "citation-001",
              workspace_id: "demo-workspace-spa-menu",
              claim_id: "claim-001",
              research_run_id: "run-001",
              title:
                "Magnesium supplementation and sleep quality: a narrative review (demo placeholder)",
              source: "Demo literature summary",
              url: null,
              publication_year: 2021,
              evidence_type: "review",
              relevance: "medium",
              summary: "Reviews suggest magnesium may support sleep in some adults.",
              created_at: "2026-06-23T11:00:00.000Z",
              updated_at: "2026-06-23T11:00:00.000Z",
            },
          ],
          error: null,
        });
      },
    };
  });

  mockSelect.mockReturnValue(queryBuilder);
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  mockFrom.mockImplementation((table: string) => {
    if (table === "claim_research_runs") {
      return { insert: mockInsert, select: mockSelect };
    }

    if (table === "claim_research_citations") {
      return { insert: mockInsert, select: mockSelect };
    }

    if (table === "wellness_claims") {
      return { update: mockUpdate };
    }

    return { select: mockSelect, insert: mockInsert, update: mockUpdate };
  });

  mockGetSupabaseEnvConfig.mockReturnValue({
    hasSupabaseUrl: true,
    hasSupabaseServiceRoleKey: true,
  });
  mockCreateSupabaseServerClient.mockReturnValue({ from: mockFrom });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupSupabaseMocks();
  mockGetWellnessClaimById.mockResolvedValue({ claim: registeredClaim });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("claim-research-store", () => {
  it("maps research run rows to privacy-safe shape", () => {
    const safe = toPrivacySafeClaimResearchRun(researchRunRow);
    expect(safe.research_run_id).toBe("run-001");
    expect("id" in safe).toBe(false);
    expect(isPrivacySafeClaimResearchPayload(safe as unknown as Record<string, unknown>)).toBe(
      true
    );
  });

  it("rejects missing claim", async () => {
    mockGetWellnessClaimById.mockResolvedValue({ claim: null });

    const result = await runControlledClaimResearchForClaim("missing-claim", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("claim_not_found");
    }
  });

  it("rejects non-active or non-accepted claims", async () => {
    mockGetWellnessClaimById.mockResolvedValue({
      claim: { ...registeredClaim, status: "archived" },
    });

    const result = await runControlledClaimResearchForClaim("claim-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("claim_not_research_eligible");
    }
  });

  it("creates one research run, citations, and updates research_status", async () => {
    mockSingle.mockResolvedValueOnce({ data: researchRunRow, error: null });

    mockGetWellnessClaimById
      .mockResolvedValueOnce({ claim: registeredClaim })
      .mockResolvedValueOnce({
        claim: { ...registeredClaim, research_status: "completed" },
      });

    const result = await runControlledClaimResearchForClaim("claim-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.run.research_mode).toBe("mock_evidence_v1");
      expect(result.run.evidence_posture).toBe("mixed");
      expect(result.run.citations?.length).toBe(1);
      expect(result.claim.research_status).toBe("completed");
    }

    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });
});

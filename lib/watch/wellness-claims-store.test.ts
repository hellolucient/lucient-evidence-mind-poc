import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateSelect = vi.fn();
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
  CANDIDATE_WELLNESS_CLAIMS_TABLE: "candidate_wellness_claims",
  WELLNESS_CLAIMS_TABLE: "wellness_claims",
}));

import {
  acceptCandidateWellnessClaim,
  isPrivacySafeWellnessClaimPayload,
  rejectCandidateWellnessClaim,
  toPrivacySafeWellnessClaim,
} from "@/lib/watch/wellness-claims-store";

const operatorAccess = {
  authorized: true as const,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const candidateRow = {
  id: "candidate-001",
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

const wellnessClaimRow = {
  id: "claim-001",
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

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({ data: [], error: null });

  mockInsertSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockInsertSelect });
  mockUpdateSelect.mockReturnValue({ single: mockSingle });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ select: mockUpdateSelect }) });
  mockSelect.mockReturnValue(queryBuilder);

  mockFrom.mockImplementation((table: string) => {
    if (table === "candidate_wellness_claims") {
      return {
        select: mockSelect,
        update: mockUpdate,
      };
    }

    if (table === "wellness_claims") {
      return {
        select: mockSelect,
        insert: mockInsert,
      };
    }

    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    };
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
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("wellness-claims-store", () => {
  it("maps rows to privacy-safe registered claims", () => {
    const safe = toPrivacySafeWellnessClaim(wellnessClaimRow);

    expect(safe.claim_id).toBe("claim-001");
    expect(safe.research_status).toBe("not_started");
    expect("id" in safe).toBe(false);
    expect(isPrivacySafeWellnessClaimPayload(safe as unknown as Record<string, unknown>)).toBe(
      true
    );
  });

  it("accept creates one registered claim with not_started research status", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: candidateRow, error: null });
    mockSingle
      .mockResolvedValueOnce({ data: wellnessClaimRow, error: null })
      .mockResolvedValueOnce({
        data: { ...candidateRow, status: "accepted" },
        error: null,
      });

    const result = await acceptCandidateWellnessClaim("candidate-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claim.research_status).toBe("not_started");
      expect(result.candidate.status).toBe("accepted");
      expect(result.already_accepted).toBe(false);
    }

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "accepted" })
    );
  });

  it("duplicate accept returns existing registered claim", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { ...candidateRow, status: "accepted" }, error: null })
      .mockResolvedValueOnce({ data: wellnessClaimRow, error: null });

    const result = await acceptCandidateWellnessClaim("candidate-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.already_accepted).toBe(true);
      expect(result.claim.claim_id).toBe("claim-001");
    }

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("reject updates candidate status and creates no registered claim", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: candidateRow, error: null });
    mockSingle.mockResolvedValueOnce({
      data: { ...candidateRow, status: "rejected" },
      error: null,
    });

    const result = await rejectCandidateWellnessClaim("candidate-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.status).toBe("rejected");
      expect(result.already_rejected).toBe(false);
    }

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected" })
    );
  });
});

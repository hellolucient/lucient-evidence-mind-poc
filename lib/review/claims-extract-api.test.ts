import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClaimExtraction = vi.fn();
const mockListClaimExtractions = vi.fn();
const mockGetClaimExtractionById = vi.fn();
const mockExtractWellnessClaimsFromSourceText = vi.fn();
const mockExtractWellnessClaimsForAssessment = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/watch/claim-extraction-store", () => ({
  CLAIM_EXTRACTION_PRIVATE_FIELDS: ["id", "payload_json", "metadata"],
  createClaimExtraction: (...args: unknown[]) => mockCreateClaimExtraction(...args),
  listClaimExtractions: (...args: unknown[]) => mockListClaimExtractions(...args),
  getClaimExtractionById: (...args: unknown[]) => mockGetClaimExtractionById(...args),
  isClaimExtractionPersistenceConfigured: () => true,
  isPrivacySafeClaimExtractionPayload: (payload: Record<string, unknown>) =>
    !("id" in payload) && !("payload_json" in payload),
}));

vi.mock("@/lib/review/wellness-claims-extractor", () => ({
  extractWellnessClaimsFromSourceText: (...args: unknown[]) =>
    mockExtractWellnessClaimsFromSourceText(...args),
  extractWellnessClaimsForAssessment: (...args: unknown[]) =>
    mockExtractWellnessClaimsForAssessment(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import {
  assertPrivacySafeClaimExtractionResponse,
  buildClaimsExtractApiResponse,
  buildClaimsExtractionDetailApiResponse,
  buildClaimsExtractionsListApiResponse,
} from "@/lib/review/claims-extract-api";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const operatorAccess = {
  authorized: true as const,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const sourceDocument = {
  source_document_id: "doc-001",
  workspace_id: "demo-workspace-spa-menu",
  title: "Magnesium Calm Ritual",
  source_type: "spa_menu",
  source_text:
    "Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance.",
  source_url: null,
  created_at: "2026-06-23T10:00:00.000Z",
  updated_at: "2026-06-23T10:00:00.000Z",
};

const extractionRun = {
  extraction_id: "run-001",
  workspace_id: "demo-workspace-spa-menu",
  source_document_id: "doc-001",
  extractor_type: "rule_based_v1",
  status: "completed",
  candidate_claim_count: 4,
  error_message: null,
  created_at: "2026-06-23T10:00:00.000Z",
  updated_at: "2026-06-23T10:00:00.000Z",
};

const candidateClaim = {
  candidate_claim_id: "claim-001",
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
  mockExtractWellnessClaimsFromSourceText.mockReturnValue([candidateClaim]);
  mockExtractWellnessClaimsForAssessment.mockReturnValue([candidateClaim]);
  mockCreateClaimExtraction.mockResolvedValue({
    ok: true,
    source_document: sourceDocument,
    extraction_run: extractionRun,
    candidate_claims: [candidateClaim],
  });
  mockListClaimExtractions.mockResolvedValue({
    extractions: [
      {
        ...extractionRun,
        source_title: "Magnesium Calm Ritual",
        source_type: "spa_menu",
      },
    ],
  });
  mockGetClaimExtractionById.mockResolvedValue({
    extraction: extractionRun,
    source_document: sourceDocument,
    candidate_claims: [candidateClaim],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("claims extract API", () => {
  it("rejects empty source text", async () => {
    const response = await buildClaimsExtractApiResponse(
      {
        workspace_id: "demo-workspace-spa-menu",
        title: "Magnesium Calm Ritual",
        source_type: "spa_menu",
        source_text: "   ",
      },
      operatorAccess
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("source_text_required");
    expect(mockCreateClaimExtraction).not.toHaveBeenCalled();
  });

  it("creates source document, extraction run, and candidate claims", async () => {
    const response = await buildClaimsExtractApiResponse(
      {
        workspace_id: "demo-workspace-spa-menu",
        title: "Magnesium Calm Ritual",
        source_type: "spa_menu",
        source_text: sourceDocument.source_text,
      },
      operatorAccess
    );

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.phase).toBe(CURRENT_WATCH_PHASE);
    expect(mockExtractWellnessClaimsFromSourceText).toHaveBeenCalledWith(sourceDocument.source_text);
    expect(mockExtractWellnessClaimsForAssessment).not.toHaveBeenCalled();
    expect(mockCreateClaimExtraction).toHaveBeenCalled();
    expect(response.body.candidate_claims).toEqual([candidateClaim]);
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("lists extraction runs for workspace", async () => {
    const body = await buildClaimsExtractionsListApiResponse(
      { workspace_id: "demo-workspace-spa-menu" },
      operatorAccess
    );

    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(body.extractions).toEqual([
      expect.objectContaining({
        extraction_id: "run-001",
        source_title: "Magnesium Calm Ritual",
        candidate_claim_count: 4,
      }),
    ]);
  });

  it("returns extraction detail with source document and candidate claims", async () => {
    const response = await buildClaimsExtractionDetailApiResponse("run-001", operatorAccess);

    expect(response.status).toBe(200);
    expect(response.body.extraction).toEqual(extractionRun);
    expect(response.body.source_document).toEqual(sourceDocument);
    expect(response.body.candidate_claims).toEqual([candidateClaim]);
  });

  it("excludes secrets and raw metadata from safe responses", () => {
    const safe = assertPrivacySafeClaimExtractionResponse({
      ok: true,
      extraction: extractionRun,
      source_document: sourceDocument,
      candidate_claims: [candidateClaim],
    });

    expect(safe).toBe(true);
    expect(
      assertPrivacySafeClaimExtractionResponse({
        ok: true,
        id: "internal-id",
        payload_json: { secret: true },
      })
    ).toBe(false);
  });

  it("uses assessment fallback extraction when requested", async () => {
    const response = await buildClaimsExtractApiResponse(
      {
        workspace_id: "demo-workspace-spa-menu",
        title: "Guest welcome copy",
        source_type: "other",
        source_text: "Our spa welcomes guests with warm towels.",
        fallback_to_statement: true,
      },
      operatorAccess
    );

    expect(response.status).toBe(201);
    expect(mockExtractWellnessClaimsForAssessment).toHaveBeenCalledWith(
      "Our spa welcomes guests with warm towels."
    );
    expect(mockExtractWellnessClaimsFromSourceText).not.toHaveBeenCalled();
  });

  it("does not depend on EXTERNAL_MIND_LIVE_SEND", () => {
    expect(process.env.EXTERNAL_MIND_LIVE_SEND).not.toBe("true");
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});

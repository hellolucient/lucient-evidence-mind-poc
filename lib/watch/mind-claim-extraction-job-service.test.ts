import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

const mockGetJob = vi.fn();
const mockUpdateJob = vi.fn();
const mockCountCandidates = vi.fn();
const mockInsertCandidates = vi.fn();
const mockSend = vi.fn();
const mockAudit = vi.fn();
const mockFetchHistory = vi.fn();
const mockSummarizeHistory = vi.fn();

vi.mock("@/lib/watch/mind-claim-extraction-job-store", () => ({
  getMindClaimExtractionJobById: (...args: unknown[]) => mockGetJob(...args),
  updateMindClaimExtractionJob: (...args: unknown[]) => mockUpdateJob(...args),
  countCandidateClaimsForExtractionJob: (...args: unknown[]) => mockCountCandidates(...args),
  insertCandidateClaimsFromExtraction: (...args: unknown[]) => mockInsertCandidates(...args),
}));

vi.mock("@/lib/watch/mind-claim-hellominds-transport", () => ({
  sendMindClaimHelloMindsMessage: (...args: unknown[]) => mockSend(...args),
  buildMindClaimHelloMindsConversationAlias: () => "lucient-em-mce-job-1",
}));

vi.mock("@/lib/watch/external-mind-hellominds-history", () => ({
  fetchHelloMindsConversationHistory: (...args: unknown[]) => mockFetchHistory(...args),
  summarizeHelloMindsHistoryMessages: (...args: unknown[]) => mockSummarizeHistory(...args),
}));

vi.mock("@/lib/watch/source-intake-store", () => ({
  getSourceIntakeDocumentById: vi.fn(async () => ({
    document: {
      source_document_id: "doc-1",
      workspace_id: "demo-workspace-spa-menu",
      source_text: "test",
      title: "t",
      source_type: "spa_wellness_copy",
      created_by: null,
      created_at: "",
      updated_at: "",
    },
  })),
}));

vi.mock("@/lib/watch/mind-claim-intelligence-audit-store", () => ({
  recordMindClaimIntelligenceAuditEvent: (...args: unknown[]) => mockAudit(...args),
}));

import {
  fetchMindClaimExtractionJobResponse,
  loadMindClaimExtractionDemoFixtureResponse,
  parseMindClaimExtractionJobResponse,
  sendMindClaimExtractionJob,
} from "@/lib/watch/mind-claim-extraction-job-service";
import { buildMindClaimExtractionDemoFixtureResponseText } from "@/lib/watch/mind-claim-extraction-demo-fixture";

const access: ReviewQueueAccessContext = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
};

const approvedJob = {
  extraction_job_id: "job-1",
  workspace_id: "demo-workspace-spa-menu",
  source_document_id: "doc-1",
  status: "approved",
  destination: "hellominds",
  prompt_version: "mind_claim_extraction_v1",
  output_contract_version: "mind_claim_extraction_json_v1",
  review_status: "approved",
  approved_by: "operator",
  approved_at: "2026-06-24T00:00:00.000Z",
  sent_at: null,
  response_fetched_at: null,
  parsed_at: null,
  external_thread_id: null,
  external_message_id: null,
  mind_response_text: null,
  parse_error: null,
  cost_units: null,
  cost_report: null,
  created_by: null,
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  process.env.EXTERNAL_MIND_LIVE_SEND = "false";
});

describe("mind claim extraction job service safety", () => {
  it("blocks send before approval", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, review_status: "pending", status: "pending_approval" },
    });

    const result = await sendMindClaimExtractionJob("job-1", access);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("approval_required");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("performs dry-run send when EXTERNAL_MIND_LIVE_SEND=false", async () => {
    mockGetJob.mockResolvedValue({ job: { ...approvedJob, status: "approved" } });
    mockSend.mockResolvedValue({
      ok: true,
      transport_mode: "dry_run",
      conversation_alias: "lucient-em-mce-job-1",
      external_thread_id: null,
      external_message_id: null,
      dry_run_message: "Dry-run passed",
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "sent", sent_at: "2026-06-24T00:00:00.000Z" },
    });

    const result = await sendMindClaimExtractionJob("job-1", access);
    expect(result.ok).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "dry_run_send" }),
      access
    );
  });

  it("does not auto-retry failed send", async () => {
    mockGetJob.mockResolvedValue({ job: { ...approvedJob, status: "approved" } });
    mockSend.mockResolvedValue({
      ok: false,
      error: "send_disabled",
      message: "disabled",
    });
    mockUpdateJob.mockResolvedValue({ ok: true, job: approvedJob });

    await sendMindClaimExtractionJob("job-1", access);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe("mind claim extraction parse idempotency", () => {
  const validResponse = JSON.stringify({
    contract_version: "mind_claim_extraction_json_v1",
    source_summary: "s",
    claims: [
      {
        claim_id: "C1",
        claim_text: "deeply relaxing treatment",
        exact_source_phrase: "deeply relaxing treatment",
        subject: "treatment",
        predicate: "is",
        object_or_outcome: "relaxing",
        claim_family: "spa",
        claim_type: "experiential",
        evidence_sensitivity: "low",
        risk_level: "low",
        regulatory_sensitivity: "low",
        confidence: 0.9,
        reason_for_extraction: "explicit",
        suggested_review_status: "accept",
      },
    ],
    implied_claims_policy_applied: true,
    notes: "",
    cost_report: { reported_by_mind: true, summary: "ok" },
  });

  it("parse success creates candidate claims exactly once", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: validResponse,
      },
    });
    mockCountCandidates.mockResolvedValue(0);
    mockInsertCandidates.mockResolvedValue({ ok: true, count: 1 });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    const first = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(first.ok).toBe(true);
    expect(mockInsertCandidates).toHaveBeenCalledTimes(1);

    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "parsed",
        mind_response_text: validResponse,
        parsed_at: "2026-06-24T00:00:00.000Z",
      },
    });
    mockCountCandidates.mockResolvedValue(1);

    const second = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.idempotent).toBe(true);
    }
    expect(mockInsertCandidates).toHaveBeenCalledTimes(1);
  });

  it("parse failure creates no candidate claims", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: "{bad json",
      },
    });
    mockCountCandidates.mockResolvedValue(0);
    mockUpdateJob.mockResolvedValue({ ok: true, job: approvedJob });

    const result = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(result.ok).toBe(false);
    expect(mockInsertCandidates).not.toHaveBeenCalled();
  });

  it("blocks parse when mind_response_text is missing", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "sent", mind_response_text: null },
    });

    const result = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("mind_response_missing");
      expect(result.message).toBe("No Mind response text is available to parse.");
    }
  });

  it("re-parses parse_failed jobs without duplicate candidate claims", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "parse_failed",
        mind_response_text: validResponse,
        parse_error: 'claims[0].confidence expected number, received string "high"',
      },
    });
    mockCountCandidates.mockResolvedValue(0);
    mockInsertCandidates.mockResolvedValue({ ok: true, count: 1 });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z", parse_error: null },
    });

    const first = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.idempotent).toBe(false);
    }
    expect(mockInsertCandidates).toHaveBeenCalledTimes(1);

    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "parsed",
        mind_response_text: validResponse,
        parsed_at: "2026-06-24T00:00:00.000Z",
        parse_error: null,
      },
    });
    mockCountCandidates.mockResolvedValue(1);

    const second = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.idempotent).toBe(true);
    }
    expect(mockInsertCandidates).toHaveBeenCalledTimes(1);
  });
});

describe("mind claim extraction fetch with no reply yet", () => {
  it("does not set status=response_fetched when no usable Mind reply exists", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "sent", sent_at: "2026-06-24T00:00:00.000Z" },
    });
    mockFetchHistory.mockResolvedValue({ ok: true, messages: [] });
    mockSummarizeHistory.mockReturnValue({
      mind_reply_state: "no_reply_yet",
      latest_mind_reply: null,
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "waiting_for_reply", mind_response_text: null },
    });

    const result = await fetchMindClaimExtractionJobResponse("job-1", access);
    expect(result.ok).toBe(true);
    expect(mockUpdateJob).toHaveBeenCalledWith(
      "job-1",
      access,
      expect.objectContaining({
        status: "waiting_for_reply",
      })
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "no_reply_yet",
        event_summary: "HelloMinds history fetched; no Mind reply yet.",
      }),
      access
    );
  });
});

describe("no batch send or scheduled behavior", () => {
  it("send is single-job explicit operator action only", async () => {
    mockGetJob.mockResolvedValue({ job: { ...approvedJob, status: "approved" } });
    mockSend.mockResolvedValue({
      ok: true,
      transport_mode: "dry_run",
      conversation_alias: "alias",
      external_thread_id: null,
      external_message_id: null,
    });
    mockUpdateJob.mockResolvedValue({ ok: true, job: approvedJob });

    await sendMindClaimExtractionJob("job-1", access);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0]?.[0]).toMatchObject({ jobId: "job-1" });
  });
});

describe("non-live fixture response load", () => {
  const fixtureText = buildMindClaimExtractionDemoFixtureResponseText();

  it("does not call external transport", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "sent", sent_at: "2026-06-24T00:00:00.000Z" },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
        response_fetched_at: "2026-06-24T00:00:00.000Z",
      },
    });

    const result = await loadMindClaimExtractionDemoFixtureResponse("job-1", access);
    expect(result.ok).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockFetchHistory).not.toHaveBeenCalled();
  });

  it("sets status=response_fetched and writes fixture text", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "sent", sent_at: "2026-06-24T00:00:00.000Z" },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
        response_fetched_at: "2026-06-24T00:00:00.000Z",
      },
    });

    await loadMindClaimExtractionDemoFixtureResponse("job-1", access);

    expect(mockUpdateJob).toHaveBeenCalledWith(
      "job-1",
      access,
      expect.objectContaining({
        status: "response_fetched",
        mind_response_text: fixtureText,
        response_fetched_at: expect.any(String),
      })
    );
  });

  it("writes demo_fixture_response_loaded audit event", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "sent", sent_at: "2026-06-24T00:00:00.000Z" },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "response_fetched", mind_response_text: fixtureText },
    });

    await loadMindClaimExtractionDemoFixtureResponse("job-1", access);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "demo_fixture_response_loaded",
        event_summary:
          "Non-live fixture Mind extraction response loaded. No external Mind call was performed.",
        metadata: {
          response_source: "demo_fixture",
          external_call_performed: false,
          fixture_contract_version: "mind_claim_extraction_json_v1",
        },
      }),
      access
    );
  });

  it("rejects invalid job state", async () => {
    mockGetJob.mockResolvedValue({ job: { ...approvedJob, status: "approved" } });

    const result = await loadMindClaimExtractionDemoFixtureResponse("job-1", access);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_job_state");
    }
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it("blocks fixture load when job has live external identifiers", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "sent",
        external_thread_id: "live-thread",
        external_message_id: "live-message",
      },
    });

    const result = await loadMindClaimExtractionDemoFixtureResponse("job-1", access);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("fixture_blocked_live_external_ids");
    }
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it("parsing fixture creates exactly six candidate claims", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
      },
    });
    mockCountCandidates.mockResolvedValue(0);
    mockInsertCandidates.mockResolvedValue({ ok: true, count: 6 });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    const result = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate_claim_count).toBe(6);
      expect(result.idempotent).toBe(false);
    }
    expect(mockInsertCandidates).toHaveBeenCalledTimes(1);
    const insertedClaims = mockInsertCandidates.mock.calls[0]?.[0]?.claims as Array<{
      external_claim_id: string;
    }>;
    expect(insertedClaims).toHaveLength(6);
    expect(insertedClaims.map((claim) => claim.external_claim_id)).toEqual([
      "C1",
      "C2",
      "C3",
      "C4",
      "C5",
      "C6",
    ]);
  });

  it("repeated parse of fixture remains idempotent", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
      },
    });
    mockCountCandidates.mockResolvedValue(0);
    mockInsertCandidates.mockResolvedValue({ ok: true, count: 6 });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    await parseMindClaimExtractionJobResponse("job-1", access);

    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "parsed",
        mind_response_text: fixtureText,
        parsed_at: "2026-06-24T00:00:00.000Z",
      },
    });
    mockCountCandidates.mockResolvedValue(6);

    const second = await parseMindClaimExtractionJobResponse("job-1", access);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.idempotent).toBe(true);
      expect(second.candidate_claim_count).toBe(6);
    }
    expect(mockInsertCandidates).toHaveBeenCalledTimes(1);
  });
});

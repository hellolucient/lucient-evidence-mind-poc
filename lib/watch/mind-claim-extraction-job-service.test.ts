import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

const mockGetJob = vi.fn();
const mockUpdateJob = vi.fn();
const mockCountCandidates = vi.fn();
const mockInsertCandidates = vi.fn();
const mockSend = vi.fn();
const mockAudit = vi.fn();

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
  parseMindClaimExtractionJobResponse,
  sendMindClaimExtractionJob,
} from "@/lib/watch/mind-claim-extraction-job-service";

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

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

const mockGetJob = vi.fn();
const mockUpdateJob = vi.fn();
const mockGetBriefByJob = vi.fn();
const mockInsertBrief = vi.fn();
const mockSend = vi.fn();
const mockFetchHistory = vi.fn();
const mockAudit = vi.fn();
const mockGetClientClaim = vi.fn();

vi.mock("@/lib/watch/mind-claim-risk-brief-store", () => ({
  getMindClaimRiskBriefJobById: (...args: unknown[]) => mockGetJob(...args),
  updateMindClaimRiskBriefJob: (...args: unknown[]) => mockUpdateJob(...args),
  getMindClaimRiskBriefByJobId: (...args: unknown[]) => mockGetBriefByJob(...args),
  insertMindClaimRiskBrief: (...args: unknown[]) => mockInsertBrief(...args),
}));

vi.mock("@/lib/watch/candidate-claim-accept-service", () => ({
  getClientClaimUuidById: (...args: unknown[]) => mockGetClientClaim(...args),
}));

vi.mock("@/lib/watch/external-mind-hellominds-history", () => ({
  fetchHelloMindsConversationHistory: (...args: unknown[]) => mockFetchHistory(...args),
}));

vi.mock("@/lib/watch/mind-claim-hellominds-transport", () => ({
  sendMindClaimHelloMindsMessage: (...args: unknown[]) => mockSend(...args),
  buildMindClaimHelloMindsConversationAlias: () => "lucient-em-mrb-job-1",
}));

vi.mock("@/lib/watch/mind-claim-intelligence-audit-store", () => ({
  recordMindClaimIntelligenceAuditEvent: (...args: unknown[]) => mockAudit(...args),
}));

import {
  loadMindClaimRiskBriefDemoFixtureResponse,
  parseMindClaimRiskBriefJobResponse,
  sendMindClaimRiskBriefJob,
} from "@/lib/watch/mind-claim-risk-brief-job-service";
import { buildMindClaimRiskBriefDemoFixtureResponseText } from "@/lib/watch/mind-claim-risk-brief-demo-fixture";

const access: ReviewQueueAccessContext = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
};

const approvedJob = {
  risk_brief_job_id: "rb-job-1",
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "claim-uuid-1",
  status: "approved",
  destination: "hellominds",
  prompt_version: "mind_claim_risk_brief_v1",
  output_contract_version: "mind_claim_risk_brief_json_v1",
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

const validBrief = JSON.stringify({
  contract_version: "mind_claim_risk_brief_json_v1",
  claim_text: "Magnesium helps reduce stress",
  source_context: "spa",
  search_capability_statement: "PubMed",
  searches_performed: [],
  evidence_found: [],
  evidence_not_found: [],
  evidence_posture: "unclear",
  evidence_strength: "low",
  risk_level: "medium",
  regulatory_sensitivity: "medium",
  key_evidence_risk_insight: "oral magnesium evidence ≠ topical magnesium evidence ≠ branded ritual evidence",
  safer_wording: "relaxing ritual",
  operator_recommendation: "soften",
  limitations: "limited",
  cost_report: { reported_by_mind: true, summary: "ok", search_count: 0, abstracts_fetched: 0 },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EXTERNAL_MIND_LIVE_SEND = "false";
  mockGetClientClaim.mockResolvedValue({
    claim: {
      id: "claim-uuid-1",
      workspace_id: "demo-workspace-spa-menu",
      client_claim_id: "demo-claim",
      claim_text: "reduce stress hormones",
      claim_family: "magnesium",
      risk_level: "medium",
      status: "active",
    },
  });
});

describe("mind claim risk brief job service", () => {
  it("blocks send before approval", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, review_status: "pending" },
    });

    const result = await sendMindClaimRiskBriefJob("rb-job-1", access);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("approval_required");
    }
  });

  it("dry-run send when EXTERNAL_MIND_LIVE_SEND=false", async () => {
    mockGetJob.mockResolvedValue({ job: approvedJob });
    mockSend.mockResolvedValue({
      ok: true,
      transport_mode: "dry_run",
      conversation_alias: "alias",
      external_thread_id: null,
      external_message_id: null,
    });
    mockUpdateJob.mockResolvedValue({ ok: true, job: { ...approvedJob, status: "sent" } });

    const result = await sendMindClaimRiskBriefJob("rb-job-1", access);
    expect(result.ok).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("parse creates exactly one structured brief", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "response_fetched", mind_response_text: validBrief },
    });
    mockGetBriefByJob.mockResolvedValue(null);
    mockInsertBrief.mockResolvedValue({
      ok: true,
      brief: { risk_brief_id: "brief-1", workspace_id: approvedJob.workspace_id },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    const first = await parseMindClaimRiskBriefJobResponse("rb-job-1", access);
    expect(first.ok).toBe(true);
    expect(mockInsertBrief).toHaveBeenCalledTimes(1);

    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "parsed", mind_response_text: validBrief, parsed_at: "t" },
    });
    mockGetBriefByJob.mockResolvedValue({ risk_brief_id: "brief-1" });

    const second = await parseMindClaimRiskBriefJobResponse("rb-job-1", access);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.idempotent).toBe(true);
    }
    expect(mockInsertBrief).toHaveBeenCalledTimes(1);
  });

  it("parse failure creates no structured brief", async () => {
    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "response_fetched", mind_response_text: "not json" },
    });
    mockGetBriefByJob.mockResolvedValue(null);
    mockUpdateJob.mockResolvedValue({ ok: true, job: approvedJob });

    const result = await parseMindClaimRiskBriefJobResponse("rb-job-1", access);
    expect(result.ok).toBe(false);
    expect(mockInsertBrief).not.toHaveBeenCalled();
  });
});

describe("non-live fixture response load", () => {
  const fixtureText = buildMindClaimRiskBriefDemoFixtureResponseText("reduce stress hormones");

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

    const result = await loadMindClaimRiskBriefDemoFixtureResponse("rb-job-1", access);
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

    await loadMindClaimRiskBriefDemoFixtureResponse("rb-job-1", access);

    expect(mockUpdateJob).toHaveBeenCalledWith(
      "rb-job-1",
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

    await loadMindClaimRiskBriefDemoFixtureResponse("rb-job-1", access);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "demo_fixture_response_loaded",
        event_summary:
          "Non-live fixture Mind risk brief response loaded. No external Mind call was performed.",
        metadata: {
          response_source: "demo_fixture",
          external_call_performed: false,
          fixture_contract_version: "mind_claim_risk_brief_json_v1",
        },
      }),
      access
    );
  });

  it("rejects invalid job state", async () => {
    mockGetJob.mockResolvedValue({ job: { ...approvedJob, status: "approved" } });

    const result = await loadMindClaimRiskBriefDemoFixtureResponse("rb-job-1", access);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_job_state");
    }
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it("parsing fixture creates exactly one structured brief", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
      },
    });
    mockGetBriefByJob.mockResolvedValue(null);
    mockInsertBrief.mockResolvedValue({
      ok: true,
      brief: { risk_brief_id: "brief-1", workspace_id: approvedJob.workspace_id },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    const first = await parseMindClaimRiskBriefJobResponse("rb-job-1", access);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.idempotent).toBe(false);
    }
    expect(mockInsertBrief).toHaveBeenCalledTimes(1);

    mockGetJob.mockResolvedValue({
      job: { ...approvedJob, status: "parsed", mind_response_text: fixtureText, parsed_at: "t" },
    });
    mockGetBriefByJob.mockResolvedValue({ risk_brief_id: "brief-1" });

    const second = await parseMindClaimRiskBriefJobResponse("rb-job-1", access);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.idempotent).toBe(true);
    }
    expect(mockInsertBrief).toHaveBeenCalledTimes(1);
  });

  it("fixture preserves key evidence-risk insight", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
      },
    });
    mockGetBriefByJob.mockResolvedValue(null);
    mockInsertBrief.mockResolvedValue({
      ok: true,
      brief: { risk_brief_id: "brief-1", workspace_id: approvedJob.workspace_id },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    await parseMindClaimRiskBriefJobResponse("rb-job-1", access);

    const parsedInput = mockInsertBrief.mock.calls[0]?.[0]?.parsed as {
      key_evidence_risk_insight: string;
    };
    expect(parsedInput.key_evidence_risk_insight).toBe(
      "oral magnesium evidence ≠ topical magnesium evidence ≠ branded ritual evidence"
    );
  });

  it("fixture stores evidence_found, evidence_not_found, searches_performed, cost_report safely", async () => {
    mockGetJob.mockResolvedValue({
      job: {
        ...approvedJob,
        status: "response_fetched",
        mind_response_text: fixtureText,
      },
    });
    mockGetBriefByJob.mockResolvedValue(null);
    mockInsertBrief.mockResolvedValue({
      ok: true,
      brief: { risk_brief_id: "brief-1", workspace_id: approvedJob.workspace_id },
    });
    mockUpdateJob.mockResolvedValue({
      ok: true,
      job: { ...approvedJob, status: "parsed", parsed_at: "2026-06-24T00:00:00.000Z" },
    });

    await parseMindClaimRiskBriefJobResponse("rb-job-1", access);

    const parsedInput = mockInsertBrief.mock.calls[0]?.[0]?.parsed as {
      searches_performed: unknown[];
      evidence_found: unknown[];
      evidence_not_found: unknown[];
      cost_report: { reported_by_mind: boolean };
    };
    expect(parsedInput.searches_performed.length).toBeGreaterThan(0);
    expect(parsedInput.evidence_found.length).toBeGreaterThan(0);
    expect(parsedInput.evidence_not_found.length).toBeGreaterThanOrEqual(3);
    expect(parsedInput.cost_report.reported_by_mind).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

const mockGetJob = vi.fn();
const mockUpdateJob = vi.fn();
const mockGetBriefByJob = vi.fn();
const mockInsertBrief = vi.fn();
const mockSend = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/lib/watch/mind-claim-risk-brief-store", () => ({
  getMindClaimRiskBriefJobById: (...args: unknown[]) => mockGetJob(...args),
  updateMindClaimRiskBriefJob: (...args: unknown[]) => mockUpdateJob(...args),
  getMindClaimRiskBriefByJobId: (...args: unknown[]) => mockGetBriefByJob(...args),
  insertMindClaimRiskBrief: (...args: unknown[]) => mockInsertBrief(...args),
}));

vi.mock("@/lib/watch/candidate-claim-accept-service", () => ({
  getClientClaimUuidById: vi.fn(async () => ({
    claim: {
      id: "claim-uuid-1",
      workspace_id: "demo-workspace-spa-menu",
      client_claim_id: "demo-claim",
      claim_text: "Magnesium helps reduce stress",
      claim_family: "magnesium",
      risk_level: "medium",
      status: "active",
    },
  })),
}));

vi.mock("@/lib/watch/mind-claim-hellominds-transport", () => ({
  sendMindClaimHelloMindsMessage: (...args: unknown[]) => mockSend(...args),
  buildMindClaimHelloMindsConversationAlias: () => "lucient-em-mrb-job-1",
}));

vi.mock("@/lib/watch/mind-claim-intelligence-audit-store", () => ({
  recordMindClaimIntelligenceAuditEvent: (...args: unknown[]) => mockAudit(...args),
}));

import {
  parseMindClaimRiskBriefJobResponse,
  sendMindClaimRiskBriefJob,
} from "@/lib/watch/mind-claim-risk-brief-job-service";

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

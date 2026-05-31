import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvidenceMindDigestById = vi.fn();
const mockListEvidenceMindDigestItemsForDigest = vi.fn();
const mockFindActiveHandoffForDigest = vi.fn();
const mockCreateExternalMindHandoff = vi.fn();
const mockSendExternalMindHandoffIfEnabled = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  getEvidenceMindDigestById: (...args: unknown[]) => mockGetEvidenceMindDigestById(...args),
  listEvidenceMindDigestItemsForDigest: (...args: unknown[]) =>
    mockListEvidenceMindDigestItemsForDigest(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  createExternalMindHandoff: (...args: unknown[]) => mockCreateExternalMindHandoff(...args),
  findActiveHandoffForDigest: (...args: unknown[]) => mockFindActiveHandoffForDigest(...args),
  getExternalMindHandoffById: vi.fn(),
  listExternalMindHandoffs: vi.fn(),
}));

vi.mock("@/lib/watch/external-mind-handoff-sender", () => ({
  sendExternalMindHandoffIfEnabled: (...args: unknown[]) =>
    mockSendExternalMindHandoffIfEnabled(...args),
}));

import { createMindHandoffFromDigest } from "@/lib/watch/external-mind-handoff-creator";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const otherWorkspaceAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-456",
  workspaceIds: ["other-workspace"],
};

const digest = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Summary",
  watchlists_checked_count: 0,
  new_alerts_count: 0,
  review_items_count: 0,
  briefs_count: 0,
  affected_claim_families_count: 0,
  affected_client_claims_count: 0,
  highest_risk_implication: "none",
  recommended_focus: "Continue monitoring.",
  status: "ready_for_review",
  generation_source: "manual",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const handoff = {
  id: "handoff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  payload_version: "mind_digest_payload_v1",
  status: "ready",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
  sent_at: null,
  payload_json: {
    payload_version: "mind_digest_payload_v1",
    workspace_id: "demo-workspace-spa-menu",
    digest_id: "digest-uuid-001",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindActiveHandoffForDigest.mockResolvedValue({ handoff: null });
  mockGetEvidenceMindDigestById.mockResolvedValue({ digest });
  mockListEvidenceMindDigestItemsForDigest.mockResolvedValue({ items: [] });
  mockCreateExternalMindHandoff.mockResolvedValue({ ok: true, handoff });
  mockSendExternalMindHandoffIfEnabled.mockResolvedValue({
    ok: true,
    sent: false,
    reason: "external_send_disabled",
  });
});

describe("external-mind-handoff-creator", () => {
  it("creates a handoff from digest", async () => {
    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockCreateExternalMindHandoff).toHaveBeenCalled();
    expect(mockSendExternalMindHandoffIfEnabled).toHaveBeenCalled();
  });

  it("skips duplicate active handoff for same digest", async () => {
    mockFindActiveHandoffForDigest.mockResolvedValueOnce({ handoff });

    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
    }
    expect(mockCreateExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("blocks cross-workspace operator access via digest lookup", async () => {
    mockGetEvidenceMindDigestById.mockResolvedValueOnce({ digest: null, error: "forbidden" });

    const result = await createMindHandoffFromDigest("digest-uuid-001", otherWorkspaceAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });
});

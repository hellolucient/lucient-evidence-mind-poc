import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateEvidenceMindDigestForWorkspace = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-generator", () => ({
  generateEvidenceMindDigestForWorkspace: (...args: unknown[]) =>
    mockGenerateEvidenceMindDigestForWorkspace(...args),
}));

import {
  buildScheduledDigestAccess,
  isPrivacySafeRunDueDigestsResponse,
  runDueEvidenceMindDigests,
} from "@/lib/watch/evidence-mind-digest-scheduler";

const digestRow = {
  id: "digest-uuid-scheduled-001",
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
  generation_source: "scheduled",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateEvidenceMindDigestForWorkspace.mockResolvedValue({
    ok: true,
    digest: digestRow,
  });
});

describe("evidence-mind-digest-scheduler", () => {
  it("uses break-glass access for scheduled generation", () => {
    const access = buildScheduledDigestAccess();

    expect(access.mode).toBe("break_glass");
    expect(access.workspaceIds).toBeNull();
  });

  it("generates scheduled digests for configured workspaces", async () => {
    const result = await runDueEvidenceMindDigests();

    expect(result.generated_count).toBe(1);
    expect(result.skipped_existing_count).toBe(0);
    expect(result.error_count).toBe(0);
    expect(result.digest_ids).toEqual(["digest-uuid-scheduled-001"]);
    expect(mockGenerateEvidenceMindDigestForWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "break_glass" }),
      expect.objectContaining({
        workspaceId: "demo-workspace-spa-menu",
        generationSource: "scheduled",
      })
    );
  });

  it("counts skipped existing active digests", async () => {
    mockGenerateEvidenceMindDigestForWorkspace.mockResolvedValueOnce({
      ok: true,
      digest: digestRow,
      duplicate_skipped: true,
    });

    const result = await runDueEvidenceMindDigests();

    expect(result.generated_count).toBe(0);
    expect(result.skipped_existing_count).toBe(1);
    expect(result.error_count).toBe(0);
    expect(result.workspace_results[0]?.outcome).toBe("skipped_existing");
  });

  it("counts generation errors per workspace", async () => {
    mockGenerateEvidenceMindDigestForWorkspace.mockResolvedValueOnce({
      ok: false,
      error: "supabase_not_configured",
      message: "Supabase is not configured.",
    });

    const result = await runDueEvidenceMindDigests();

    expect(result.generated_count).toBe(0);
    expect(result.skipped_existing_count).toBe(0);
    expect(result.error_count).toBe(1);
    expect(result.workspace_results[0]?.outcome).toBe("error");
  });

  it("handles zero-data generation safely when digest is created", async () => {
    mockGenerateEvidenceMindDigestForWorkspace.mockResolvedValueOnce({
      ok: true,
      digest: {
        ...digestRow,
        briefs_count: 0,
        new_alerts_count: 0,
        review_items_count: 0,
      },
    });

    const result = await runDueEvidenceMindDigests();

    expect(result.generated_count).toBe(1);
    expect(result.error_count).toBe(0);
  });

  it("returns privacy-safe scheduler responses", async () => {
    const result = await runDueEvidenceMindDigests();

    expect(isPrivacySafeRunDueDigestsResponse(result as unknown as Record<string, unknown>)).toBe(
      true
    );
  });
});

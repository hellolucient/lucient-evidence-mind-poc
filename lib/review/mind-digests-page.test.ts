import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListEvidenceMindDigests = vi.fn();
const mockGetEvidenceMindDigestById = vi.fn();
const mockListEvidenceMindDigestItemsForDigest = vi.fn();
const mockGenerateDemoEvidenceMindDigest = vi.fn();
const mockCreateMindHandoffFromDigest = vi.fn();
const mockGetLatestHandoffForDigest = vi.fn();
const mockIsExternalMindHandoffPersistenceConfigured = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  isExternalMindHandoffPersistenceConfigured: (...args: unknown[]) =>
    mockIsExternalMindHandoffPersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-creator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/external-mind-handoff-creator")>();
  return {
    ...actual,
    createMindHandoffFromDigest: (...args: unknown[]) => mockCreateMindHandoffFromDigest(...args),
    getLatestHandoffForDigest: (...args: unknown[]) => mockGetLatestHandoffForDigest(...args),
  };
});
const mockIsEvidenceMindDigestPersistenceConfigured = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  listEvidenceMindDigests: (...args: unknown[]) => mockListEvidenceMindDigests(...args),
  getEvidenceMindDigestById: (...args: unknown[]) => mockGetEvidenceMindDigestById(...args),
  listEvidenceMindDigestItemsForDigest: (...args: unknown[]) =>
    mockListEvidenceMindDigestItemsForDigest(...args),
  isEvidenceMindDigestPersistenceConfigured: (...args: unknown[]) =>
    mockIsEvidenceMindDigestPersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/evidence-mind-digest-generator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/evidence-mind-digest-generator")>();
  return {
    ...actual,
    generateDemoEvidenceMindDigest: (...args: unknown[]) =>
      mockGenerateDemoEvidenceMindDigest(...args),
  };
});

import {
  buildMindDigestsPageData,
  processDemoDigestGenerationSubmission,
  processMindHandoffCreationSubmission,
} from "@/lib/review/mind-digests-page";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const digestRow = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-24T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest — May 24 – May 31, 2026",
  digest_summary: "Summary",
  watchlists_checked_count: 3,
  new_alerts_count: 1,
  review_items_count: 1,
  briefs_count: 1,
  affected_claim_families_count: 1,
  affected_client_claims_count: 1,
  highest_risk_implication: "monitor",
  recommended_focus: "No immediate action required. Continue monitoring.",
  status: "ready_for_review",
  generation_source: "manual",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsEvidenceMindDigestPersistenceConfigured.mockReturnValue(true);
  mockIsExternalMindHandoffPersistenceConfigured.mockReturnValue(true);
  mockGetLatestHandoffForDigest.mockResolvedValue(null);
  mockListEvidenceMindDigests.mockResolvedValue({ digests: [digestRow] });
  mockGetEvidenceMindDigestById.mockResolvedValue({ digest: digestRow });
  mockListEvidenceMindDigestItemsForDigest.mockResolvedValue({
    items: [
      {
        digest_id: "digest-uuid-001",
        workspace_id: "demo-workspace-spa-menu",
        item_type: "evidence_brief",
        item_ref_id: "brief-uuid-001",
        claim_family: "magnesium_cortisol_stress",
        client_claim_id: null,
        title_snapshot: "Evidence change detected",
        summary_snapshot: "Brief summary",
        risk_implication: "monitor",
        recommended_action: "monitor only",
        created_at: "2026-05-31T12:00:00.000Z",
      },
    ],
  });
  mockGenerateDemoEvidenceMindDigest.mockResolvedValue({ ok: true, digest: digestRow });
  mockCreateMindHandoffFromDigest.mockResolvedValue({ ok: true, handoff: { id: "handoff-uuid-001" } });
});

describe("mind-digests-page", () => {
  it("builds page data with digest list and selected detail", async () => {
    const pageData = await buildMindDigestsPageData({ digest_id: "digest-uuid-001" }, operatorAccess);

    expect(pageData.digests).toHaveLength(1);
    expect(pageData.digests[0].digest_title).toContain("Evidence Mind Digest");
    expect(pageData.selectedDigest?.id).toBe("digest-uuid-001");
    expect(pageData.selectedDigest?.recommended_focus).toBeTruthy();
    expect(pageData.selectedDigestItems).toHaveLength(1);
    expect(pageData.selectedDigestItems[0].item_type).toBe("evidence_brief");
    expect(pageData.handoffsConfigured).toBe(true);
  });

  it("redirects after successful handoff creation submission", async () => {
    const submission = await processMindHandoffCreationSubmission(operatorAccess, "digest-uuid-001");

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("handoff_ok=1");
  });

  it("redirects after successful demo generation", async () => {
    const submission = await processDemoDigestGenerationSubmission(operatorAccess);

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("/mind-digests");
    expect(submission.redirectPath).toContain("generate_ok=1");
  });
});

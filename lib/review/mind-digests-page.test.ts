import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListEvidenceMindDigests = vi.fn();
const mockGetEvidenceMindDigestById = vi.fn();
const mockListEvidenceMindDigestItemsForDigest = vi.fn();
const mockGenerateDemoEvidenceMindDigest = vi.fn();
const mockCreateMindHandoffFromDigest = vi.fn();
const mockGetLatestHandoffForDigest = vi.fn();
const mockSendExternalMindHandoff = vi.fn();
const mockReviewExternalMindHandoff = vi.fn();
const mockIsExternalMindHandoffPersistenceConfigured = vi.fn();
const mockIsExternalMindHandoffSendEventPersistenceConfigured = vi.fn();
const mockListExternalMindHandoffSendEventsForHandoff = vi.fn();
const mockIsWatchtowerNarrativePersistenceConfigured = vi.fn();
const mockIsWatchtowerNarrativeDiffPersistenceConfigured = vi.fn();
const mockGetLatestWatchtowerNarrativeForDigest = vi.fn();
const mockGetLatestWatchtowerNarrativeDiffForNarrative = vi.fn();
const mockGenerateWatchtowerNarrativeFromDigest = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-send-event-store", () => ({
  isExternalMindHandoffSendEventPersistenceConfigured: (...args: unknown[]) =>
    mockIsExternalMindHandoffSendEventPersistenceConfigured(...args),
  listExternalMindHandoffSendEventsForHandoff: (...args: unknown[]) =>
    mockListExternalMindHandoffSendEventsForHandoff(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-review", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/external-mind-handoff-review")>();
  return {
    ...actual,
    reviewExternalMindHandoff: (...args: unknown[]) => mockReviewExternalMindHandoff(...args),
  };
});

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
  externalMindHandoffSendErrorMessage: (error: string) => error,
}));

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

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-store", () => ({
  isWatchtowerNarrativePersistenceConfigured: (...args: unknown[]) =>
    mockIsWatchtowerNarrativePersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-diff-store", () => ({
  isWatchtowerNarrativeDiffPersistenceConfigured: (...args: unknown[]) =>
    mockIsWatchtowerNarrativeDiffPersistenceConfigured(...args),
  getLatestWatchtowerNarrativeDiffForNarrative: (...args: unknown[]) =>
    mockGetLatestWatchtowerNarrativeDiffForNarrative(...args),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-generator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/watch/evidence-mind-watchtower-narrative-generator")>();
  return {
    ...actual,
    getLatestWatchtowerNarrativeForDigest: (...args: unknown[]) =>
      mockGetLatestWatchtowerNarrativeForDigest(...args),
    generateWatchtowerNarrativeFromDigest: (...args: unknown[]) =>
      mockGenerateWatchtowerNarrativeFromDigest(...args),
  };
});

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
  processMindHandoffReviewSubmission,
  processMindHandoffSendSubmission,
  processMindWatchtowerNarrativeSubmission,
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
  mockIsExternalMindHandoffSendEventPersistenceConfigured.mockReturnValue(true);
  mockIsWatchtowerNarrativePersistenceConfigured.mockReturnValue(true);
  mockIsWatchtowerNarrativeDiffPersistenceConfigured.mockReturnValue(true);
  mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValue({
    id: "narrative-uuid-001",
    title: "Watchtower Narrative — Evidence Mind Digest",
    risk_posture: "monitor",
    summary_text: "Summary",
    generated_at: "2026-05-31T12:30:00.000Z",
  });
  mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValue({
    diff: {
      id: "diff-uuid-001",
      workspace_id: "demo-workspace-spa-menu",
      current_narrative_id: "narrative-uuid-001",
      previous_narrative_id: "narrative-uuid-000",
      current_digest_id: "digest-uuid-001",
      previous_digest_id: "digest-uuid-000",
      comparison_scope: "workspace_digest_sequence",
      diff_version: "watchtower_narrative_diff_v1",
      interpretation_change_level: "medium",
      risk_posture_change: "decreased",
      operator_focus_change: "changed",
      recommended_action_change: "changed",
      urgency_change: "unchanged",
      change_signals: ["risk_posture_decreased", "recommended_action_changed"],
      deterministic_summary: "Risk posture decreased and recommended action changed.",
      comparison_method: "deterministic_template",
      metadata_json: { internal_only: true },
      compared_at: "2026-06-07T12:00:00.000Z",
      created_at: "2026-06-07T12:00:00.000Z",
      updated_at: "2026-06-07T12:00:00.000Z",
    },
  });
  mockGenerateWatchtowerNarrativeFromDigest.mockResolvedValue({
    ok: true,
    narrative: { id: "narrative-uuid-001" },
  });
  mockListExternalMindHandoffSendEventsForHandoff.mockResolvedValue({
    events: [
      {
        event_type: "send_succeeded",
        result: "test_sink_sent",
        destination: "test_sink",
        actor_type: "supabase_operator",
        access_mode: "supabase_operator",
        attempted_at: "2026-05-31T13:00:00.000Z",
        completed_at: "2026-05-31T13:00:00.000Z",
        error_message: null,
      },
    ],
  });
  mockGetLatestHandoffForDigest.mockResolvedValue({
    id: "handoff-uuid-001",
    status: "sent",
    destination: "test_sink",
    review_status: "approved",
  });
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
  mockSendExternalMindHandoff.mockResolvedValue({
    ok: true,
    handoff: { id: "handoff-uuid-001", status: "sent" },
    sendResult: { result: "test_sink_sent" },
  });
  mockReviewExternalMindHandoff.mockResolvedValue({
    ok: true,
    handoff: { id: "handoff-uuid-001", review_status: "approved" },
    action: "approve",
  });
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
    expect(pageData.narrativesConfigured).toBe(true);
    expect(pageData.diffsConfigured).toBe(true);
    expect(pageData.selectedDigestNarrative?.title).toContain("Watchtower Narrative");
    expect(pageData.selectedDigestWatchtowerNarrativeDiff?.deterministic_summary).toContain(
      "Risk posture decreased"
    );
    expect(pageData.selectedDigestWatchtowerNarrativeDiff).not.toHaveProperty("metadata_json");
    expect(mockGetLatestWatchtowerNarrativeDiffForNarrative).toHaveBeenCalledWith(
      {
        current_narrative_id: "narrative-uuid-001",
        comparison_scope: "workspace_digest_sequence",
        diff_version: "watchtower_narrative_diff_v1",
      },
      operatorAccess
    );
    expect(pageData.sendEventsConfigured).toBe(true);
    expect(pageData.selectedDigestHandoffSendEvents).toHaveLength(1);
    expect(pageData.selectedDigestHandoffSendEvents[0].event_type).toBe("send_succeeded");
  });

  it("redirects after successful handoff creation submission", async () => {
    const submission = await processMindHandoffCreationSubmission(operatorAccess, "digest-uuid-001");

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("handoff_ok=1");
    expect(mockCreateMindHandoffFromDigest).toHaveBeenCalledWith(
      "digest-uuid-001",
      operatorAccess,
      undefined
    );
  });

  it("forwards destination to createMindHandoffFromDigest when provided", async () => {
    await processMindHandoffCreationSubmission(operatorAccess, "digest-uuid-001", "animoca_mind");

    expect(mockCreateMindHandoffFromDigest).toHaveBeenCalledWith(
      "digest-uuid-001",
      operatorAccess,
      { destination: "animoca_mind" }
    );
  });

  it("redirects after successful demo generation", async () => {
    const submission = await processDemoDigestGenerationSubmission(operatorAccess);

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("/mind-digests");
    expect(submission.redirectPath).toContain("generate_ok=1");
  });

  it("redirects after successful test sink send submission", async () => {
    const submission = await processMindHandoffSendSubmission(
      operatorAccess,
      "handoff-uuid-001",
      "digest-uuid-001"
    );

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("send_ok=1");
    expect(submission.redirectPath).toContain("send_result=test_sink_sent");
  });

  it("redirects after successful handoff approval submission", async () => {
    const submission = await processMindHandoffReviewSubmission(
      operatorAccess,
      "handoff-uuid-001",
      "approve",
      "digest-uuid-001"
    );

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("review_ok=1");
    expect(submission.redirectPath).toContain("review_action=approve");
  });

  it("loads page data without diff when no narrative exists", async () => {
    mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValue(null);

    const pageData = await buildMindDigestsPageData({ digest_id: "digest-uuid-001" }, operatorAccess);

    expect(pageData.selectedDigestNarrative).toBeNull();
    expect(pageData.selectedDigestWatchtowerNarrativeDiff).toBeNull();
    expect(mockGetLatestWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
  });

  it("loads page data with null diff when narrative has no stored diff", async () => {
    mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValue({ diff: null });

    const pageData = await buildMindDigestsPageData({ digest_id: "digest-uuid-001" }, operatorAccess);

    expect(pageData.selectedDigestNarrative?.id).toBe("narrative-uuid-001");
    expect(pageData.selectedDigestWatchtowerNarrativeDiff).toBeNull();
  });

  it("redirects after successful watchtower narrative submission", async () => {
    const submission = await processMindWatchtowerNarrativeSubmission(
      operatorAccess,
      "digest-uuid-001"
    );

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("narrative_ok=1");
  });
});

import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MindDigestsView } from "./mind-digests-view";
import type { MindDigestsPageData } from "@/lib/review/mind-digests-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

const authStatus: ReviewQueueAuthPanelData = {
  mode: "operator",
  accessLabel: "Supabase operator session",
  operatorEmail: "operator@example.com",
  workspaceScopeLabel: "demo-workspace-spa-menu",
  showLogout: true,
};

const basePageData: MindDigestsPageData = {
  configured: true,
  handoffsConfigured: true,
  narrativesConfigured: true,
  diffsConfigured: true,
  filters: {},
  digests: [],
  selectedDigest: {
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
    recommended_focus: "Continue monitoring.",
    status: "ready_for_review",
    generation_source: "manual",
    created_at: "2026-05-31T12:00:00.000Z",
    updated_at: "2026-05-31T12:00:00.000Z",
  },
  selectedDigestItems: [],
  selectedDigestHandoff: null,
  selectedDigestHandoffSendEvents: [],
  selectedHandoffDestination: "test_sink",
  selectedDigestNarrative: null,
  selectedDigestWatchtowerNarrativeDiff: null,
  sendEventsConfigured: true,
  defaultWorkspaceId: "demo-workspace-spa-menu",
  listError: null,
  listErrorMessage: null,
  detailError: null,
  detailErrorMessage: null,
  generateFlash: null,
  handoffFlash: null,
  sendFlash: null,
  reviewFlash: null,
  narrativeFlash: null,
  statusOptions: ["ready_for_review"],
};

const narrative = {
  id: "narrative-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  claim_family: null,
  narrative_type: "digest_watchtower_narrative" as const,
  narrative_version: "digest_watchtower_narrative_v1" as const,
  generation_method: "deterministic_template" as const,
  title: "Watchtower Narrative — Evidence Mind Digest",
  summary_text: "Summary text",
  what_changed_text: "What changed",
  why_it_matters_text: "Why it matters",
  operator_focus_text: "Operator focus",
  recommended_next_action_text: "Recommended action",
  risk_posture: "monitor" as const,
  confidence_level: "medium" as const,
  generated_at: "2026-06-07T12:00:00.000Z",
  created_at: "2026-06-07T12:00:00.000Z",
  updated_at: "2026-06-07T12:00:00.000Z",
};

const pendingHelloMindsHandoff = {
  id: "handoff-uuid-hellominds",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary" as const,
  destination: "hellominds" as const,
  payload_version: "mind_digest_payload_v1" as const,
  status: "ready" as const,
  review_status: "pending_review" as const,
  created_at: "2026-06-22T12:00:00.000Z",
  updated_at: "2026-06-22T12:00:00.000Z",
  approved_at: null,
  sent_at: null,
  send_attempted_at: null,
  send_result_json: null,
  payload_json: {
    destination: "hellominds",
    digest_id: "digest-uuid-001",
    summary: "Privacy-safe summary",
  },
};

const approvedHelloMindsHandoff = {
  ...pendingHelloMindsHandoff,
  review_status: "approved" as const,
  approved_at: "2026-06-22T12:30:00.000Z",
};

const diffView = {
  id: "diff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  current_narrative_id: "narrative-uuid-001",
  previous_narrative_id: "narrative-uuid-000",
  current_digest_id: "digest-uuid-001",
  previous_digest_id: "digest-uuid-000",
  comparison_scope: "workspace_digest_sequence" as const,
  diff_version: "watchtower_narrative_diff_v1" as const,
  interpretation_change_level: "medium" as const,
  risk_posture_change: "decreased" as const,
  operator_focus_change: "changed" as const,
  recommended_action_change: "changed" as const,
  urgency_change: "unchanged" as const,
  change_signals: [
    "risk_posture_decreased" as const,
    "recommended_action_changed" as const,
    "confidence_decreased" as const,
  ],
  deterministic_summary: "Risk posture decreased and recommended action changed.",
  comparison_method: "deterministic_template" as const,
  compared_at: "2026-06-07T12:00:00.000Z",
  created_at: "2026-06-07T12:00:00.000Z",
  updated_at: "2026-06-07T12:00:00.000Z",
};

function renderView(pageData: MindDigestsPageData): string {
  return renderToStaticMarkup(
    createElement(MindDigestsView, { pageData, authStatus })
  );
}

describe("mind-digests-view", () => {
  it("does not render the diff panel when no narrative exists", () => {
    const html = renderView(basePageData);

    expect(html).not.toContain("Watchtower Narrative Diff");
    expect(html).not.toContain("No diff has been stored for this narrative yet.");
  });

  it("renders empty diff state when narrative exists without stored diff", () => {
    const html = renderView({
      ...basePageData,
      selectedDigestNarrative: narrative,
      selectedDigestWatchtowerNarrativeDiff: null,
    });

    expect(html).toContain("Watchtower Narrative Diff");
    expect(html).toContain("No diff has been stored for this narrative yet.");
    expect(html).not.toContain("Deterministic summary");
  });

  it("renders deterministic summary and main change fields when diff exists", () => {
    const html = renderView({
      ...basePageData,
      selectedDigestNarrative: narrative,
      selectedDigestWatchtowerNarrativeDiff: diffView,
    });

    expect(html).toContain("Watchtower Narrative Diff");
    expect(html).toContain("Risk posture decreased and recommended action changed.");
    expect(html).toContain("Interpretation change level");
    expect(html).toContain("medium");
    expect(html).toContain("Risk posture change");
    expect(html).toContain("decreased");
    expect(html).toContain("Urgency change");
    expect(html).toContain("Operator focus change");
    expect(html).toContain("Recommended action change");
    expect(html).toContain("risk posture decreased");
    expect(html).toContain("recommended action changed");
    expect(html).toContain("confidence decreased");
    expect(html).toContain("narrative-uuid-000");
    expect(html).toContain("Compared at");
  });

  it("shows first-narrative message when previous_narrative_id is null", () => {
    const html = renderView({
      ...basePageData,
      selectedDigestNarrative: narrative,
      selectedDigestWatchtowerNarrativeDiff: {
        ...diffView,
        previous_narrative_id: null,
        change_signals: ["no_prior_narrative"],
      },
    });

    expect(html).toContain("This is the first narrative in the current workspace sequence.");
    expect(html).toContain("no prior narrative");
  });

  it("does not render metadata_json in the diff panel", () => {
    const html = renderView({
      ...basePageData,
      selectedDigestNarrative: narrative,
      selectedDigestWatchtowerNarrativeDiff: diffView,
    });

    expect(html).not.toContain("metadata_json");
    expect(html).not.toContain("internal_only");
  });

  it("renders separate create-handoff forms for test_sink and hellominds", () => {
    const html = renderView(basePageData);

    expect(html).toContain('action="/mind-digests/create-handoff"');
    expect(html).toContain('name="destination" value="test_sink"');
    expect(html).toContain('name="destination" value="hellominds"');
    expect(html).toContain('name="digest_id" value="digest-uuid-001"');
    expect(html).toContain("Create test sink handoff");
    expect(html).toContain("Create HelloMinds handoff");
    expect(html).not.toContain("Create Mind handoff payload");
  });

  it("does not expose HelloMinds send controls on the create-handoff forms", () => {
    const html = renderView(basePageData);

    expect(html).not.toContain("Send to HelloMinds");
    expect(html).not.toContain("EXTERNAL_MIND_HELLOMINDS");
    expect(html).not.toContain("ACCESS_KEY");
  });

  it("renders destination switcher links for test_sink and hellominds", () => {
    const html = renderView(basePageData);

    expect(html).toContain("View handoff by destination");
    expect(html).toContain("/mind-digests?digest_id=digest-uuid-001");
    expect(html).toContain("handoff_destination=hellominds");
    expect(html).toContain("test sink (viewing)");
  });

  it("displays hellominds handoff detail when page data includes one", () => {
    const html = renderView({
      ...basePageData,
      selectedHandoffDestination: "hellominds",
      selectedDigestHandoff: pendingHelloMindsHandoff,
    });

    expect(html).toContain("Destination: hellominds");
    expect(html).toContain("HelloMinds (viewing)");
    expect(html).not.toContain("No Mind handoff payload exists");
    expect(html).toContain("Dry-run send is disabled until an operator approves");
    expect(html).not.toContain('action="/mind-handoffs/send"');
    expect(html).toContain('name="handoff_destination" value="hellominds"');
  });

  it("shows HelloMinds dry-run send form only for approved unsent hellominds handoffs", () => {
    const html = renderView({
      ...basePageData,
      selectedHandoffDestination: "hellominds",
      selectedDigestHandoff: approvedHelloMindsHandoff,
    });

    expect(html).toContain('action="/mind-handoffs/send"');
    expect(html).toContain('name="handoff_id" value="handoff-uuid-hellominds"');
    expect(html).toContain('name="digest_id" value="digest-uuid-001"');
    expect(html).toContain('name="handoff_destination" value="hellominds"');
    expect(html).toContain("Dry-run send HelloMinds handoff</button>");
    expect(html).toContain("EXTERNAL_MIND_LIVE_SEND=false");
    expect(html).not.toContain("Live send HelloMinds");
    expect(html).not.toContain("Send to HelloMinds");
    expect(html).not.toContain("EXTERNAL_MIND_HELLOMINDS");
    expect(html).not.toContain("ACCESS_KEY");
  });

  it("does not show HelloMinds dry-run send form after handoff is sent", () => {
    const html = renderView({
      ...basePageData,
      selectedHandoffDestination: "hellominds",
      selectedDigestHandoff: {
        ...approvedHelloMindsHandoff,
        status: "sent",
        sent_at: "2026-06-22T13:00:00.000Z",
      },
    });

    expect(html).not.toContain("Dry-run send HelloMinds handoff</button>");
  });

  it("shows destination-specific empty state when hellominds handoff is missing", () => {
    const html = renderView({
      ...basePageData,
      selectedHandoffDestination: "hellominds",
      selectedDigestHandoff: null,
    });

    expect(html).toContain("No Mind handoff payload exists for this digest at destination HelloMinds yet.");
  });
});

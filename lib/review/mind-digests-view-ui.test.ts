import { describe, expect, it } from "vitest";

import {
  formatHelloMindsMindReplyExcerptForDisplay,
  formatHelloMindsReceiptStateLabel,
  resolveHelloMindsMindReplyDisplay,
  isMindDigestsWatchtowerNarrativeDiffView,
  shapeMindDigestsWatchtowerNarrativeDiffView,
  WATCHTOWER_NARRATIVE_DIFF_PRIVATE_FIELDS,
} from "./mind-digests-view-ui";

const diffRow = {
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
  change_signals: ["risk_posture_decreased" as const],
  deterministic_summary: "Risk posture decreased.",
  comparison_method: "deterministic_template" as const,
  metadata_json: { internal_only: true },
  compared_at: "2026-06-07T12:00:00.000Z",
  created_at: "2026-06-07T12:00:00.000Z",
  updated_at: "2026-06-07T12:00:00.000Z",
};

describe("mind-digests-view-ui", () => {
  it("shapeMindDigestsWatchtowerNarrativeDiffView strips metadata_json", () => {
    const view = shapeMindDigestsWatchtowerNarrativeDiffView(diffRow);

    for (const field of WATCHTOWER_NARRATIVE_DIFF_PRIVATE_FIELDS) {
      expect(view).not.toHaveProperty(field);
    }
    expect(view.deterministic_summary).toBe("Risk posture decreased.");
    expect(isMindDigestsWatchtowerNarrativeDiffView(view as Record<string, unknown>)).toBe(true);
  });

  it("isMindDigestsWatchtowerNarrativeDiffView rejects metadata_json", () => {
    expect(
      isMindDigestsWatchtowerNarrativeDiffView({
        ...diffRow,
        metadata_json: { secret: true },
      } as Record<string, unknown>)
    ).toBe(false);
  });

  it("formats HelloMinds receipt state labels by source", () => {
    expect(formatHelloMindsReceiptStateLabel(null)).toBe(
      "No receipt verification recorded yet."
    );
    expect(
      formatHelloMindsReceiptStateLabel({
        receipt_source: "send_event_metadata",
        receipt_status: "delivery_confirmed_from_send_event",
      })
    ).toBe("Delivery receipt verified from send audit metadata.");
    expect(
      formatHelloMindsReceiptStateLabel({
        receipt_source: "hellominds_read_api",
        receipt_status: "fetched_from_hellominds",
      })
    ).toBe("Mind response retrieved from HelloMinds history API.");
  });

  it("formats HelloMinds Mind reply excerpts as readable plain text", () => {
    expect(
      formatHelloMindsMindReplyExcerptForDisplay(
        "<p>Line one</p><br/><p>Line two</p>"
      )
    ).toBe("Line one\n\nLine two");
    expect(formatHelloMindsMindReplyExcerptForDisplay("Plain text only")).toBe(
      "Plain text only"
    );
  });

  it("resolves stored main reply and cost report for display", () => {
    const display = resolveHelloMindsMindReplyDisplay({
      response_excerpt: "Operational analysis of the digest.",
      metadata: {
        cost_report_present: true,
        cost_report_excerpt:
          "💡 LUCIENT TASK COST REPORT 📊\n• Category: Monitoring/Digest Processing\n• Total Credits: 42",
        cost_report_truncated: false,
      },
    });

    expect(display.main_reply).toBe("Operational analysis of the digest.");
    expect(display.cost_report_present).toBe(true);
    expect(display.cost_report).toContain("Total Credits: 42");
    expect(display.main_reply).not.toContain("Total Credits");
  });
});

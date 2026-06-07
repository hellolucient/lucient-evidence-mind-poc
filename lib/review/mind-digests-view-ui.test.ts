import { describe, expect, it } from "vitest";

import {
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
});

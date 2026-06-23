import type { PrivacySafeWatchtowerNarrativeDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";
import {
  buildHelloMindsMindReplyDisplayFromStored,
  convertHelloMindsMessageTextToPlainText,
} from "@/lib/watch/external-mind-hellominds-message-format";

export const WATCHTOWER_NARRATIVE_DIFF_PRIVATE_FIELDS = ["metadata_json"] as const;

export type MindDigestsWatchtowerNarrativeDiffView = Omit<
  PrivacySafeWatchtowerNarrativeDiff,
  "metadata_json"
>;

export function shapeMindDigestsWatchtowerNarrativeDiffView(
  diff: PrivacySafeWatchtowerNarrativeDiff
): MindDigestsWatchtowerNarrativeDiffView {
  const { metadata_json, ...view } = diff;
  void metadata_json;
  return view;
}

export function formatWatchtowerNarrativeDiffLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function formatWatchtowerNarrativeDiffSignalLabel(signal: string): string {
  return formatWatchtowerNarrativeDiffLabel(signal);
}

export type HelloMindsReceiptStateInput = {
  receipt_source: string;
  receipt_status: string;
} | null;

export function formatHelloMindsReceiptStateLabel(receipt: HelloMindsReceiptStateInput): string {
  if (!receipt) {
    return "No receipt verification recorded yet.";
  }

  if (
    receipt.receipt_source === "hellominds_read_api" &&
    receipt.receipt_status === "fetched_from_hellominds"
  ) {
    return "Mind response retrieved from HelloMinds history API.";
  }

  if (receipt.receipt_source === "send_event_metadata") {
    return "Delivery receipt verified from send audit metadata.";
  }

  return "Receipt recorded.";
}

export function formatHelloMindsMindReplyExcerptForDisplay(
  excerpt: string | null | undefined
): string | null {
  if (!excerpt?.trim()) {
    return null;
  }

  return convertHelloMindsMessageTextToPlainText(excerpt);
}

export function resolveHelloMindsMindReplyDisplay(input: {
  response_excerpt: string | null | undefined;
  metadata?: Record<string, unknown> | null;
}) {
  return buildHelloMindsMindReplyDisplayFromStored(input);
}

export function isMindDigestsWatchtowerNarrativeDiffView(
  value: Record<string, unknown>
): value is MindDigestsWatchtowerNarrativeDiffView {
  for (const field of WATCHTOWER_NARRATIVE_DIFF_PRIVATE_FIELDS) {
    if (field in value) {
      return false;
    }
  }

  return (
    typeof value.id === "string" &&
    typeof value.deterministic_summary === "string" &&
    typeof value.interpretation_change_level === "string" &&
    typeof value.risk_posture_change === "string" &&
    typeof value.urgency_change === "string" &&
    typeof value.operator_focus_change === "string" &&
    typeof value.recommended_action_change === "string" &&
    Array.isArray(value.change_signals) &&
    typeof value.compared_at === "string"
  );
}

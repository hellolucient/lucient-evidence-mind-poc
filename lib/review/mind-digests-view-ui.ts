import type { PrivacySafeWatchtowerNarrativeDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";

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

  let text = excerpt.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
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

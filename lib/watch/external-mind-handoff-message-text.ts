import type { MindDigestHandoffPayloadV1 } from "@/lib/watch/external-mind-handoff-payload-builder";
import { containsHelloMindsSensitiveEnvValue } from "@/lib/watch/external-mind-hellominds-send-config";

const FORBIDDEN_MESSAGE_TEXT_FRAGMENTS = [
  "metadata_json",
  "source_counts_json",
  "referenced_entities_json",
  "client_claim_id",
  "affected_client_claims",
  "affected_claim_families",
  "authorization",
  "bearer",
  "cron_secret",
  "service_role",
  "access_token",
  "refresh_token",
  "password",
  "secret",
] as const;

const MAX_MESSAGE_TEXT_ITEMS = 25;
const MAX_MESSAGE_TEXT_LENGTH = 32_768;

function appendSection(lines: string[], title: string, body: string | null | undefined): void {
  if (!body || body.trim().length === 0) {
    return;
  }

  lines.push(title, body.trim(), "");
}

function formatCounts(payload: MindDigestHandoffPayloadV1): string {
  const { counts } = payload;

  return [
    `Watchlists checked: ${counts.watchlists_checked_count}`,
    `New alerts: ${counts.new_alerts_count}`,
    `Review items: ${counts.review_items_count}`,
    `Briefs: ${counts.briefs_count}`,
    `Affected claim families (count): ${counts.affected_claim_families_count}`,
    `Affected client claims (count): ${counts.affected_client_claims_count}`,
  ].join("\n");
}

function formatItems(payload: MindDigestHandoffPayloadV1): string {
  if (payload.items.length === 0) {
    return "No items.";
  }

  const visibleItems = payload.items.slice(0, MAX_MESSAGE_TEXT_ITEMS);
  const lines = visibleItems.map((item, index) => {
    const parts = [`${index + 1}. [${item.item_type}] ${item.title_snapshot}`];

    if (item.summary_snapshot) {
      parts.push(`   Summary: ${item.summary_snapshot}`);
    }

    if (item.risk_implication) {
      parts.push(`   Risk: ${item.risk_implication}`);
    }

    if (item.recommended_action) {
      parts.push(`   Action: ${item.recommended_action}`);
    }

    return parts.join("\n");
  });

  if (payload.items.length > MAX_MESSAGE_TEXT_ITEMS) {
    const remaining = payload.items.length - MAX_MESSAGE_TEXT_ITEMS;
    lines.push(`… and ${remaining} more items not shown.`);
  }

  return lines.join("\n");
}

function formatWatchtowerNarrative(payload: MindDigestHandoffPayloadV1): string | null {
  const narrative = payload.watchtower_narrative;
  if (!narrative) {
    return null;
  }

  const lines = [
    `Title: ${narrative.title}`,
    `Risk posture: ${narrative.risk_posture}`,
    `Summary: ${narrative.summary_text}`,
  ];

  if (narrative.what_changed_text) {
    lines.push(`What changed: ${narrative.what_changed_text}`);
  }

  if (narrative.why_it_matters_text) {
    lines.push(`Why it matters: ${narrative.why_it_matters_text}`);
  }

  if (narrative.operator_focus_text) {
    lines.push(`Operator focus: ${narrative.operator_focus_text}`);
  }

  if (narrative.recommended_next_action_text) {
    lines.push(`Next action: ${narrative.recommended_next_action_text}`);
  }

  return lines.join("\n");
}

function formatWatchtowerNarrativeDiff(payload: MindDigestHandoffPayloadV1): string | null {
  const diff = payload.watchtower_narrative_diff;
  if (!diff) {
    return null;
  }

  const lines = [
    `Change level: ${diff.interpretation_change_level}`,
    `Risk posture change: ${diff.risk_posture_change}`,
    `Operator focus change: ${diff.operator_focus_change}`,
    `Recommended action change: ${diff.recommended_action_change}`,
    `Urgency change: ${diff.urgency_change}`,
    `Summary: ${diff.deterministic_summary}`,
  ];

  if (diff.change_signals.length > 0) {
    lines.push(`Change signals: ${diff.change_signals.join(", ")}`);
  }

  return lines.join("\n");
}

export function buildHelloMindsMessageText(payload: MindDigestHandoffPayloadV1): string {
  const lines: string[] = [
    "=== Lucient Evidence Mind Digest Handoff ===",
    `Payload version: ${payload.payload_version}`,
    `Handoff type: ${payload.handoff_type}`,
    `Period: ${payload.period_start} – ${payload.period_end}`,
    "",
  ];

  appendSection(lines, "--- Summary ---", [
    payload.digest_title ? `Title: ${payload.digest_title}` : null,
    payload.digest_summary ? `Summary: ${payload.digest_summary}` : null,
    payload.highest_risk_implication
      ? `Highest risk: ${payload.highest_risk_implication}`
      : null,
    payload.recommended_focus ? `Recommended focus: ${payload.recommended_focus}` : null,
  ]
    .filter(Boolean)
    .join("\n"));

  lines.push("--- Counts ---", formatCounts(payload), "");

  lines.push("--- Items ---", formatItems(payload), "");

  const narrativeText = formatWatchtowerNarrative(payload);
  if (narrativeText) {
    lines.push("--- Watchtower narrative ---", narrativeText, "");
  }

  const diffText = formatWatchtowerNarrativeDiff(payload);
  if (diffText) {
    lines.push("--- Watchtower narrative diff (deterministic) ---", diffText, "");
  }

  let messageText = lines.join("\n").trim();

  if (messageText.length > MAX_MESSAGE_TEXT_LENGTH) {
    messageText = `${messageText.slice(0, MAX_MESSAGE_TEXT_LENGTH - 64).trimEnd()}\n\n… truncated to ${MAX_MESSAGE_TEXT_LENGTH} characters.`;
  }

  return messageText;
}

export function isPrivacySafeHelloMindsMessageText(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const normalized = text.toLowerCase();

  if (normalized.includes("{") && normalized.includes("}")) {
    return false;
  }

  if (FORBIDDEN_MESSAGE_TEXT_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    return false;
  }

  if (containsHelloMindsSensitiveEnvValue(text)) {
    return false;
  }

  return true;
}

export function buildPrivacySafeHelloMindsMessageText(
  payload: MindDigestHandoffPayloadV1
): string | null {
  const messageText = buildHelloMindsMessageText(payload);

  if (!isPrivacySafeHelloMindsMessageText(messageText)) {
    return null;
  }

  return messageText;
}

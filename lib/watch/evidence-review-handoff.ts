import { findAffectedClientClaimsForClaimFamily, type ClientClaimRecord } from "./client-claim-mapper";
import type { EvidenceSignalCategory } from "./evidence-signal-classifier";
import type { EvidenceAlertCandidate } from "./evidence-alert-store";

export type ReviewItemStatus =
  | "open"
  | "acknowledged"
  | "in_review"
  | "resolved"
  | "dismissed";

export type EvidenceReviewHandoffItem = {
  id: string;
  evidence_alert_id: string | null;
  watch_run_id: string | null;
  workspace_id: string;
  client_claim_id: string;
  claim_family_id: string;
  signal: string;
  severity: string | null;
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
  status: ReviewItemStatus;
  summary: string;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EvidenceAlertHandoffInput = {
  evidence_alert_id: string | null;
  watch_run_id: string | null;
  claim_family_id: string;
  external_id?: string;
  signal?: string;
  severity?: string | null;
  human_review_required?: boolean;
  client_claim_re_review_required?: boolean;
  summary?: string;
  raw_payload?: Record<string, unknown> | null;
};

export type ReviewHandoffBuildResult = {
  items: EvidenceReviewHandoffItem[];
  affected_claim_count: number;
};

const SCHEDULED_RUNNER_PRIVATE_FIELDS = [
  "claim_text",
  "client exact wording",
  "private legal notes",
  "brand confidential copy",
] as const;

const DEMO_PRIVATE_CLAIM_TEXT_FRAGMENT =
  "magnesium therapy helps reduce cortisol and supports stress recovery";

export function isReviewHandoffEnabled(): boolean {
  return process.env.EIE_ENABLE_REVIEW_HANDOFFS?.trim().toLowerCase() === "true";
}

function readSignalFromPayload(
  rawPayload: Record<string, unknown> | null | undefined
): {
  signal: EvidenceSignalCategory | string;
  severity: string | null;
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
} {
  const classification =
    rawPayload?.signal_classification &&
    typeof rawPayload.signal_classification === "object"
      ? (rawPayload.signal_classification as Record<string, unknown>)
      : null;

  return {
    signal:
      (typeof rawPayload?.signal === "string" ? rawPayload.signal : null) ??
      (typeof classification?.signal === "string" ? classification.signal : null) ??
      "monitor_only",
    severity:
      (typeof rawPayload?.severity === "string" ? rawPayload.severity : null) ??
      (typeof classification?.severity === "string" ? classification.severity : null),
    human_review_required:
      rawPayload?.human_review_required === true ||
      classification?.human_review_required === true,
    client_claim_re_review_required:
      rawPayload?.client_claim_re_review_required === true ||
      classification?.client_claim_re_review_required === true,
  };
}

function buildHandoffSummary(
  alert: EvidenceAlertHandoffInput,
  clientClaim: ClientClaimRecord,
  signal: string
): string {
  const externalId = alert.external_id ?? "unknown";
  return `Evidence alert for ${alert.claim_family_id} (${externalId}) may affect workspace claim ${clientClaim.id}; signal=${signal}.`;
}

export function buildReviewHandoffItem(
  alert: EvidenceAlertHandoffInput,
  clientClaim: ClientClaimRecord
): EvidenceReviewHandoffItem {
  const signalMeta = readSignalFromPayload(alert.raw_payload ?? null);
  const signal = alert.signal ?? signalMeta.signal;
  const now = new Date().toISOString();

  return {
    id: `${alert.evidence_alert_id ?? "draft"}:${clientClaim.id}`,
    evidence_alert_id: alert.evidence_alert_id,
    watch_run_id: alert.watch_run_id,
    workspace_id: clientClaim.workspace_id,
    client_claim_id: clientClaim.id,
    claim_family_id: alert.claim_family_id,
    signal,
    severity: alert.severity ?? signalMeta.severity,
    human_review_required:
      alert.human_review_required ?? signalMeta.human_review_required,
    client_claim_re_review_required:
      alert.client_claim_re_review_required ??
      signalMeta.client_claim_re_review_required,
    status: "open",
    summary:
      alert.summary ?? buildHandoffSummary(alert, clientClaim, String(signal)),
    raw_payload: {
      external_id: alert.external_id ?? null,
      source_type: clientClaim.source_type,
      source_label: clientClaim.source_label,
      claim_context: clientClaim.claim_context,
      alert_raw_payload: alert.raw_payload ?? null,
      handoff_phase: "17",
    },
    created_at: now,
    updated_at: now,
  };
}

export function buildReviewItemsForEvidenceAlert(
  alert: EvidenceAlertHandoffInput
): ReviewHandoffBuildResult {
  const affectedClaims = findAffectedClientClaimsForClaimFamily(alert.claim_family_id);

  return {
    affected_claim_count: affectedClaims.length,
    items: affectedClaims.map((claim) => buildReviewHandoffItem(alert, claim)),
  };
}

export function buildReviewItemsFromAlertCandidate(options: {
  candidate: EvidenceAlertCandidate;
  evidence_alert_id: string;
  watch_run_id: string | null;
}): ReviewHandoffBuildResult {
  const signalMeta = readSignalFromPayload(options.candidate.raw_payload);

  return buildReviewItemsForEvidenceAlert({
    evidence_alert_id: options.evidence_alert_id,
    watch_run_id: options.watch_run_id,
    claim_family_id: options.candidate.claim_family,
    external_id: options.candidate.external_id,
    signal: String(signalMeta.signal),
    severity: options.candidate.severity,
    human_review_required: signalMeta.human_review_required,
    client_claim_re_review_required: signalMeta.client_claim_re_review_required,
    raw_payload: options.candidate.raw_payload,
  });
}

export function scheduledRunnerPayloadExcludesPrivateClaimText(
  payload: unknown
): boolean {
  const serialized = JSON.stringify(payload ?? {}).toLowerCase();

  return SCHEDULED_RUNNER_PRIVATE_FIELDS.every((field) => {
    if (field === "claim_text") {
      return !serialized.includes(DEMO_PRIVATE_CLAIM_TEXT_FRAGMENT);
    }
    return !serialized.includes(field.toLowerCase());
  });
}

export function buildScheduledRunnerSafeHandoffSummary(
  item: EvidenceReviewHandoffItem
): Record<string, unknown> {
  return {
    review_item_id: item.id,
    evidence_alert_id: item.evidence_alert_id,
    watch_run_id: item.watch_run_id,
    workspace_id: item.workspace_id,
    client_claim_id: item.client_claim_id,
    claim_family_id: item.claim_family_id,
    signal: item.signal,
    severity: item.severity,
    human_review_required: item.human_review_required,
    client_claim_re_review_required: item.client_claim_re_review_required,
    status: item.status,
    summary: item.summary,
  };
}

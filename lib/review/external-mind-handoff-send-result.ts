import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";

export const EXTERNAL_MIND_HANDOFF_SEND_RESULTS = [
  "test_sink_sent",
  "send_disabled",
  "missing_config",
  "already_sent",
  "handoff_not_ready",
  "external_send_failed",
  "external_sent",
  "external_dry_run_ok",
  "external_config_invalid",
] as const;

export type ExternalMindHandoffSendResultCode =
  (typeof EXTERNAL_MIND_HANDOFF_SEND_RESULTS)[number];

export type PrivacySafeExternalMindHandoffSendResult = {
  result: ExternalMindHandoffSendResultCode;
  destination: ExternalMindHandoffDestination | string;
  payload_version: string;
  timestamp: string;
  test_sink_only?: boolean;
  http_status?: number;
  /**
   * HelloMinds conversation alias used for subsequent read-only history retrieval (Phase 41B).
   * This is not a secret; do not store access keys or raw API responses here.
   */
  conversation_alias?: string;
};

export function buildPrivacySafeSendResult(input: {
  result: ExternalMindHandoffSendResultCode;
  destination: ExternalMindHandoffDestination | string;
  payload_version: string;
  timestamp?: string;
  test_sink_only?: boolean;
  http_status?: number;
  conversation_alias?: string;
}): PrivacySafeExternalMindHandoffSendResult {
  return {
    result: input.result,
    destination: input.destination,
    payload_version: input.payload_version,
    timestamp: input.timestamp ?? new Date().toISOString(),
    ...(input.test_sink_only ? { test_sink_only: true } : {}),
    ...(typeof input.http_status === "number" ? { http_status: input.http_status } : {}),
    ...(typeof input.conversation_alias === "string" && input.conversation_alias.trim()
      ? { conversation_alias: input.conversation_alias.trim() }
      : {}),
  };
}

export function isPrivacySafeExternalMindHandoffSendResult(
  value: unknown
): value is PrivacySafeExternalMindHandoffSendResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.result !== "string" ||
    typeof record.destination !== "string" ||
    typeof record.payload_version !== "string" ||
    typeof record.timestamp !== "string"
  ) {
    return false;
  }

  if (!(EXTERNAL_MIND_HANDOFF_SEND_RESULTS as readonly string[]).includes(record.result)) {
    return false;
  }

  if ("http_status" in record && typeof record.http_status !== "number") {
    return false;
  }

  if ("test_sink_only" in record && typeof record.test_sink_only !== "boolean") {
    return false;
  }

  if ("conversation_alias" in record && typeof record.conversation_alias !== "string") {
    return false;
  }

  return true;
}

export function externalMindHandoffSendErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "external_mind_handoffs_table_missing":
      return "The external_mind_handoffs table is missing. Apply the Phase 31 migration in Supabase.";
    case "forbidden":
      return "You do not have access to send handoffs in this workspace.";
    case "handoff_not_found":
      return "External Mind handoff not found.";
    case "required_fields_missing":
      return "Required handoff fields are missing.";
    case "handoff_not_ready":
      return "Only ready handoffs can be sent.";
    case "not_approved":
      return "This handoff must be approved by an operator before it can be sent.";
    case "already_sent":
      return "This handoff has already been sent.";
    case "unsupported_handoff_destination":
      return "This handoff destination cannot be sent yet.";
    case "send_disabled":
      return "External Mind send is disabled. Test sink sends are available for ready test_sink handoffs.";
    case "missing_config":
      return "External Mind send is enabled but endpoint or API key configuration is missing.";
    case "external_dry_run_ok":
      return "External Mind dry-run passed. No payload was sent. Set EXTERNAL_MIND_LIVE_SEND=true for live delivery.";
    case "external_config_invalid":
      return "External Mind send configuration is invalid. No payload was sent.";
    case "external_send_failed":
      return "External Mind send failed. The handoff was not marked as sent.";
    case "send_result_not_privacy_safe":
      return "Send completed but the stored send result failed privacy validation.";
    default:
      return `Unable to send Mind handoff: ${error}`;
  }
}

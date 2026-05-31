export const EXTERNAL_MIND_HANDOFF_SEND_EVENT_TYPES = [
  "send_attempted",
  "send_succeeded",
  "send_failed",
  "send_blocked",
  "send_already_sent",
] as const;

export type ExternalMindHandoffSendEventType =
  (typeof EXTERNAL_MIND_HANDOFF_SEND_EVENT_TYPES)[number];

export const EXTERNAL_MIND_HANDOFF_SEND_EVENT_RESULTS = [
  "test_sink_sent",
  "send_disabled",
  "missing_config",
  "already_sent",
  "invalid_status",
  "unauthorized",
  "failed",
  "external_sent",
  "external_send_failed",
  "not_approved",
] as const;

export type ExternalMindHandoffSendEventResult =
  (typeof EXTERNAL_MIND_HANDOFF_SEND_EVENT_RESULTS)[number];

export const EXTERNAL_MIND_HANDOFF_SEND_ACTOR_TYPES = [
  "supabase_operator",
  "break_glass",
  "system",
] as const;

export type ExternalMindHandoffSendActorType =
  (typeof EXTERNAL_MIND_HANDOFF_SEND_ACTOR_TYPES)[number];

export const EXTERNAL_MIND_HANDOFF_SEND_ACCESS_MODES = [
  "supabase_operator",
  "break_glass",
  "system",
] as const;

export type ExternalMindHandoffSendAccessMode =
  (typeof EXTERNAL_MIND_HANDOFF_SEND_ACCESS_MODES)[number];

export function isSupportedExternalMindHandoffSendEventType(
  value: string
): value is ExternalMindHandoffSendEventType {
  return (EXTERNAL_MIND_HANDOFF_SEND_EVENT_TYPES as readonly string[]).includes(value);
}

export function isSupportedExternalMindHandoffSendEventResult(
  value: string
): value is ExternalMindHandoffSendEventResult {
  return (EXTERNAL_MIND_HANDOFF_SEND_EVENT_RESULTS as readonly string[]).includes(value);
}

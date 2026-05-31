import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import type {
  ExternalMindHandoffSendAccessMode,
  ExternalMindHandoffSendActorType,
  ExternalMindHandoffSendEventResult,
  ExternalMindHandoffSendEventType,
} from "@/lib/review/external-mind-handoff-send-event-constants";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import type { PrivacySafeExternalMindHandoffWithPayload } from "@/lib/watch/external-mind-handoff-store";
import {
  insertExternalMindHandoffSendEvent,
  type PrivacySafeExternalMindHandoffSendEvent,
} from "@/lib/watch/external-mind-handoff-send-event-store";

export type ExternalMindHandoffSendAuditContext = {
  access: ReviewQueueAccessContext;
  operatorEmail?: string | null;
};

export function mapSendAccessToAuditFields(access: ReviewQueueAccessContext): {
  access_mode: ExternalMindHandoffSendAccessMode;
  actor_type: ExternalMindHandoffSendActorType;
  actor_email: string | null;
} {
  if (access.mode === "break_glass") {
    return {
      access_mode: "break_glass",
      actor_type: "break_glass",
      actor_email: null,
    };
  }

  return {
    access_mode: "supabase_operator",
    actor_type: "supabase_operator",
    actor_email: null,
  };
}

function buildActorEmail(
  access: ReviewQueueAccessContext,
  operatorEmail?: string | null
): string | null {
  if (access.mode === "break_glass") {
    return null;
  }

  return sanitizeOperatorEmail(operatorEmail);
}

function buildPrivacySafeMetadata(input: {
  transportKind?: string;
  httpStatus?: number;
}): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {};

  if (input.transportKind) {
    metadata.transport_kind = input.transportKind;
  }

  if (typeof input.httpStatus === "number") {
    metadata.http_status = input.httpStatus;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

async function writeSendEvent(input: {
  handoff: Pick<
    PrivacySafeExternalMindHandoffWithPayload,
    "id" | "workspace_id" | "digest_id" | "destination" | "payload_version" | "status"
  >;
  audit: ExternalMindHandoffSendAuditContext;
  eventType: ExternalMindHandoffSendEventType;
  result?: ExternalMindHandoffSendEventResult | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
  errorMessage?: string | null;
  attemptedAt?: string;
  completedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<PrivacySafeExternalMindHandoffSendEvent | null> {
  const auditFields = mapSendAccessToAuditFields(input.audit.access);
  const attemptedAt = input.attemptedAt ?? new Date().toISOString();

  const insertResult = await insertExternalMindHandoffSendEvent({
    workspace_id: input.handoff.workspace_id,
    handoff_id: input.handoff.id,
    digest_id: input.handoff.digest_id,
    event_type: input.eventType,
    destination: input.handoff.destination,
    payload_version: input.handoff.payload_version,
    actor_type: auditFields.actor_type,
    actor_email: buildActorEmail(input.audit.access, input.audit.operatorEmail),
    access_mode: auditFields.access_mode,
    result: input.result ?? null,
    status_before: input.statusBefore ?? input.handoff.status,
    status_after: input.statusAfter ?? null,
    attempted_at: attemptedAt,
    completed_at: input.completedAt ?? attemptedAt,
    error_message: input.errorMessage ?? null,
    metadata: input.metadata ?? null,
  });

  return insertResult.ok ? insertResult.event : null;
}

export async function recordExternalMindHandoffSendAttempted(
  handoff: Pick<
    PrivacySafeExternalMindHandoffWithPayload,
    "id" | "workspace_id" | "digest_id" | "destination" | "payload_version" | "status"
  >,
  audit: ExternalMindHandoffSendAuditContext
): Promise<void> {
  await writeSendEvent({
    handoff,
    audit,
    eventType: "send_attempted",
    result: null,
    statusBefore: handoff.status,
    statusAfter: null,
    completedAt: null,
  });
}

export async function recordExternalMindHandoffSendOutcome(input: {
  handoff: Pick<
    PrivacySafeExternalMindHandoffWithPayload,
    "id" | "workspace_id" | "digest_id" | "destination" | "payload_version" | "status"
  >;
  audit: ExternalMindHandoffSendAuditContext;
  eventType: Exclude<ExternalMindHandoffSendEventType, "send_attempted">;
  result: ExternalMindHandoffSendEventResult;
  statusBefore: string;
  statusAfter: string | null;
  errorMessage?: string | null;
  attemptedAt?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await writeSendEvent({
    handoff: input.handoff,
    audit: input.audit,
    eventType: input.eventType,
    result: input.result,
    statusBefore: input.statusBefore,
    statusAfter: input.statusAfter,
    errorMessage: input.errorMessage ?? null,
    attemptedAt: input.attemptedAt,
    metadata: input.metadata,
  });
}

export function mapSendErrorToEventResult(error: string): ExternalMindHandoffSendEventResult {
  switch (error) {
    case "already_sent":
      return "already_sent";
    case "handoff_not_ready":
      return "invalid_status";
    case "forbidden":
      return "unauthorized";
    case "send_disabled":
      return "send_disabled";
    case "missing_config":
      return "missing_config";
    case "external_send_failed":
      return "external_send_failed";
    default:
      return "failed";
  }
}

export function mapSendErrorToEventType(
  error: string
): Exclude<ExternalMindHandoffSendEventType, "send_attempted" | "send_succeeded"> {
  switch (error) {
    case "already_sent":
      return "send_already_sent";
    case "send_disabled":
    case "handoff_not_ready":
    case "forbidden":
      return "send_blocked";
    default:
      return "send_failed";
  }
}

export { buildPrivacySafeMetadata };

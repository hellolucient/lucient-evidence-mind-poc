import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { isSupportedExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import type { ExternalMindHandoffSendEventResult } from "@/lib/review/external-mind-handoff-send-event-constants";
import {
  externalMindHandoffSendErrorMessage,
  isPrivacySafeExternalMindHandoffSendResult,
  type PrivacySafeExternalMindHandoffSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import {
  buildPrivacySafeMetadata,
  mapSendErrorToEventResult,
  mapSendErrorToEventType,
  recordExternalMindHandoffSendAttempted,
  recordExternalMindHandoffSendOutcome,
  type ExternalMindHandoffSendAuditContext,
} from "@/lib/watch/external-mind-handoff-send-audit";
import { executeExternalMindHandoffTransport } from "@/lib/watch/external-mind-handoff-sender";
import {
  getExternalMindHandoffById,
  recordExternalMindHandoffSendAttempt,
  type PrivacySafeExternalMindHandoffWithPayload,
} from "@/lib/watch/external-mind-handoff-store";

export type SendExternalMindHandoffOptions = {
  operatorEmail?: string | null;
};

export type SendExternalMindHandoffResult =
  | {
      ok: true;
      handoff: PrivacySafeExternalMindHandoffWithPayload;
      sendResult: PrivacySafeExternalMindHandoffSendResult;
    }
  | { ok: false; error: string; message: string; sendResult?: PrivacySafeExternalMindHandoffSendResult };

function buildAuditContext(
  access: ReviewQueueAccessContext,
  options?: SendExternalMindHandoffOptions
): ExternalMindHandoffSendAuditContext {
  return {
    access,
    operatorEmail: options?.operatorEmail ?? null,
  };
}

function mapTransportResultToEventResult(
  result: PrivacySafeExternalMindHandoffSendResult["result"]
): ExternalMindHandoffSendEventResult {
  if (result === "handoff_not_ready") {
    return "invalid_status";
  }

  return result as ExternalMindHandoffSendEventResult;
}

async function recordBlockedSendOutcome(input: {
  handoff: PrivacySafeExternalMindHandoffWithPayload;
  audit: ExternalMindHandoffSendAuditContext;
  error: string;
  statusBefore: string;
}): Promise<void> {
  await recordExternalMindHandoffSendAttempted(input.handoff, input.audit);
  await recordExternalMindHandoffSendOutcome({
    handoff: input.handoff,
    audit: input.audit,
    eventType: mapSendErrorToEventType(input.error),
    result: mapSendErrorToEventResult(input.error),
    statusBefore: input.statusBefore,
    statusAfter: input.handoff.status,
    errorMessage: input.error,
  });
}

export async function sendExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext,
  options?: SendExternalMindHandoffOptions
): Promise<SendExternalMindHandoffResult> {
  const audit = buildAuditContext(access, options);
  const lookup = await getExternalMindHandoffById(handoffId, access);

  if (lookup.error === "forbidden") {
    return {
      ok: false,
      error: "forbidden",
      message: externalMindHandoffSendErrorMessage("forbidden"),
    };
  }

  if (!lookup.handoff) {
    return {
      ok: false,
      error: "handoff_not_found",
      message: externalMindHandoffSendErrorMessage("handoff_not_found"),
    };
  }

  const handoff = lookup.handoff;
  const statusBefore = handoff.status;

  if (handoff.status === "sent") {
    await recordBlockedSendOutcome({
      handoff,
      audit,
      error: "already_sent",
      statusBefore,
    });

    return {
      ok: false,
      error: "already_sent",
      message: externalMindHandoffSendErrorMessage("already_sent"),
      sendResult: handoff.send_result_json ?? undefined,
    };
  }

  if (handoff.status !== "ready") {
    await recordBlockedSendOutcome({
      handoff,
      audit,
      error: "handoff_not_ready",
      statusBefore,
    });

    return {
      ok: false,
      error: "handoff_not_ready",
      message: externalMindHandoffSendErrorMessage("handoff_not_ready"),
    };
  }

  if (handoff.review_status !== "approved") {
    await recordBlockedSendOutcome({
      handoff,
      audit,
      error: "not_approved",
      statusBefore,
    });

    return {
      ok: false,
      error: "not_approved",
      message: externalMindHandoffSendErrorMessage("not_approved"),
    };
  }

  if (!handoff.payload_json) {
    await recordBlockedSendOutcome({
      handoff,
      audit,
      error: "required_fields_missing",
      statusBefore,
    });

    return {
      ok: false,
      error: "required_fields_missing",
      message: externalMindHandoffSendErrorMessage("required_fields_missing"),
    };
  }

  if (!isSupportedExternalMindHandoffDestination(handoff.destination)) {
    await recordBlockedSendOutcome({
      handoff,
      audit,
      error: "unsupported_handoff_destination",
      statusBefore,
    });

    return {
      ok: false,
      error: "unsupported_handoff_destination",
      message: externalMindHandoffSendErrorMessage("unsupported_handoff_destination"),
    };
  }

  await recordExternalMindHandoffSendAttempted(handoff, audit);

  const transport = await executeExternalMindHandoffTransport({
    handoffId: handoff.id,
    destination: handoff.destination,
    payloadVersion: handoff.payload_version,
    payloadJson: handoff.payload_json,
  });

  if (transport.kind === "blocked") {
    const recordResult = await recordExternalMindHandoffSendAttempt(
      handoff.id,
      access,
      {
        status: "ready",
        send_attempted_at: transport.sendResult.timestamp,
        send_result_json: transport.sendResult,
        error_message: null,
      }
    );

    await recordExternalMindHandoffSendOutcome({
      handoff,
      audit,
      eventType: "send_blocked",
      result: mapTransportResultToEventResult(transport.sendResult.result),
      statusBefore,
      statusAfter: "ready",
      errorMessage: transport.error,
      attemptedAt: transport.sendResult.timestamp,
      metadata: buildPrivacySafeMetadata({ transportKind: transport.kind }),
    });

    if (!recordResult.ok) {
      return {
        ok: false,
        error: recordResult.error,
        message: externalMindHandoffSendErrorMessage(recordResult.error),
        sendResult: transport.sendResult,
      };
    }

    return {
      ok: false,
      error: transport.error,
      message: externalMindHandoffSendErrorMessage(transport.error),
      sendResult: transport.sendResult,
    };
  }

  if (transport.kind === "failed") {
    const recordResult = await recordExternalMindHandoffSendAttempt(handoff.id, access, {
      status: "failed",
      send_attempted_at: transport.sendResult.timestamp,
      send_result_json: transport.sendResult,
      error_message: transport.errorMessage,
    });

    await recordExternalMindHandoffSendOutcome({
      handoff,
      audit,
      eventType: "send_failed",
      result: mapTransportResultToEventResult(transport.sendResult.result),
      statusBefore,
      statusAfter: "failed",
      errorMessage: transport.errorMessage,
      attemptedAt: transport.sendResult.timestamp,
      metadata: buildPrivacySafeMetadata({
        transportKind: transport.kind,
        httpStatus: transport.sendResult.http_status,
      }),
    });

    if (!recordResult.ok) {
      return {
        ok: false,
        error: recordResult.error,
        message: externalMindHandoffSendErrorMessage(recordResult.error),
        sendResult: transport.sendResult,
      };
    }

    return {
      ok: false,
      error: transport.error,
      message: externalMindHandoffSendErrorMessage(transport.error),
      sendResult: transport.sendResult,
    };
  }

  const recordResult = await recordExternalMindHandoffSendAttempt(handoff.id, access, {
    status: "sent",
    sent_at: transport.sentAt,
    send_attempted_at: transport.sendResult.timestamp,
    send_result_json: transport.sendResult,
    error_message: null,
  });

  if (!recordResult.ok) {
    await recordExternalMindHandoffSendOutcome({
      handoff,
      audit,
      eventType: "send_failed",
      result: "failed",
      statusBefore,
      statusAfter: statusBefore,
      errorMessage: recordResult.error,
      attemptedAt: transport.sendResult.timestamp,
    });

    return {
      ok: false,
      error: recordResult.error,
      message: externalMindHandoffSendErrorMessage(recordResult.error),
      sendResult: transport.sendResult,
    };
  }

  if (
    !recordResult.handoff.send_result_json ||
    !isPrivacySafeExternalMindHandoffSendResult(recordResult.handoff.send_result_json)
  ) {
    await recordExternalMindHandoffSendOutcome({
      handoff,
      audit,
      eventType: "send_failed",
      result: "failed",
      statusBefore,
      statusAfter: recordResult.handoff.status,
      errorMessage: "send_result_not_privacy_safe",
      attemptedAt: transport.sendResult.timestamp,
    });

    return {
      ok: false,
      error: "send_result_not_privacy_safe",
      message: externalMindHandoffSendErrorMessage("send_result_not_privacy_safe"),
    };
  }

  await recordExternalMindHandoffSendOutcome({
    handoff,
    audit,
    eventType: "send_succeeded",
    result: mapTransportResultToEventResult(transport.sendResult.result),
    statusBefore,
    statusAfter: "sent",
    attemptedAt: transport.sendResult.timestamp,
    metadata: buildPrivacySafeMetadata({
      transportKind: transport.kind,
      httpStatus: transport.sendResult.http_status,
    }),
  });

  return {
    ok: true,
    handoff: recordResult.handoff,
    sendResult: recordResult.handoff.send_result_json,
  };
}

export { externalMindHandoffSendErrorMessage };

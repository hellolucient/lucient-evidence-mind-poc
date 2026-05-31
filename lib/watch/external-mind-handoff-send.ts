import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { isSupportedExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import {
  externalMindHandoffSendErrorMessage,
  isPrivacySafeExternalMindHandoffSendResult,
  type PrivacySafeExternalMindHandoffSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import { executeExternalMindHandoffTransport } from "@/lib/watch/external-mind-handoff-sender";
import {
  getExternalMindHandoffById,
  recordExternalMindHandoffSendAttempt,
  type PrivacySafeExternalMindHandoffWithPayload,
} from "@/lib/watch/external-mind-handoff-store";

export type SendExternalMindHandoffResult =
  | {
      ok: true;
      handoff: PrivacySafeExternalMindHandoffWithPayload;
      sendResult: PrivacySafeExternalMindHandoffSendResult;
    }
  | { ok: false; error: string; message: string; sendResult?: PrivacySafeExternalMindHandoffSendResult };

export async function sendExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<SendExternalMindHandoffResult> {
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

  if (handoff.status === "sent") {
    return {
      ok: false,
      error: "already_sent",
      message: externalMindHandoffSendErrorMessage("already_sent"),
      sendResult: handoff.send_result_json ?? undefined,
    };
  }

  if (handoff.status !== "ready") {
    return {
      ok: false,
      error: "handoff_not_ready",
      message: externalMindHandoffSendErrorMessage("handoff_not_ready"),
    };
  }

  if (!handoff.payload_json) {
    return {
      ok: false,
      error: "required_fields_missing",
      message: externalMindHandoffSendErrorMessage("required_fields_missing"),
    };
  }

  if (!isSupportedExternalMindHandoffDestination(handoff.destination)) {
    return {
      ok: false,
      error: "unsupported_handoff_destination",
      message: externalMindHandoffSendErrorMessage("unsupported_handoff_destination"),
    };
  }

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
    return {
      ok: false,
      error: "send_result_not_privacy_safe",
      message: externalMindHandoffSendErrorMessage("send_result_not_privacy_safe"),
    };
  }

  return {
    ok: true,
    handoff: recordResult.handoff,
    sendResult: recordResult.handoff.send_result_json,
  };
}

export { externalMindHandoffSendErrorMessage };

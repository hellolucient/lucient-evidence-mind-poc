import {
  buildPrivacySafeSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import type { MindDigestHandoffPayloadV1 } from "@/lib/watch/external-mind-handoff-payload-builder";
import { buildPrivacySafeHelloMindsMessageText } from "@/lib/watch/external-mind-handoff-message-text";
import { buildHelloMindsConversationAlias } from "@/lib/watch/external-mind-hellominds-conversation-alias";
import {
  describeHelloMindsSendReadiness,
  getHelloMindsBaseUrlHost,
} from "@/lib/watch/external-mind-hellominds-send-config";
import { isExternalMindSendEnabled } from "@/lib/watch/external-mind-handoff-send-config";
import type {
  ExternalMindHandoffTransportMetadata,
  ExternalMindHandoffTransportOutcome,
} from "@/lib/watch/external-mind-handoff-sender";

const DRY_RUN_SUCCESS_MESSAGE =
  "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery.";

const LIVE_NOT_IMPLEMENTED_MESSAGE =
  "HelloMinds live send is not available in this release.";

export type HelloMindsTransportInput = {
  handoffId: string;
  destination: "hellominds";
  payloadVersion: string;
  payloadJson: unknown;
  timestamp: string;
};

function buildHelloMindsEndpointHostMetadata(): Pick<
  ExternalMindHandoffTransportMetadata,
  "endpoint_host"
> {
  const endpointHost = getHelloMindsBaseUrlHost();
  return endpointHost ? { endpoint_host: endpointHost } : {};
}

function buildHelloMindsConfigFailureOutcome(input: {
  payloadVersion: string;
  timestamp: string;
}): ExternalMindHandoffTransportOutcome {
  return {
    kind: "blocked",
    error: "send_disabled",
    errorMessage: "external_config_invalid",
    metadata: {
      transport_mode: "blocked",
      error_class: "config",
      provider: "hellominds",
      ...buildHelloMindsEndpointHostMetadata(),
    },
    sendResult: buildPrivacySafeSendResult({
      result: "external_config_invalid",
      destination: "hellominds",
      payload_version: input.payloadVersion,
      timestamp: input.timestamp,
    }),
  };
}

function isMindDigestHandoffPayload(payloadJson: unknown): payloadJson is MindDigestHandoffPayloadV1 {
  if (!payloadJson || typeof payloadJson !== "object") {
    return false;
  }

  const record = payloadJson as Record<string, unknown>;
  return (
    record.payload_version === "mind_digest_payload_v1" &&
    typeof record.handoff_type === "string" &&
    typeof record.period_start === "string" &&
    typeof record.period_end === "string"
  );
}

/**
 * HelloMinds messaging transport (Phase 39D: dry-run only; no live fetch).
 */
export async function executeHelloMindsTransport(
  input: HelloMindsTransportInput
): Promise<ExternalMindHandoffTransportOutcome> {
  const { payloadVersion, timestamp } = input;

  if (!isExternalMindSendEnabled()) {
    return {
      kind: "blocked",
      error: "send_disabled",
      metadata: {
        transport_mode: "blocked",
        provider: "hellominds",
      },
      sendResult: buildPrivacySafeSendResult({
        result: "send_disabled",
        destination: "hellominds",
        payload_version: payloadVersion,
        timestamp,
      }),
    };
  }

  const readiness = describeHelloMindsSendReadiness();

  if (
    !readiness.baseUrlConfigured ||
    !readiness.accessKeyConfigured ||
    !readiness.targetMindIdConfigured
  ) {
    return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
  }

  if (!readiness.endpointHostConfigured) {
    return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
  }

  if (!isMindDigestHandoffPayload(input.payloadJson)) {
    return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
  }

  const messageText = buildPrivacySafeHelloMindsMessageText(input.payloadJson);
  if (!messageText) {
    return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
  }

  const conversationAlias = buildHelloMindsConversationAlias(input.handoffId);

  if (readiness.dryRunOnly) {
    return {
      kind: "blocked",
      error: "send_disabled",
      errorMessage: DRY_RUN_SUCCESS_MESSAGE,
      metadata: {
        transport_mode: "dry_run",
        dry_run_only: true,
        provider: "hellominds",
        message_text_char_count: messageText.length,
        conversation_alias_length: conversationAlias.length,
        ...buildHelloMindsEndpointHostMetadata(),
      },
      sendResult: buildPrivacySafeSendResult({
        result: "external_dry_run_ok",
        destination: "hellominds",
        payload_version: payloadVersion,
        timestamp,
      }),
    };
  }

  if (readiness.readyForLiveExternalSend) {
    return {
      kind: "blocked",
      error: "send_disabled",
      errorMessage: LIVE_NOT_IMPLEMENTED_MESSAGE,
      metadata: {
        transport_mode: "blocked",
        error_class: "config",
        provider: "hellominds",
        ...buildHelloMindsEndpointHostMetadata(),
      },
      sendResult: buildPrivacySafeSendResult({
        result: "external_config_invalid",
        destination: "hellominds",
        payload_version: payloadVersion,
        timestamp,
      }),
    };
  }

  return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
}

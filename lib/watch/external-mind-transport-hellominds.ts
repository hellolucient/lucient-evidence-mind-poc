import {
  buildPrivacySafeSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import type { MindDigestHandoffPayloadV1 } from "@/lib/watch/external-mind-handoff-payload-builder";
import { buildPrivacySafeHelloMindsMessageText } from "@/lib/watch/external-mind-handoff-message-text";
import { buildHelloMindsConversationAlias } from "@/lib/watch/external-mind-hellominds-conversation-alias";
import {
  describeHelloMindsSendReadiness,
  getHelloMindsAccessKey,
  getHelloMindsBaseUrl,
  getHelloMindsBaseUrlHost,
  getHelloMindsTargetMindId,
} from "@/lib/watch/external-mind-hellominds-send-config";
import { isExternalMindSendEnabled } from "@/lib/watch/external-mind-handoff-send-config";
import type {
  ExternalMindHandoffTransportMetadata,
  ExternalMindHandoffTransportOutcome,
} from "@/lib/watch/external-mind-handoff-sender";

const DRY_RUN_SUCCESS_MESSAGE =
  "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery.";

const PRIVACY_SAFE_ID_SUFFIX_LENGTH = 4;

export type HelloMindsTransportInput = {
  handoffId: string;
  destination: "hellominds";
  payloadVersion: string;
  payloadJson: unknown;
  timestamp: string;
};

type HelloMindsPostResult =
  | {
      ok: true;
      httpStatus: number;
      conversationId?: string;
      messageId?: string;
      artifactCount?: number;
    }
  | { ok: false; httpStatus?: number; errorClass: "http" | "timeout" | "network" };

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

export function privacySafeHelloMindsIdSuffix(
  id: string | undefined,
  length = PRIVACY_SAFE_ID_SUFFIX_LENGTH
): string | undefined {
  if (!id) {
    return undefined;
  }

  const trimmed = id.trim();
  if (trimmed.length < length) {
    return undefined;
  }

  return trimmed.slice(-length);
}

function buildHelloMindsLiveFailureOutcome(input: {
  payloadVersion: string;
  timestamp: string;
  timeoutMs: number;
  response: Extract<HelloMindsPostResult, { ok: false }>;
}): ExternalMindHandoffTransportOutcome {
  return {
    kind: "failed",
    error: "external_send_failed",
    errorMessage: "external_send_failed",
    metadata: {
      transport_mode: "live",
      provider: "hellominds",
      error_class: input.response.errorClass,
      timeout_ms: input.timeoutMs,
      ...buildHelloMindsEndpointHostMetadata(),
      ...(typeof input.response.httpStatus === "number"
        ? { http_status: input.response.httpStatus }
        : {}),
    },
    sendResult: buildPrivacySafeSendResult({
      result: "external_send_failed",
      destination: "hellominds",
      payload_version: input.payloadVersion,
      timestamp: input.timestamp,
      ...(typeof input.response.httpStatus === "number"
        ? { http_status: input.response.httpStatus }
        : {}),
    }),
  };
}

async function postHelloMindsJson(input: {
  url: string;
  accessKey: string;
  body: Record<string, unknown>;
  timeoutMs: number;
}): Promise<HelloMindsPostResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(input.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Access-Key": input.accessKey,
      },
      body: JSON.stringify(input.body),
    });

    if (!response.ok) {
      return { ok: false, httpStatus: response.status, errorClass: "http" };
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return { ok: false, httpStatus: response.status, errorClass: "http" };
    }

    if (!parsed || typeof parsed !== "object") {
      return { ok: false, httpStatus: response.status, errorClass: "http" };
    }

    const record = parsed as Record<string, unknown>;
    const conversationId =
      typeof record.conversationId === "string" ? record.conversationId : undefined;
    const messageId = typeof record.messageId === "string" ? record.messageId : undefined;
    const artifactCount = Array.isArray(record.artifactIds) ? record.artifactIds.length : undefined;

    return {
      ok: true,
      httpStatus: response.status,
      conversationId,
      messageId,
      artifactCount,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, errorClass: "timeout" };
    }

    return { ok: false, errorClass: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * HelloMinds messaging transport (Phase 39E1: live fetch behind readyForLiveExternalSend).
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

  if (!readiness.readyForLiveExternalSend) {
    return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
  }

  const baseUrl = getHelloMindsBaseUrl();
  const accessKey = getHelloMindsAccessKey();
  const targetMindId = getHelloMindsTargetMindId();
  const timeoutMs = readiness.timeoutMs;

  if (!baseUrl || !accessKey || !targetMindId) {
    return buildHelloMindsConfigFailureOutcome({ payloadVersion, timestamp });
  }

  const conversationResponse = await postHelloMindsJson({
    url: `${baseUrl.replace(/\/$/, "")}/v1/messaging/conversation`,
    accessKey,
    body: {
      alias: conversationAlias,
      mindId: targetMindId,
    },
    timeoutMs,
  });

  if (!conversationResponse.ok) {
    return buildHelloMindsLiveFailureOutcome({
      payloadVersion,
      timestamp,
      timeoutMs,
      response: conversationResponse,
    });
  }

  const messageResponse = await postHelloMindsJson({
    url: `${baseUrl.replace(/\/$/, "")}/v1/messaging/message`,
    accessKey,
    body: {
      alias: conversationAlias,
      messageText,
      attachments: [],
    },
    timeoutMs,
  });

  if (!messageResponse.ok) {
    return buildHelloMindsLiveFailureOutcome({
      payloadVersion,
      timestamp,
      timeoutMs,
      response: messageResponse,
    });
  }

  const conversationIdSuffix =
    privacySafeHelloMindsIdSuffix(messageResponse.conversationId) ??
    privacySafeHelloMindsIdSuffix(conversationResponse.conversationId);
  const messageIdSuffix = privacySafeHelloMindsIdSuffix(messageResponse.messageId);

  return {
    kind: "sent",
    sentAt: timestamp,
    metadata: {
      transport_mode: "live",
      provider: "hellominds",
      http_status: messageResponse.httpStatus,
      timeout_ms: timeoutMs,
      ...buildHelloMindsEndpointHostMetadata(),
      ...(typeof messageResponse.artifactCount === "number"
        ? { artifact_count: messageResponse.artifactCount }
        : {}),
      ...(conversationIdSuffix ? { conversation_id_suffix: conversationIdSuffix } : {}),
      ...(messageIdSuffix ? { message_id_suffix: messageIdSuffix } : {}),
    },
    sendResult: buildPrivacySafeSendResult({
      result: "external_sent",
      destination: "hellominds",
      payload_version: payloadVersion,
      timestamp,
      http_status: messageResponse.httpStatus,
    }),
  };
}

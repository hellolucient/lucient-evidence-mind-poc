import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import {
  buildPrivacySafeSendResult,
  type PrivacySafeExternalMindHandoffSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import {
  describeExternalMindSendReadiness,
  getExternalMindApiKey,
  getExternalMindEndpointHost,
  getExternalMindEndpointUrl,
  isExternalMindSendEnabled,
} from "@/lib/watch/external-mind-handoff-send-config";
import type {
  ExternalMindHandoffTransportMetadata,
  ExternalMindHandoffTransportOutcome,
} from "@/lib/watch/external-mind-handoff-sender";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const DRY_RUN_SUCCESS_MESSAGE =
  "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery.";

export type GenericHttpTransportInput = {
  handoffId: string;
  destination: ExternalMindHandoffDestination;
  payloadVersion: string;
  payloadJson: unknown;
  timestamp: string;
};

type ExternalMindPostResult =
  | { ok: true; httpStatus: number }
  | { ok: false; httpStatus?: number; errorClass: "http" | "timeout" | "network" };

function buildEndpointHostMetadata(): Pick<ExternalMindHandoffTransportMetadata, "endpoint_host"> {
  const endpointHost = getExternalMindEndpointHost();
  return endpointHost ? { endpoint_host: endpointHost } : {};
}

function buildConfigFailureOutcome(input: {
  destination: ExternalMindHandoffDestination;
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
      ...buildEndpointHostMetadata(),
    },
    sendResult: buildPrivacySafeSendResult({
      result: "external_config_invalid",
      destination: input.destination,
      payload_version: input.payloadVersion,
      timestamp: input.timestamp,
    }),
  };
}

async function postToExternalMindEndpoint(input: {
  endpointUrl: string;
  apiKey: string;
  handoffId: string;
  destination: ExternalMindHandoffDestination;
  payloadVersion: string;
  payloadJson: unknown;
  sentAt: string;
  timeoutMs: number;
}): Promise<ExternalMindPostResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(input.endpointUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
        "X-Evidence-Mind-Handoff-Id": input.handoffId,
        "X-Evidence-Mind-Payload-Version": input.payloadVersion,
        "X-Evidence-Mind-Destination": input.destination,
        "X-Evidence-Mind-Sent-At": input.sentAt,
        "User-Agent": `lucient-evidence-mind/${CURRENT_WATCH_PHASE}`,
      },
      body: JSON.stringify(input.payloadJson),
    });

    if (!response.ok) {
      return { ok: false, httpStatus: response.status, errorClass: "http" };
    }

    return { ok: true, httpStatus: response.status };
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
 * Generic HTTPS POST transport for animoca_mind and internal_export destinations.
 */
export async function executeGenericHttpTransport(
  input: GenericHttpTransportInput
): Promise<ExternalMindHandoffTransportOutcome> {
  const { destination, payloadVersion, timestamp } = input;

  if (!isExternalMindSendEnabled()) {
    return {
      kind: "blocked",
      error: "send_disabled",
      metadata: {
        transport_mode: "blocked",
      },
      sendResult: buildPrivacySafeSendResult({
        result: "send_disabled",
        destination,
        payload_version: payloadVersion,
        timestamp,
      }),
    };
  }

  const readiness = describeExternalMindSendReadiness();

  if (!readiness.endpointConfigured || !readiness.apiKeyConfigured) {
    return buildConfigFailureOutcome({ destination, payloadVersion, timestamp });
  }

  if (!readiness.endpointHostConfigured) {
    return buildConfigFailureOutcome({ destination, payloadVersion, timestamp });
  }

  if (readiness.dryRunOnly) {
    return {
      kind: "blocked",
      error: "send_disabled",
      errorMessage: DRY_RUN_SUCCESS_MESSAGE,
      metadata: {
        transport_mode: "dry_run",
        dry_run_only: true,
        ...buildEndpointHostMetadata(),
      },
      sendResult: buildPrivacySafeSendResult({
        result: "external_dry_run_ok",
        destination,
        payload_version: payloadVersion,
        timestamp,
      }),
    };
  }

  if (!readiness.readyForLiveExternalSend) {
    return buildConfigFailureOutcome({ destination, payloadVersion, timestamp });
  }

  const endpointUrl = getExternalMindEndpointUrl();
  const apiKey = getExternalMindApiKey();
  const timeoutMs = readiness.timeoutMs;

  if (!endpointUrl || !apiKey) {
    return buildConfigFailureOutcome({ destination, payloadVersion, timestamp });
  }

  const response = await postToExternalMindEndpoint({
    endpointUrl,
    apiKey,
    handoffId: input.handoffId,
    destination,
    payloadVersion,
    payloadJson: input.payloadJson,
    sentAt: timestamp,
    timeoutMs,
  });

  const endpointHostMetadata = buildEndpointHostMetadata();

  if (!response.ok) {
    return {
      kind: "failed",
      error: "external_send_failed",
      errorMessage: "external_send_failed",
      metadata: {
        transport_mode: "live",
        error_class: response.errorClass,
        timeout_ms: timeoutMs,
        ...endpointHostMetadata,
        ...(typeof response.httpStatus === "number" ? { http_status: response.httpStatus } : {}),
      },
      sendResult: buildPrivacySafeSendResult({
        result: "external_send_failed",
        destination,
        payload_version: payloadVersion,
        timestamp,
        ...(typeof response.httpStatus === "number" ? { http_status: response.httpStatus } : {}),
      }),
    };
  }

  return {
    kind: "sent",
    sentAt: timestamp,
    metadata: {
      transport_mode: "live",
      timeout_ms: timeoutMs,
      http_status: response.httpStatus,
      ...endpointHostMetadata,
    },
    sendResult: buildPrivacySafeSendResult({
      result: "external_sent",
      destination,
      payload_version: payloadVersion,
      timestamp,
      http_status: response.httpStatus,
    }),
  };
}

export type { PrivacySafeExternalMindHandoffSendResult };

import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import {
  buildPrivacySafeSendResult,
  type PrivacySafeExternalMindHandoffSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import {
  getExternalMindApiKey,
  getExternalMindEndpointUrl,
  isExternalMindSendEnabled,
} from "@/lib/watch/external-mind-handoff-send-config";

export type ExternalMindHandoffTransportInput = {
  handoffId: string;
  destination: ExternalMindHandoffDestination;
  payloadVersion: string;
  payloadJson: unknown;
};

export type ExternalMindHandoffTransportOutcome =
  | {
      kind: "sent";
      sendResult: PrivacySafeExternalMindHandoffSendResult;
      sentAt: string;
    }
  | {
      kind: "blocked";
      sendResult: PrivacySafeExternalMindHandoffSendResult;
      error: "send_disabled";
    }
  | {
      kind: "failed";
      sendResult: PrivacySafeExternalMindHandoffSendResult;
      error: "missing_config" | "external_send_failed";
      errorMessage: string;
    };

export type ExternalMindHandoffSendResult =
  | { ok: true; sent: false; reason: "external_send_disabled" }
  | { ok: true; sent: true }
  | { ok: false; error: string };

export { isExternalMindSendEnabled };

/**
 * Phase 31 legacy helper retained for handoff creation path.
 * Phase 32 send orchestration uses executeExternalMindHandoffTransport instead.
 */
export async function sendExternalMindHandoffIfEnabled(_input: {
  handoffId: string;
  destination: ExternalMindHandoffDestination;
  payloadVersion: string;
}): Promise<ExternalMindHandoffSendResult> {
  if (!isExternalMindSendEnabled()) {
    return { ok: true, sent: false, reason: "external_send_disabled" };
  }

  return {
    ok: false,
    error: "external_mind_endpoint_not_configured",
  };
}

function isExternalDestination(destination: ExternalMindHandoffDestination): boolean {
  return destination === "animoca_mind" || destination === "internal_export";
}

async function postToExternalMindEndpoint(input: {
  endpointUrl: string;
  apiKey: string;
  payloadJson: unknown;
}): Promise<{ ok: true; httpStatus: number } | { ok: false; httpStatus?: number }> {
  try {
    const response = await fetch(input.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(input.payloadJson),
    });

    if (!response.ok) {
      return { ok: false, httpStatus: response.status };
    }

    return { ok: true, httpStatus: response.status };
  } catch {
    return { ok: false };
  }
}

/**
 * Executes the transport decision for a handoff send attempt.
 * test_sink never performs a network call.
 * External destinations require explicit env enablement and configuration.
 */
export async function executeExternalMindHandoffTransport(
  input: ExternalMindHandoffTransportInput
): Promise<ExternalMindHandoffTransportOutcome> {
  const timestamp = new Date().toISOString();

  if (input.destination === "test_sink") {
    return {
      kind: "sent",
      sentAt: timestamp,
      sendResult: buildPrivacySafeSendResult({
        result: "test_sink_sent",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
        test_sink_only: true,
      }),
    };
  }

  if (!isExternalMindSendEnabled()) {
    return {
      kind: "blocked",
      error: "send_disabled",
      sendResult: buildPrivacySafeSendResult({
        result: "send_disabled",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
      }),
    };
  }

  const endpointUrl = getExternalMindEndpointUrl();
  const apiKey = getExternalMindApiKey();

  if (!endpointUrl || !apiKey) {
    return {
      kind: "failed",
      error: "missing_config",
      errorMessage: "missing_config",
      sendResult: buildPrivacySafeSendResult({
        result: "missing_config",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
      }),
    };
  }

  if (!isExternalDestination(input.destination)) {
    return {
      kind: "blocked",
      error: "send_disabled",
      sendResult: buildPrivacySafeSendResult({
        result: "send_disabled",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
      }),
    };
  }

  const response = await postToExternalMindEndpoint({
    endpointUrl,
    apiKey,
    payloadJson: input.payloadJson,
  });

  if (!response.ok) {
    return {
      kind: "failed",
      error: "external_send_failed",
      errorMessage: "external_send_failed",
      sendResult: buildPrivacySafeSendResult({
        result: "external_send_failed",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
        http_status: response.httpStatus,
      }),
    };
  }

  return {
    kind: "sent",
    sentAt: timestamp,
    sendResult: buildPrivacySafeSendResult({
      result: "external_sent",
      destination: input.destination,
      payload_version: input.payloadVersion,
      timestamp,
      http_status: response.httpStatus,
    }),
  };
}

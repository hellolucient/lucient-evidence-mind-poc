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
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

export type ExternalMindHandoffTransportInput = {
  handoffId: string;
  destination: ExternalMindHandoffDestination;
  payloadVersion: string;
  payloadJson: unknown;
};

export type ExternalMindHandoffTransportMetadata = {
  transport_mode: "test_sink" | "blocked" | "dry_run" | "live";
  error_class?: "config" | "http" | "timeout" | "network";
  endpoint_host?: string;
  timeout_ms?: number;
  dry_run_only?: boolean;
  http_status?: number;
};

export type ExternalMindHandoffTransportOutcome =
  | {
      kind: "sent";
      sendResult: PrivacySafeExternalMindHandoffSendResult;
      sentAt: string;
      metadata?: ExternalMindHandoffTransportMetadata;
    }
  | {
      kind: "blocked";
      sendResult: PrivacySafeExternalMindHandoffSendResult;
      error: "send_disabled";
      errorMessage?: string;
      metadata?: ExternalMindHandoffTransportMetadata;
    }
  | {
      kind: "failed";
      sendResult: PrivacySafeExternalMindHandoffSendResult;
      error: "missing_config" | "external_send_failed";
      errorMessage: string;
      metadata?: ExternalMindHandoffTransportMetadata;
    };

export type ExternalMindHandoffSendResult =
  | { ok: true; sent: false; reason: "external_send_disabled" }
  | { ok: true; sent: true }
  | { ok: false; error: string };

const DRY_RUN_SUCCESS_MESSAGE =
  "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery.";

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

function buildEndpointHostMetadata(): Pick<ExternalMindHandoffTransportMetadata, "endpoint_host"> {
  const endpointHost = getExternalMindEndpointHost();
  return endpointHost ? { endpoint_host: endpointHost } : {};
}

type ExternalMindPostResult =
  | { ok: true; httpStatus: number }
  | { ok: false; httpStatus?: number; errorClass: "http" | "timeout" | "network" };

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
      metadata: {
        transport_mode: "test_sink",
      },
      sendResult: buildPrivacySafeSendResult({
        result: "test_sink_sent",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
        test_sink_only: true,
      }),
    };
  }

  if (!isExternalDestination(input.destination)) {
    return {
      kind: "blocked",
      error: "send_disabled",
      metadata: {
        transport_mode: "blocked",
      },
      sendResult: buildPrivacySafeSendResult({
        result: "send_disabled",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
      }),
    };
  }

  if (!isExternalMindSendEnabled()) {
    return {
      kind: "blocked",
      error: "send_disabled",
      metadata: {
        transport_mode: "blocked",
      },
      sendResult: buildPrivacySafeSendResult({
        result: "send_disabled",
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
      }),
    };
  }

  const readiness = describeExternalMindSendReadiness();

  if (!readiness.endpointConfigured || !readiness.apiKeyConfigured) {
    return buildConfigFailureOutcome({
      destination: input.destination,
      payloadVersion: input.payloadVersion,
      timestamp,
    });
  }

  if (!readiness.endpointHostConfigured) {
    return buildConfigFailureOutcome({
      destination: input.destination,
      payloadVersion: input.payloadVersion,
      timestamp,
    });
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
        destination: input.destination,
        payload_version: input.payloadVersion,
        timestamp,
      }),
    };
  }

  if (!readiness.readyForLiveExternalSend) {
    return buildConfigFailureOutcome({
      destination: input.destination,
      payloadVersion: input.payloadVersion,
      timestamp,
    });
  }

  const endpointUrl = getExternalMindEndpointUrl();
  const apiKey = getExternalMindApiKey();
  const timeoutMs = readiness.timeoutMs;

  if (!endpointUrl || !apiKey) {
    return buildConfigFailureOutcome({
      destination: input.destination,
      payloadVersion: input.payloadVersion,
      timestamp,
    });
  }

  const response = await postToExternalMindEndpoint({
    endpointUrl,
    apiKey,
    handoffId: input.handoffId,
    destination: input.destination,
    payloadVersion: input.payloadVersion,
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
        destination: input.destination,
        payload_version: input.payloadVersion,
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
      destination: input.destination,
      payload_version: input.payloadVersion,
      timestamp,
      http_status: response.httpStatus,
    }),
  };
}

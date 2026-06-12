import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import {
  buildPrivacySafeSendResult,
  type PrivacySafeExternalMindHandoffSendResult,
} from "@/lib/review/external-mind-handoff-send-result";
import { isExternalMindSendEnabled } from "@/lib/watch/external-mind-handoff-send-config";
import { executeGenericHttpTransport } from "@/lib/watch/external-mind-transport-generic-http";
import { executeHelloMindsTransport } from "@/lib/watch/external-mind-transport-hellominds";
import { resolveExternalMindTransportProvider } from "@/lib/watch/external-mind-transport-provider";

export type ExternalMindHandoffTransportInput = {
  handoffId: string;
  destination: ExternalMindHandoffDestination;
  payloadVersion: string;
  payloadJson: unknown;
};

export type ExternalMindHandoffTransportMetadata = {
  transport_mode: "test_sink" | "blocked" | "dry_run" | "live";
  provider?: "generic_http" | "hellominds";
  error_class?: "config" | "http" | "timeout" | "network";
  endpoint_host?: string;
  timeout_ms?: number;
  dry_run_only?: boolean;
  http_status?: number;
  message_text_char_count?: number;
  conversation_alias_length?: number;
  conversation_id_suffix?: string;
  message_id_suffix?: string;
  artifact_count?: number;
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

/**
 * Executes the transport decision for a handoff send attempt.
 * test_sink never performs a network call.
 * External destinations require explicit env enablement and configuration.
 */
export async function executeExternalMindHandoffTransport(
  input: ExternalMindHandoffTransportInput
): Promise<ExternalMindHandoffTransportOutcome> {
  const timestamp = new Date().toISOString();
  const provider = resolveExternalMindTransportProvider(input.destination);

  if (provider === "test_sink") {
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

  if (!provider) {
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

  if (provider === "generic_http") {
    return executeGenericHttpTransport({
      handoffId: input.handoffId,
      destination: input.destination,
      payloadVersion: input.payloadVersion,
      payloadJson: input.payloadJson,
      timestamp,
    });
  }

  return executeHelloMindsTransport({
    handoffId: input.handoffId,
    destination: "hellominds",
    payloadVersion: input.payloadVersion,
    payloadJson: input.payloadJson,
    timestamp,
  });
}

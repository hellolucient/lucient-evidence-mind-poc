import { getHelloMindsConversationAliasPrefix } from "@/lib/watch/external-mind-hellominds-send-config";
import {
  describeHelloMindsSendReadiness,
  getHelloMindsAccessKey,
  getHelloMindsBaseUrl,
  getHelloMindsBaseUrlHost,
  getHelloMindsTargetMindId,
} from "@/lib/watch/external-mind-hellominds-send-config";
import { isExternalMindSendEnabled } from "@/lib/watch/external-mind-handoff-send-config";
import { privacySafeHelloMindsIdSuffix } from "@/lib/watch/external-mind-transport-hellominds";

export type MindClaimHelloMindsJobKind = "extraction" | "risk_brief";

export type MindClaimHelloMindsSendResult =
  | {
      ok: true;
      transport_mode: "dry_run" | "live";
      conversation_alias: string;
      external_thread_id: string | null;
      external_message_id: string | null;
      dry_run_message?: string;
    }
  | { ok: false; error: string; message: string; transport_mode?: string };

const DRY_RUN_SUCCESS_MESSAGE =
  "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery.";

type HelloMindsPostResult =
  | {
      ok: true;
      httpStatus: number;
      conversationId?: string;
      messageId?: string;
    }
  | { ok: false; httpStatus?: number; errorClass: "http" | "timeout" | "network" };

export function buildMindClaimHelloMindsConversationAlias(
  jobKind: MindClaimHelloMindsJobKind,
  jobId: string
): string {
  const prefix = getHelloMindsConversationAliasPrefix();
  const suffix = jobKind === "extraction" ? "mce" : "mrb";
  return `${prefix}-${suffix}-${jobId.trim()}`;
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
    return {
      ok: true,
      httpStatus: response.status,
      conversationId:
        typeof record.conversationId === "string" ? record.conversationId : undefined,
      messageId: typeof record.messageId === "string" ? record.messageId : undefined,
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
 * Operator-gated HelloMinds send for Mind claim intelligence jobs.
 * Respects EXTERNAL_MIND_LIVE_SEND=false as dry-run only. No auto-retry.
 */
export async function sendMindClaimHelloMindsMessage(input: {
  jobKind: MindClaimHelloMindsJobKind;
  jobId: string;
  messageText: string;
}): Promise<MindClaimHelloMindsSendResult> {
  const conversationAlias = buildMindClaimHelloMindsConversationAlias(input.jobKind, input.jobId);

  if (!isExternalMindSendEnabled()) {
    return {
      ok: false,
      error: "send_disabled",
      message: "External Mind send is disabled. Set ENABLE_EXTERNAL_MIND_SEND=true.",
      transport_mode: "blocked",
    };
  }

  const readiness = describeHelloMindsSendReadiness();
  if (
    !readiness.baseUrlConfigured ||
    !readiness.accessKeyConfigured ||
    !readiness.targetMindIdConfigured ||
    !readiness.endpointHostConfigured
  ) {
    return {
      ok: false,
      error: "external_config_invalid",
      message: "HelloMinds send configuration is incomplete.",
      transport_mode: "blocked",
    };
  }

  if (readiness.dryRunOnly) {
    return {
      ok: true,
      transport_mode: "dry_run",
      conversation_alias: conversationAlias,
      external_thread_id: null,
      external_message_id: null,
      dry_run_message: DRY_RUN_SUCCESS_MESSAGE,
    };
  }

  if (!readiness.readyForLiveExternalSend) {
    return {
      ok: false,
      error: "external_config_invalid",
      message: "HelloMinds live send prerequisites are not met.",
      transport_mode: "blocked",
    };
  }

  const baseUrl = getHelloMindsBaseUrl();
  const accessKey = getHelloMindsAccessKey();
  const targetMindId = getHelloMindsTargetMindId();
  const timeoutMs = readiness.timeoutMs;

  if (!baseUrl || !accessKey || !targetMindId) {
    return {
      ok: false,
      error: "external_config_invalid",
      message: "HelloMinds send configuration is incomplete.",
    };
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
    return {
      ok: false,
      error: "external_send_failed",
      message: "HelloMinds conversation creation failed.",
      transport_mode: "live",
    };
  }

  const messageResponse = await postHelloMindsJson({
    url: `${baseUrl.replace(/\/$/, "")}/v1/messaging/message`,
    accessKey,
    body: {
      alias: conversationAlias,
      messageText: input.messageText,
      attachments: [],
    },
    timeoutMs,
  });

  if (!messageResponse.ok) {
    return {
      ok: false,
      error: "external_send_failed",
      message: "HelloMinds message send failed.",
      transport_mode: "live",
    };
  }

  const messageIdSuffix = privacySafeHelloMindsIdSuffix(messageResponse.messageId);

  return {
    ok: true,
    transport_mode: "live",
    conversation_alias: conversationAlias,
    // Builder API history is keyed by conversation alias, not mindId suffix or conversationId suffix.
    external_thread_id: conversationAlias,
    external_message_id: messageIdSuffix ?? null,
  };
}

export function describeMindClaimHelloMindsEndpointHost(): string | null {
  return getHelloMindsBaseUrlHost();
}

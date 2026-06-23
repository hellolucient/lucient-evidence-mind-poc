import {
  getConfiguredHelloMindsConversationAliasPrefix,
  getHelloMindsConversationAliasPrefix,
} from "@/lib/watch/external-mind-hellominds-send-config";

export type HelloMindsConversationAliasSource =
  | "stored_send_metadata"
  | "reconstructed_from_handoff_id";

export type ResolveHelloMindsConversationAliasResult =
  | {
      ok: true;
      conversation_alias: string;
      alias_source: HelloMindsConversationAliasSource;
    }
  | {
      ok: false;
      error:
        | "alias_prefix_not_configured"
        | "handoff_id_missing"
        | "unsupported_destination"
        | "conversation_alias_unavailable";
      message: string;
    };

function formatHelloMindsConversationAlias(prefix: string, handoffId: string): string {
  return `${prefix.trim()}-ho-${handoffId.trim()}`;
}

/** Sender helper: `${prefix}-ho-${handoffId}` (prefix defaults to lucient-em when unset). */
export function buildHelloMindsConversationAlias(handoffId: string): string {
  return formatHelloMindsConversationAlias(getHelloMindsConversationAliasPrefix(), handoffId);
}

/**
 * Reconstructs alias only when EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX is explicitly set.
 * Uses the same `${prefix}-ho-${handoffId}` formula as buildHelloMindsConversationAlias.
 */
export function tryBuildHelloMindsConversationAlias(handoffId: string): string | null {
  const prefix = getConfiguredHelloMindsConversationAliasPrefix();
  if (!prefix) {
    return null;
  }

  const normalizedHandoffId = handoffId.trim();
  if (!normalizedHandoffId) {
    return null;
  }

  return formatHelloMindsConversationAlias(prefix, normalizedHandoffId);
}

function pickStoredConversationAlias(
  sources: Array<{ label: string; value: unknown }>
): string | null {
  for (const source of sources) {
    if (typeof source.value === "string" && source.value.trim()) {
      return source.value.trim();
    }
  }

  return null;
}

export function resolveHelloMindsConversationAlias(input: {
  destination: string;
  handoffId: string;
  sendResultConversationAlias?: string | null;
  sendEventConversationAlias?: string | null;
  receiptConversationAlias?: string | null;
}): ResolveHelloMindsConversationAliasResult {
  if (input.destination !== "hellominds") {
    return {
      ok: false,
      error: "unsupported_destination",
      message: "Conversation alias resolution is only supported for HelloMinds handoffs.",
    };
  }

  const storedAlias = pickStoredConversationAlias([
    { label: "receipt", value: input.receiptConversationAlias },
    { label: "send_result", value: input.sendResultConversationAlias },
    { label: "send_event", value: input.sendEventConversationAlias },
  ]);

  if (storedAlias) {
    return {
      ok: true,
      conversation_alias: storedAlias,
      alias_source: "stored_send_metadata",
    };
  }

  const handoffId = input.handoffId.trim();
  if (!handoffId) {
    return {
      ok: false,
      error: "handoff_id_missing",
      message: "Conversation alias unavailable because handoff id is missing.",
    };
  }

  const reconstructed = tryBuildHelloMindsConversationAlias(handoffId);
  if (!reconstructed) {
    return {
      ok: false,
      error: "alias_prefix_not_configured",
      message:
        "Conversation alias unavailable because HelloMinds alias prefix is not configured.",
    };
  }

  return {
    ok: true,
    conversation_alias: reconstructed,
    alias_source: "reconstructed_from_handoff_id",
  };
}

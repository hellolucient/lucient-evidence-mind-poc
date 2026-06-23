import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  resolveHelloMindsConversationAlias,
  type HelloMindsConversationAliasSource,
} from "@/lib/watch/external-mind-hellominds-conversation-alias";
import {
  fetchHelloMindsConversationHistory,
  HELLOMINDS_HISTORY_RESPONSE_SOURCE,
  summarizeHelloMindsHistoryMessages,
} from "@/lib/watch/external-mind-hellominds-history";
import {
  getExternalMindHandoffReceiptForHandoff,
  upsertExternalMindHandoffReceipt,
  type PrivacySafeExternalMindHandoffReceipt,
} from "@/lib/watch/external-mind-handoff-receipt-store";
import { getLatestExternalMindHandoffSendReceiptMetadataForHandoff } from "@/lib/watch/external-mind-handoff-send-event-store";
import { getExternalMindHandoffById } from "@/lib/watch/external-mind-handoff-store";

export type FetchHelloMindsHandoffResponseResult =
  | {
      ok: true;
      receipt: PrivacySafeExternalMindHandoffReceipt;
      conversation_alias: string;
      alias_source: HelloMindsConversationAliasSource;
      message_count: number;
      latest_fingerprint: string | null;
      latest_mind_reply_created_at: string | null;
      response_excerpt: string | null;
      mind_reply_state: "mind_reply_found" | "no_reply_yet";
      response_source: typeof HELLOMINDS_HISTORY_RESPONSE_SOURCE;
      retrieved_at: string;
    }
  | { ok: false; error: string; message: string };

function fetchResponseErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured.";
    case "forbidden":
      return "You do not have access to this handoff workspace.";
    case "handoff_not_found":
      return "External Mind handoff not found.";
    case "invalid_handoff_state":
      return "Only sent HelloMinds handoffs can fetch Mind response history.";
    case "unsupported_destination":
      return "HelloMinds response fetch is only supported for HelloMinds handoffs.";
    case "alias_prefix_not_configured":
      return "Conversation alias unavailable because HelloMinds alias prefix is not configured.";
    case "handoff_id_missing":
      return "Conversation alias unavailable because handoff id is missing.";
    case "conversation_alias_unavailable":
      return "Conversation alias unavailable for this historical handoff. Future sends will store alias for response retrieval.";
    case "read_api_not_configured":
      return "HelloMinds read API is not configured. Set EXTERNAL_MIND_HELLOMINDS_BASE_URL and EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY.";
    case "conversation_not_found":
      return "Conversation not found.";
    case "auth_failed":
      return "HelloMinds read API authentication failed. Check HelloMinds access key configuration.";
    case "timeout":
      return "HelloMinds history request timed out.";
    case "network":
      return "HelloMinds history request failed due to a network error.";
    case "invalid_response":
      return "HelloMinds history response was invalid.";
    case "http_error":
      return "HelloMinds history request failed.";
    default:
      return `HelloMinds response fetch failed: ${error}`;
  }
}

export async function fetchHelloMindsHandoffResponsePhase41B(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<FetchHelloMindsHandoffResponseResult> {
  const lookup = await getExternalMindHandoffById(handoffId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: fetchResponseErrorMessage("forbidden") };
  }

  if (!lookup.handoff) {
    return {
      ok: false,
      error: lookup.error ?? "handoff_not_found",
      message: fetchResponseErrorMessage(lookup.error ?? "handoff_not_found"),
    };
  }

  const handoff = lookup.handoff;
  if (handoff.destination !== "hellominds") {
    return {
      ok: false,
      error: "unsupported_destination",
      message: fetchResponseErrorMessage("unsupported_destination"),
    };
  }

  if (handoff.status !== "sent") {
    return {
      ok: false,
      error: "invalid_handoff_state",
      message: fetchResponseErrorMessage("invalid_handoff_state"),
    };
  }

  const existingReceipt = await getExternalMindHandoffReceiptForHandoff(handoff.id, access);
  const sendMetaResult = await getLatestExternalMindHandoffSendReceiptMetadataForHandoff(
    handoff.id,
    access
  );
  if (sendMetaResult.error) {
    return {
      ok: false,
      error: sendMetaResult.error,
      message: fetchResponseErrorMessage(sendMetaResult.error),
    };
  }

  const aliasResolution = resolveHelloMindsConversationAlias({
    destination: handoff.destination,
    handoffId: handoff.id,
    sendResultConversationAlias: handoff.send_result_json?.conversation_alias ?? null,
    sendEventConversationAlias: sendMetaResult.metadata?.conversation_alias ?? null,
    receiptConversationAlias:
      typeof existingReceipt.receipt?.metadata?.conversation_alias === "string"
        ? existingReceipt.receipt.metadata.conversation_alias
        : null,
  });

  if (!aliasResolution.ok) {
    const error =
      aliasResolution.error === "alias_prefix_not_configured"
        ? "alias_prefix_not_configured"
        : aliasResolution.error === "handoff_id_missing"
          ? "handoff_id_missing"
          : "conversation_alias_unavailable";

    return {
      ok: false,
      error,
      message: aliasResolution.message,
    };
  }

  const historyResult = await fetchHelloMindsConversationHistory({
    conversationAlias: aliasResolution.conversation_alias,
    limit: 50,
  });

  if (!historyResult.ok) {
    return {
      ok: false,
      error: historyResult.error,
      message: historyResult.message,
    };
  }

  const summary = summarizeHelloMindsHistoryMessages(historyResult.messages);
  const retrievedAt = new Date().toISOString();
  const sendMetadata = sendMetaResult.metadata;

  const upsert = await upsertExternalMindHandoffReceipt(
    {
      workspace_id: handoff.workspace_id,
      handoff_id: handoff.id,
      digest_id: handoff.digest_id,
      destination: handoff.destination,
      provider: sendMetadata?.provider ?? "hellominds",
      conversation_id_suffix: sendMetadata?.conversation_id_suffix ?? null,
      message_id_suffix: sendMetadata?.message_id_suffix ?? null,
      receipt_status: "fetched_from_hellominds",
      receipt_source: "hellominds_read_api",
      http_status: historyResult.httpStatus,
      verified_at: retrievedAt,
      response_excerpt: summary.response_excerpt,
      metadata: {
        conversation_alias: aliasResolution.conversation_alias,
        alias_source: aliasResolution.alias_source,
        message_count: summary.message_count,
        latest_fingerprint: summary.latest_fingerprint,
        latest_mind_reply_created_at: summary.latest_mind_reply_created_at,
        attachment_count: summary.attachment_count,
        attachment_metadata: summary.attachment_metadata,
        mind_reply_state: summary.mind_reply_state,
        response_source: HELLOMINDS_HISTORY_RESPONSE_SOURCE,
        retrieval_timestamp: retrievedAt,
        ...(sendMetadata?.endpoint_host ? { endpoint_host: sendMetadata.endpoint_host } : {}),
        ...(sendMetadata?.transport_mode ? { transport_mode: sendMetadata.transport_mode } : {}),
      },
    },
    access
  );

  if (!upsert.ok) {
    return {
      ok: false,
      error: upsert.error,
      message: fetchResponseErrorMessage(upsert.error),
    };
  }

  return {
    ok: true,
    receipt: upsert.receipt,
    conversation_alias: aliasResolution.conversation_alias,
    alias_source: aliasResolution.alias_source,
    message_count: summary.message_count,
    latest_fingerprint: summary.latest_fingerprint,
    latest_mind_reply_created_at: summary.latest_mind_reply_created_at,
    response_excerpt: summary.response_excerpt,
    mind_reply_state: summary.mind_reply_state,
    response_source: HELLOMINDS_HISTORY_RESPONSE_SOURCE,
    retrieved_at: retrievedAt,
  };
}

export { fetchResponseErrorMessage };

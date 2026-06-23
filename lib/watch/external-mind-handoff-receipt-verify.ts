import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { getExternalMindHandoffById } from "@/lib/watch/external-mind-handoff-store";
import {
  getLatestExternalMindHandoffSendReceiptMetadataForHandoff,
} from "@/lib/watch/external-mind-handoff-send-event-store";
import {
  getExternalMindHandoffReceiptForHandoff,
  upsertExternalMindHandoffReceipt,
  type PrivacySafeExternalMindHandoffReceipt,
} from "@/lib/watch/external-mind-handoff-receipt-store";

export type VerifyExternalMindHandoffReceiptResult =
  | {
      ok: true;
      receipt: PrivacySafeExternalMindHandoffReceipt;
      derived_from: "send_audit_metadata";
      already_verified?: boolean;
    }
  | { ok: false; error: string; message: string };

function verifyReceiptErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured.";
    case "forbidden":
      return "You do not have access to this handoff workspace.";
    case "handoff_not_found":
      return "External Mind handoff not found.";
    case "invalid_handoff_state":
      return "Handoff is not eligible for receipt verification.";
    case "unsupported_destination":
      return "Receipt verification is only supported for HelloMinds handoffs.";
    default:
      return `Receipt verification failed: ${error}`;
  }
}

export async function verifyExternalMindHandoffReceiptPhase41A(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<VerifyExternalMindHandoffReceiptResult> {
  const lookup = await getExternalMindHandoffById(handoffId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: verifyReceiptErrorMessage("forbidden") };
  }

  if (!lookup.handoff) {
    return {
      ok: false,
      error: lookup.error ?? "handoff_not_found",
      message: verifyReceiptErrorMessage(lookup.error ?? "handoff_not_found"),
    };
  }

  const handoff = lookup.handoff;
  if (handoff.destination !== "hellominds") {
    return {
      ok: false,
      error: "unsupported_destination",
      message: verifyReceiptErrorMessage("unsupported_destination"),
    };
  }

  if (handoff.status !== "sent") {
    return {
      ok: false,
      error: "invalid_handoff_state",
      message: verifyReceiptErrorMessage("invalid_handoff_state"),
    };
  }

  const existing = await getExternalMindHandoffReceiptForHandoff(handoff.id, access);
  if (existing.receipt) {
    // Idempotent: re-verifying should not change status or trigger any send behavior.
    return {
      ok: true,
      receipt: existing.receipt,
      derived_from: "send_audit_metadata",
      already_verified: true,
    };
  }

  const sendMetaResult = await getLatestExternalMindHandoffSendReceiptMetadataForHandoff(
    handoff.id,
    access
  );
  if (sendMetaResult.error) {
    return {
      ok: false,
      error: sendMetaResult.error,
      message: verifyReceiptErrorMessage(sendMetaResult.error),
    };
  }

  const metadata = sendMetaResult.metadata;
  const now = new Date().toISOString();
  const upsert = await upsertExternalMindHandoffReceipt(
    {
      workspace_id: handoff.workspace_id,
      handoff_id: handoff.id,
      digest_id: handoff.digest_id,
      destination: handoff.destination,
      provider: metadata?.provider ?? "hellominds",
      conversation_id_suffix: metadata?.conversation_id_suffix ?? null,
      message_id_suffix: metadata?.message_id_suffix ?? null,
      receipt_status: "delivery_confirmed_from_send_event",
      receipt_source: "send_event_metadata",
      http_status:
        typeof metadata?.http_status === "number"
          ? metadata.http_status
          : typeof handoff.send_result_json?.http_status === "number"
            ? handoff.send_result_json.http_status
            : null,
      verified_at: now,
      response_excerpt: null,
      metadata: metadata ? { ...metadata } : null,
    },
    access
  );

  if (!upsert.ok) {
    return { ok: false, error: upsert.error, message: verifyReceiptErrorMessage(upsert.error) };
  }

  return { ok: true, receipt: upsert.receipt, derived_from: "send_audit_metadata" };
}


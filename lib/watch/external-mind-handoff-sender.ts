import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";

export type ExternalMindHandoffSendResult =
  | { ok: true; sent: false; reason: "external_send_disabled" }
  | { ok: true; sent: true }
  | { ok: false; error: string };

export function isExternalMindSendEnabled(): boolean {
  return process.env.ENABLE_EXTERNAL_MIND_SEND?.trim().toLowerCase() === "true";
}

/**
 * Phase 31: external send is disabled by default. No network call is made unless
 * ENABLE_EXTERNAL_MIND_SEND=true, and even then no Animoca endpoint is configured yet.
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

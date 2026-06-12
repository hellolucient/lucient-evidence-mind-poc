import {
  DEFAULT_MIND_DIGEST_HANDOFF_DESTINATION,
  DEFAULT_MIND_DIGEST_HANDOFF_TYPE,
  MIND_DIGEST_HANDOFF_PAYLOAD_VERSION,
  isSupportedExternalMindHandoffDestination,
  type ExternalMindHandoffDestination,
  type ExternalMindHandoffType,
} from "@/lib/review/external-mind-handoff-constants";
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  buildMindDigestHandoffPayload,
  isPrivacySafeMindDigestHandoffPayload,
} from "@/lib/watch/external-mind-handoff-payload-builder";
import { isExternalMindHandoffCreationReady } from "@/lib/watch/external-mind-handoff-send-config";
import { isHelloMindsHandoffCreationReady } from "@/lib/watch/external-mind-hellominds-send-config";
import { sendExternalMindHandoffIfEnabled } from "@/lib/watch/external-mind-handoff-sender";
import {
  createExternalMindHandoff,
  findActiveHandoffForDigest,
  getExternalMindHandoffById,
  listExternalMindHandoffs,
  type PrivacySafeExternalMindHandoffWithPayload,
} from "@/lib/watch/external-mind-handoff-store";
import {
  DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE,
  DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION,
} from "@/lib/watch/evidence-mind-watchtower-narrative-diff-constants";
import { getLatestWatchtowerNarrativeDiffForNarrative } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";
import { getLatestWatchtowerNarrativeForDigest } from "@/lib/watch/evidence-mind-watchtower-narrative-generator";
import {
  getEvidenceMindDigestById,
  listEvidenceMindDigestItemsForDigest,
} from "@/lib/watch/evidence-mind-digest-store";

export type CreateMindHandoffResult =
  | { ok: true; handoff: PrivacySafeExternalMindHandoffWithPayload; duplicate_skipped?: boolean }
  | { ok: false; error: string; message: string };

export type CreateMindHandoffOptions = {
  destination?: ExternalMindHandoffDestination;
  handoffType?: ExternalMindHandoffType;
  skipDuplicateCheck?: boolean;
};

export function mindHandoffCreationErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "external_mind_handoffs_table_missing":
      return "The external_mind_handoffs table is missing. Apply the Phase 31 migration in Supabase.";
    case "forbidden":
      return "You do not have access to create handoffs in this workspace.";
    case "digest_not_found":
      return "Evidence Mind digest not found.";
    case "required_fields_missing":
      return "Required handoff fields are missing.";
    case "duplicate_active_handoff":
      return "An active handoff already exists for this digest.";
    case "payload_not_privacy_safe":
      return "Generated handoff payload failed privacy validation.";
    case "external_send_not_ready":
      return "External Mind send is not configured for dry-run handoff creation. Enable external send and set a valid HTTPS endpoint and API key.";
    case "unsupported_handoff_destination_for_creation":
      return "That handoff destination is not supported for creation yet.";
    case "invalid_handoff_destination":
      return "The requested handoff destination is not valid.";
    default:
      return `Unable to create Mind handoff: ${error}`;
  }
}

export function validateExternalMindHandoffCreationDestination(
  destination: ExternalMindHandoffDestination
): { ok: true } | { ok: false; error: string; message: string } {
  if (destination === "test_sink") {
    return { ok: true };
  }

  if (destination === "internal_export") {
    return {
      ok: false,
      error: "unsupported_handoff_destination_for_creation",
      message: mindHandoffCreationErrorMessage("unsupported_handoff_destination_for_creation"),
    };
  }

  if (destination === "animoca_mind") {
    if (!isExternalMindHandoffCreationReady()) {
      return {
        ok: false,
        error: "external_send_not_ready",
        message: mindHandoffCreationErrorMessage("external_send_not_ready"),
      };
    }

    return { ok: true };
  }

  if (destination === "hellominds") {
    if (!isHelloMindsHandoffCreationReady()) {
      return {
        ok: false,
        error: "external_send_not_ready",
        message: mindHandoffCreationErrorMessage("external_send_not_ready"),
      };
    }

    return { ok: true };
  }

  if (!isSupportedExternalMindHandoffDestination(destination)) {
    return {
      ok: false,
      error: "invalid_handoff_destination",
      message: mindHandoffCreationErrorMessage("invalid_handoff_destination"),
    };
  }

  return {
    ok: false,
    error: "invalid_handoff_destination",
    message: mindHandoffCreationErrorMessage("invalid_handoff_destination"),
  };
}

export async function createMindHandoffFromDigest(
  digestId: string,
  access: ReviewQueueAccessContext,
  options?: CreateMindHandoffOptions
): Promise<CreateMindHandoffResult> {
  const destination = options?.destination ?? DEFAULT_MIND_DIGEST_HANDOFF_DESTINATION;
  const handoffType = options?.handoffType ?? DEFAULT_MIND_DIGEST_HANDOFF_TYPE;
  const payloadVersion = MIND_DIGEST_HANDOFF_PAYLOAD_VERSION;

  const destinationValidation = validateExternalMindHandoffCreationDestination(destination);
  if (!destinationValidation.ok) {
    return {
      ok: false,
      error: destinationValidation.error,
      message: destinationValidation.message,
    };
  }

  const digestResult = await getEvidenceMindDigestById(digestId, access);
  if (digestResult.error === "forbidden") {
    return { ok: false, error: "forbidden", message: mindHandoffCreationErrorMessage("forbidden") };
  }

  if (!digestResult.digest) {
    return {
      ok: false,
      error: "digest_not_found",
      message: mindHandoffCreationErrorMessage("digest_not_found"),
    };
  }

  if (!options?.skipDuplicateCheck) {
    const existing = await findActiveHandoffForDigest(
      digestId,
      destination,
      payloadVersion,
      access
    );
    if (existing.handoff) {
      return { ok: true, handoff: existing.handoff, duplicate_skipped: true };
    }
  }

  const itemsResult = await listEvidenceMindDigestItemsForDigest(digestId, access);
  if (itemsResult.error && itemsResult.error !== "forbidden") {
    return {
      ok: false,
      error: itemsResult.error,
      message: mindHandoffCreationErrorMessage(itemsResult.error),
    };
  }

  const watchtowerNarrative = await getLatestWatchtowerNarrativeForDigest(digestId, access);

  let watchtowerNarrativeDiff = null;
  if (watchtowerNarrative) {
    const diffResult = await getLatestWatchtowerNarrativeDiffForNarrative(
      {
        current_narrative_id: watchtowerNarrative.id,
        comparison_scope: DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE,
        diff_version: DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION,
      },
      access
    );
    watchtowerNarrativeDiff = diffResult.diff ?? null;
  }

  const payload = buildMindDigestHandoffPayload(digestResult.digest, itemsResult.items, {
    handoffType,
    destination,
    watchtowerNarrative,
    watchtowerNarrativeDiff,
  });

  if (!isPrivacySafeMindDigestHandoffPayload(payload as unknown as Record<string, unknown>)) {
    return {
      ok: false,
      error: "payload_not_privacy_safe",
      message: mindHandoffCreationErrorMessage("payload_not_privacy_safe"),
    };
  }

  const createResult = await createExternalMindHandoff(
    {
      workspace_id: digestResult.digest.workspace_id,
      digest_id: digestId,
      handoff_type: handoffType,
      destination,
      payload_version: payloadVersion,
      payload_json: payload,
      status: "ready",
    },
    access
  );

  if (!createResult.ok) {
    if (createResult.error === "duplicate_active_handoff" && !options?.skipDuplicateCheck) {
      const existing = await findActiveHandoffForDigest(
        digestId,
        destination,
        payloadVersion,
        access
      );
      if (existing.handoff) {
        return { ok: true, handoff: existing.handoff, duplicate_skipped: true };
      }
    }

    return {
      ok: false,
      error: createResult.error,
      message: mindHandoffCreationErrorMessage(createResult.error),
    };
  }

  if (destination !== "hellominds") {
    await sendExternalMindHandoffIfEnabled({
      handoffId: createResult.handoff.id,
      destination,
      payloadVersion,
    });
  }

  return { ok: true, handoff: createResult.handoff };
}

export async function getLatestHandoffForDigest(
  digestId: string,
  access: ReviewQueueAccessContext,
  destination: ExternalMindHandoffDestination = DEFAULT_MIND_DIGEST_HANDOFF_DESTINATION
): Promise<PrivacySafeExternalMindHandoffWithPayload | null> {
  const active = await findActiveHandoffForDigest(
    digestId,
    destination,
    MIND_DIGEST_HANDOFF_PAYLOAD_VERSION,
    access
  );

  if (active.handoff) {
    return active.handoff;
  }

  const listResult = await listExternalMindHandoffs(access, {
    digest_id: digestId,
    destination,
  });

  if (listResult.error || listResult.handoffs.length === 0) {
    return null;
  }

  return (await getExternalMindHandoffById(listResult.handoffs[0].id, access)).handoff;
}

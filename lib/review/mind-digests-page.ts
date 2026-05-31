import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  DEMO_WORKSPACE_ID,
  EVIDENCE_MIND_DIGEST_STATUSES,
} from "@/lib/review/evidence-mind-digest-constants";
import {
  digestGenerationErrorMessage,
  generateDemoEvidenceMindDigest,
} from "@/lib/watch/evidence-mind-digest-generator";
import {
  createMindHandoffFromDigest,
  getLatestHandoffForDigest,
  mindHandoffCreationErrorMessage,
} from "@/lib/watch/external-mind-handoff-creator";
import {
  externalMindHandoffSendErrorMessage,
  sendExternalMindHandoff,
} from "@/lib/watch/external-mind-handoff-send";
import {
  externalMindHandoffReviewErrorMessage,
  reviewExternalMindHandoff,
  type ExternalMindHandoffReviewAction,
} from "@/lib/watch/external-mind-handoff-review";
import {
  isExternalMindHandoffSendEventPersistenceConfigured,
  listExternalMindHandoffSendEventsForHandoff,
  type PrivacySafeExternalMindHandoffSendEvent,
} from "@/lib/watch/external-mind-handoff-send-event-store";
import type { PrivacySafeExternalMindHandoffWithPayload } from "@/lib/watch/external-mind-handoff-store";
import {
  isExternalMindHandoffPersistenceConfigured,
} from "@/lib/watch/external-mind-handoff-store";
import {
  getEvidenceMindDigestById,
  isEvidenceMindDigestPersistenceConfigured,
  listEvidenceMindDigestItemsForDigest,
  listEvidenceMindDigests,
  type EvidenceMindDigestListFilters,
  type PrivacySafeEvidenceMindDigest,
  type PrivacySafeEvidenceMindDigestItem,
} from "@/lib/watch/evidence-mind-digest-store";

export type MindDigestsPageFilters = EvidenceMindDigestListFilters;

export type MindDigestsGenerateFlash =
  | { kind: "success"; duplicate_skipped?: boolean }
  | { kind: "error"; error: string; message: string };

export type MindDigestsHandoffFlash =
  | { kind: "success"; duplicate_skipped?: boolean }
  | { kind: "error"; error: string; message: string };

export type MindDigestsSendFlash =
  | { kind: "success"; result?: string }
  | { kind: "error"; error: string; message: string };

export type MindDigestsReviewFlash =
  | { kind: "success"; action: ExternalMindHandoffReviewAction }
  | { kind: "error"; error: string; message: string };

export type MindDigestsPageData = {
  configured: boolean;
  handoffsConfigured: boolean;
  filters: MindDigestsPageFilters;
  digests: PrivacySafeEvidenceMindDigest[];
  selectedDigest: PrivacySafeEvidenceMindDigest | null;
  selectedDigestItems: PrivacySafeEvidenceMindDigestItem[];
  selectedDigestHandoff: PrivacySafeExternalMindHandoffWithPayload | null;
  selectedDigestHandoffSendEvents: PrivacySafeExternalMindHandoffSendEvent[];
  sendEventsConfigured: boolean;
  defaultWorkspaceId: string;
  listError: string | null;
  listErrorMessage: string | null;
  detailError: string | null;
  detailErrorMessage: string | null;
  generateFlash: MindDigestsGenerateFlash | null;
  handoffFlash: MindDigestsHandoffFlash | null;
  sendFlash: MindDigestsSendFlash | null;
  reviewFlash: MindDigestsReviewFlash | null;
  statusOptions: readonly string[];
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export function parseMindDigestsPageFilters(
  params: Record<string, string | string[] | undefined>
): MindDigestsPageFilters {
  const status = readParam(params, "status");

  return {
    workspace_id: readParam(params, "workspace_id") || undefined,
    status:
      status &&
      (EVIDENCE_MIND_DIGEST_STATUSES as readonly string[]).includes(status)
        ? (status as MindDigestsPageFilters["status"])
        : undefined,
  };
}

export function parseMindDigestsGenerateFlash(
  params: Record<string, string | string[] | undefined>
): MindDigestsGenerateFlash | null {
  if (readParam(params, "generate_ok")) {
    return readParam(params, "duplicate_skipped")
      ? { kind: "success", duplicate_skipped: true }
      : { kind: "success" };
  }

  const error = readParam(params, "generate_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "generate_message") ?? digestGenerationErrorMessage(error),
    };
  }

  return null;
}

export function parseMindDigestsHandoffFlash(
  params: Record<string, string | string[] | undefined>
): MindDigestsHandoffFlash | null {
  if (readParam(params, "handoff_ok")) {
    return readParam(params, "handoff_duplicate_skipped")
      ? { kind: "success", duplicate_skipped: true }
      : { kind: "success" };
  }

  const error = readParam(params, "handoff_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "handoff_message") ?? mindHandoffCreationErrorMessage(error),
    };
  }

  return null;
}

export function parseMindDigestsSendFlash(
  params: Record<string, string | string[] | undefined>
): MindDigestsSendFlash | null {
  if (readParam(params, "send_ok")) {
    return {
      kind: "success",
      result: readParam(params, "send_result") ?? undefined,
    };
  }

  const error = readParam(params, "send_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "send_message") ?? externalMindHandoffSendErrorMessage(error),
    };
  }

  return null;
}

export function parseMindDigestsReviewFlash(
  params: Record<string, string | string[] | undefined>
): MindDigestsReviewFlash | null {
  const action = readParam(params, "review_action");
  if (readParam(params, "review_ok") && action) {
    if (action === "approve" || action === "reject" || action === "request_changes") {
      return { kind: "success", action };
    }
  }

  const error = readParam(params, "review_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "review_message") ?? externalMindHandoffReviewErrorMessage(error),
    };
  }

  return null;
}

export function mindDigestsErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_mind_digests_table_missing":
      return "The evidence_mind_digests table is missing. Apply the Phase 29 migration in Supabase.";
    case "evidence_mind_digest_items_table_missing":
      return "The evidence_mind_digest_items table is missing. Apply the Phase 29 migration in Supabase.";
    case "forbidden":
      return "You do not have access to digests in this workspace.";
    case "digest_not_found":
      return "Evidence Mind digest not found.";
    case "external_mind_handoffs_table_missing":
      return "The external_mind_handoffs table is missing. Apply the Phase 31 migration in Supabase.";
    case "external_mind_handoff_send_events_table_missing":
      return "The external_mind_handoff_send_events table is missing. Apply the Phase 33 migration in Supabase.";
    case "handoff_not_found":
      return "External Mind handoff not found.";
    default:
      return `Server error: ${error}`;
  }
}

export async function buildMindDigestsPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<MindDigestsPageData> {
  const filters = parseMindDigestsPageFilters(params);
  const configured = isEvidenceMindDigestPersistenceConfigured();
  const handoffsConfigured = isExternalMindHandoffPersistenceConfigured();
  const sendEventsConfigured = isExternalMindHandoffSendEventPersistenceConfigured();
  const defaultWorkspaceId =
    access.mode === "operator"
      ? (access.workspaceIds[0] ?? DEMO_WORKSPACE_ID)
      : DEMO_WORKSPACE_ID;

  if (!configured) {
    return {
      configured: false,
      handoffsConfigured: false,
      filters,
      digests: [],
      selectedDigest: null,
      selectedDigestItems: [],
      selectedDigestHandoff: null,
      selectedDigestHandoffSendEvents: [],
      sendEventsConfigured: false,
      defaultWorkspaceId,
      listError: "supabase_not_configured",
      listErrorMessage: mindDigestsErrorMessage("supabase_not_configured"),
      detailError: null,
      detailErrorMessage: null,
      generateFlash: parseMindDigestsGenerateFlash(params),
      handoffFlash: parseMindDigestsHandoffFlash(params),
      sendFlash: parseMindDigestsSendFlash(params),
      reviewFlash: parseMindDigestsReviewFlash(params),
      statusOptions: EVIDENCE_MIND_DIGEST_STATUSES,
    };
  }

  const selectedDigestId = readParam(params, "digest_id");
  const listResult = await listEvidenceMindDigests(access, filters);

  let selectedDigest: PrivacySafeEvidenceMindDigest | null = null;
  let selectedDigestItems: PrivacySafeEvidenceMindDigestItem[] = [];
  let selectedDigestHandoff: PrivacySafeExternalMindHandoffWithPayload | null = null;
  let selectedDigestHandoffSendEvents: PrivacySafeExternalMindHandoffSendEvent[] = [];
  let detailError: string | null = null;

  if (selectedDigestId) {
    const digestResult = await getEvidenceMindDigestById(selectedDigestId, access);
    if (digestResult.error === "forbidden") {
      detailError = "forbidden";
    } else if (digestResult.digest) {
      selectedDigest = digestResult.digest;
      const itemsResult = await listEvidenceMindDigestItemsForDigest(selectedDigestId, access);
      selectedDigestItems = itemsResult.items;
      if (itemsResult.error && itemsResult.error !== "forbidden") {
        detailError = itemsResult.error;
      }

      if (handoffsConfigured) {
        selectedDigestHandoff = await getLatestHandoffForDigest(selectedDigestId, access);
        if (selectedDigestHandoff && sendEventsConfigured) {
          const eventsResult = await listExternalMindHandoffSendEventsForHandoff(
            selectedDigestHandoff.id,
            access
          );
          selectedDigestHandoffSendEvents = eventsResult.events;
          if (eventsResult.error && eventsResult.error !== "forbidden") {
            detailError = detailError ?? eventsResult.error;
          }
        }
      }
    } else if (digestResult.error) {
      detailError = digestResult.error;
    }
  }

  return {
    configured: true,
    handoffsConfigured,
    filters,
    digests: listResult.digests,
    selectedDigest,
    selectedDigestItems,
    selectedDigestHandoff,
    selectedDigestHandoffSendEvents,
    sendEventsConfigured,
    defaultWorkspaceId,
    listError: listResult.error ?? null,
    listErrorMessage: listResult.error ? mindDigestsErrorMessage(listResult.error) : null,
    detailError,
    detailErrorMessage: detailError ? mindDigestsErrorMessage(detailError) : null,
    generateFlash: parseMindDigestsGenerateFlash(params),
    handoffFlash: parseMindDigestsHandoffFlash(params),
    sendFlash: parseMindDigestsSendFlash(params),
    reviewFlash: parseMindDigestsReviewFlash(params),
    statusOptions: EVIDENCE_MIND_DIGEST_STATUSES,
  };
}

export type DemoDigestGenerationSubmissionResult = {
  redirectPath: string;
  result: Awaited<ReturnType<typeof generateDemoEvidenceMindDigest>>;
};

export async function processDemoDigestGenerationSubmission(
  access: ReviewQueueAccessContext,
  workspaceId?: string
): Promise<DemoDigestGenerationSubmissionResult> {
  const result = await generateDemoEvidenceMindDigest(access, { workspaceId });

  if (!result.ok) {
    return {
      redirectPath: `/mind-digests?generate_error=${encodeURIComponent(result.error)}&generate_message=${encodeURIComponent(result.message)}`,
      result,
    };
  }

  if (result.duplicate_skipped) {
    return {
      redirectPath: `/mind-digests?digest_id=${encodeURIComponent(result.digest.id)}&generate_ok=1&duplicate_skipped=1`,
      result,
    };
  }

  return {
    redirectPath: `/mind-digests?digest_id=${encodeURIComponent(result.digest.id)}&generate_ok=1`,
    result,
  };
}

export type MindHandoffCreationSubmissionResult = {
  redirectPath: string;
  result: Awaited<ReturnType<typeof createMindHandoffFromDigest>>;
};

export async function processMindHandoffCreationSubmission(
  access: ReviewQueueAccessContext,
  digestId: string
): Promise<MindHandoffCreationSubmissionResult> {
  const result = await createMindHandoffFromDigest(digestId, access);

  if (!result.ok) {
    return {
      redirectPath: `/mind-digests?digest_id=${encodeURIComponent(digestId)}&handoff_error=${encodeURIComponent(result.error)}&handoff_message=${encodeURIComponent(result.message)}`,
      result,
    };
  }

  if (result.duplicate_skipped) {
    return {
      redirectPath: `/mind-digests?digest_id=${encodeURIComponent(digestId)}&handoff_ok=1&handoff_duplicate_skipped=1`,
      result,
    };
  }

  return {
    redirectPath: `/mind-digests?digest_id=${encodeURIComponent(digestId)}&handoff_ok=1`,
    result,
  };
}

export type MindHandoffSendSubmissionResult = {
  redirectPath: string;
  result: Awaited<ReturnType<typeof sendExternalMindHandoff>>;
};

export async function processMindHandoffSendSubmission(
  access: ReviewQueueAccessContext,
  handoffId: string,
  digestId?: string,
  operatorEmail?: string | null
): Promise<MindHandoffSendSubmissionResult> {
  const result = await sendExternalMindHandoff(handoffId, access, { operatorEmail });
  const digestQuery = digestId ? `digest_id=${encodeURIComponent(digestId)}&` : "";

  if (!result.ok) {
    return {
      redirectPath: `/mind-digests?${digestQuery}send_error=${encodeURIComponent(result.error)}&send_message=${encodeURIComponent(result.message)}`,
      result,
    };
  }

  return {
    redirectPath: `/mind-digests?${digestQuery}send_ok=1&send_result=${encodeURIComponent(result.sendResult.result)}`,
    result,
  };
}

export type MindHandoffReviewSubmissionResult = {
  redirectPath: string;
  result: Awaited<ReturnType<typeof reviewExternalMindHandoff>>;
};

export async function processMindHandoffReviewSubmission(
  access: ReviewQueueAccessContext,
  handoffId: string,
  action: ExternalMindHandoffReviewAction,
  digestId?: string,
  operatorEmail?: string | null,
  note?: string | null
): Promise<MindHandoffReviewSubmissionResult> {
  const result = await reviewExternalMindHandoff(handoffId, access, action, {
    operatorEmail,
    note,
  });
  const digestQuery = digestId ? `digest_id=${encodeURIComponent(digestId)}&` : "";

  if (!result.ok) {
    return {
      redirectPath: `/mind-digests?${digestQuery}review_error=${encodeURIComponent(result.error)}&review_message=${encodeURIComponent(result.message)}`,
      result,
    };
  }

  return {
    redirectPath: `/mind-digests?${digestQuery}review_ok=1&review_action=${encodeURIComponent(result.action)}`,
    result,
  };
}

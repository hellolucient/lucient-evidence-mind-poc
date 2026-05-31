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

export type MindDigestsPageData = {
  configured: boolean;
  filters: MindDigestsPageFilters;
  digests: PrivacySafeEvidenceMindDigest[];
  selectedDigest: PrivacySafeEvidenceMindDigest | null;
  selectedDigestItems: PrivacySafeEvidenceMindDigestItem[];
  defaultWorkspaceId: string;
  listError: string | null;
  listErrorMessage: string | null;
  detailError: string | null;
  detailErrorMessage: string | null;
  generateFlash: MindDigestsGenerateFlash | null;
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
  const defaultWorkspaceId =
    access.mode === "operator"
      ? (access.workspaceIds[0] ?? DEMO_WORKSPACE_ID)
      : DEMO_WORKSPACE_ID;

  if (!configured) {
    return {
      configured: false,
      filters,
      digests: [],
      selectedDigest: null,
      selectedDigestItems: [],
      defaultWorkspaceId,
      listError: "supabase_not_configured",
      listErrorMessage: mindDigestsErrorMessage("supabase_not_configured"),
      detailError: null,
      detailErrorMessage: null,
      generateFlash: parseMindDigestsGenerateFlash(params),
      statusOptions: EVIDENCE_MIND_DIGEST_STATUSES,
    };
  }

  const selectedDigestId = readParam(params, "digest_id");
  const listResult = await listEvidenceMindDigests(access, filters);

  let selectedDigest: PrivacySafeEvidenceMindDigest | null = null;
  let selectedDigestItems: PrivacySafeEvidenceMindDigestItem[] = [];
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
    } else if (digestResult.error) {
      detailError = digestResult.error;
    }
  }

  return {
    configured: true,
    filters,
    digests: listResult.digests,
    selectedDigest,
    selectedDigestItems,
    defaultWorkspaceId,
    listError: listResult.error ?? null,
    listErrorMessage: listResult.error ? mindDigestsErrorMessage(listResult.error) : null,
    detailError,
    detailErrorMessage: detailError ? mindDigestsErrorMessage(detailError) : null,
    generateFlash: parseMindDigestsGenerateFlash(params),
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

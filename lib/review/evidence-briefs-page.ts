import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  DEMO_WORKSPACE_ID,
  EVIDENCE_CHANGE_BRIEF_STATUSES,
} from "@/lib/review/evidence-change-brief-constants";
import {
  briefGenerationErrorMessage,
  generateDemoMagnesiumBrief,
} from "@/lib/watch/evidence-change-brief-generator";
import {
  getEvidenceChangeBriefById,
  isEvidenceChangeBriefPersistenceConfigured,
  listEvidenceChangeBriefClaimsForBrief,
  listEvidenceChangeBriefs,
  type EvidenceChangeBriefListFilters,
  type PrivacySafeEvidenceChangeBrief,
  type PrivacySafeEvidenceChangeBriefClaim,
} from "@/lib/watch/evidence-change-brief-store";
import { listClaimFamilyProfiles, type PrivacySafeClaimFamilyProfile } from "@/lib/watch/claim-family-profile-store";

export type EvidenceBriefsPageFilters = EvidenceChangeBriefListFilters;

export type EvidenceBriefsGenerateFlash =
  | { kind: "success"; duplicate_skipped?: boolean }
  | { kind: "error"; error: string; message: string };

export type EvidenceBriefsPageData = {
  configured: boolean;
  filters: EvidenceBriefsPageFilters;
  briefs: PrivacySafeEvidenceChangeBrief[];
  selectedBrief: PrivacySafeEvidenceChangeBrief | null;
  selectedBriefClaims: PrivacySafeEvidenceChangeBriefClaim[];
  claimFamilyProfiles: PrivacySafeClaimFamilyProfile[];
  defaultWorkspaceId: string;
  listError: string | null;
  listErrorMessage: string | null;
  detailError: string | null;
  detailErrorMessage: string | null;
  generateFlash: EvidenceBriefsGenerateFlash | null;
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

export function parseEvidenceBriefsPageFilters(
  params: Record<string, string | string[] | undefined>
): EvidenceBriefsPageFilters {
  const status = readParam(params, "status");

  return {
    workspace_id: readParam(params, "workspace_id") || undefined,
    claim_family: readParam(params, "claim_family") || undefined,
    status:
      status &&
      (EVIDENCE_CHANGE_BRIEF_STATUSES as readonly string[]).includes(status)
        ? (status as EvidenceBriefsPageFilters["status"])
        : undefined,
  };
}

export function parseEvidenceBriefsGenerateFlash(
  params: Record<string, string | string[] | undefined>
): EvidenceBriefsGenerateFlash | null {
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
      message: readParam(params, "generate_message") ?? briefGenerationErrorMessage(error),
    };
  }

  return null;
}

export function evidenceBriefsErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_change_briefs_table_missing":
      return "The evidence_change_briefs table is missing. Apply the Phase 28 migration in Supabase.";
    case "evidence_change_brief_claims_table_missing":
      return "The evidence_change_brief_claims table is missing. Apply the Phase 28 migration in Supabase.";
    case "forbidden":
      return "You do not have access to briefs in this workspace.";
    case "brief_not_found":
      return "Evidence change brief not found.";
    default:
      return `Server error: ${error}`;
  }
}

export async function buildEvidenceBriefsPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<EvidenceBriefsPageData> {
  const filters = parseEvidenceBriefsPageFilters(params);
  const configured = isEvidenceChangeBriefPersistenceConfigured();
  const defaultWorkspaceId =
    access.mode === "operator"
      ? (access.workspaceIds[0] ?? DEMO_WORKSPACE_ID)
      : DEMO_WORKSPACE_ID;

  if (!configured) {
    return {
      configured: false,
      filters,
      briefs: [],
      selectedBrief: null,
      selectedBriefClaims: [],
      claimFamilyProfiles: [],
      defaultWorkspaceId,
      listError: "supabase_not_configured",
      listErrorMessage: evidenceBriefsErrorMessage("supabase_not_configured"),
      detailError: null,
      detailErrorMessage: null,
      generateFlash: parseEvidenceBriefsGenerateFlash(params),
      statusOptions: EVIDENCE_CHANGE_BRIEF_STATUSES,
    };
  }

  const selectedBriefId = readParam(params, "brief_id");
  const [listResult, profileResult] = await Promise.all([
    listEvidenceChangeBriefs(access, filters),
    listClaimFamilyProfiles(),
  ]);

  let selectedBrief: PrivacySafeEvidenceChangeBrief | null = null;
  let selectedBriefClaims: PrivacySafeEvidenceChangeBriefClaim[] = [];
  let detailError: string | null = null;

  if (selectedBriefId) {
    const briefResult = await getEvidenceChangeBriefById(selectedBriefId, access);
    if (briefResult.error === "forbidden") {
      detailError = "forbidden";
    } else if (briefResult.brief) {
      selectedBrief = briefResult.brief;
      const claimsResult = await listEvidenceChangeBriefClaimsForBrief(selectedBriefId, access);
      selectedBriefClaims = claimsResult.claims;
      if (claimsResult.error && claimsResult.error !== "forbidden") {
        detailError = claimsResult.error;
      }
    } else if (briefResult.error) {
      detailError = briefResult.error;
    }
  }

  return {
    configured: true,
    filters,
    briefs: listResult.briefs,
    selectedBrief,
    selectedBriefClaims,
    claimFamilyProfiles: profileResult.profiles,
    defaultWorkspaceId,
    listError: listResult.error ?? null,
    listErrorMessage: listResult.error ? evidenceBriefsErrorMessage(listResult.error) : null,
    detailError,
    detailErrorMessage: detailError ? evidenceBriefsErrorMessage(detailError) : null,
    generateFlash: parseEvidenceBriefsGenerateFlash(params),
    statusOptions: EVIDENCE_CHANGE_BRIEF_STATUSES,
  };
}

export type DemoBriefGenerationSubmissionResult = {
  redirectPath: string;
  result: Awaited<ReturnType<typeof generateDemoMagnesiumBrief>>;
};

export async function processDemoBriefGenerationSubmission(
  access: ReviewQueueAccessContext,
  workspaceId?: string
): Promise<DemoBriefGenerationSubmissionResult> {
  const result = await generateDemoMagnesiumBrief(access, { workspaceId });

  if (!result.ok) {
    return {
      redirectPath: `/evidence-briefs?generate_error=${encodeURIComponent(result.error)}&generate_message=${encodeURIComponent(result.message)}`,
      result,
    };
  }

  if (result.duplicate_skipped) {
    return {
      redirectPath: `/evidence-briefs?brief_id=${encodeURIComponent(result.brief.id)}&generate_ok=1&duplicate_skipped=1`,
      result,
    };
  }

  return {
    redirectPath: `/evidence-briefs?brief_id=${encodeURIComponent(result.brief.id)}&generate_ok=1`,
    result,
  };
}

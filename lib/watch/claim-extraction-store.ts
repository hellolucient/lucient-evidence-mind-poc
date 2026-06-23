import {
  CANDIDATE_WELLNESS_CLAIMS_TABLE,
  CLAIM_EXTRACTION_RUNS_TABLE,
  CLAIM_SOURCE_DOCUMENTS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  DEFAULT_CLAIM_EXTRACTOR_TYPE,
  isSupportedClaimSourceType,
  type CandidateClaimStatus,
  type ClaimExtractionExtractorType,
  type ClaimExtractionRunStatus,
  type ClaimSourceType,
} from "@/lib/review/claim-extraction-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";
import type { ExtractedWellnessClaim } from "@/lib/review/wellness-claims-extractor";

export type ClaimSourceDocumentRow = {
  id: string;
  workspace_id: string;
  title: string;
  source_type: string;
  source_text: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimExtractionRunRow = {
  id: string;
  workspace_id: string;
  source_document_id: string;
  extractor_type: string;
  status: string;
  candidate_claim_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateWellnessClaimRow = {
  id: string;
  workspace_id: string;
  source_document_id: string;
  extraction_run_id: string;
  claim_text: string;
  normalized_claim_text: string;
  source_excerpt: string;
  source_location: string | null;
  claim_type: string | null;
  claim_family: string | null;
  subject: string | null;
  predicate: string | null;
  object: string | null;
  claim_strength: string;
  evidence_sensitivity: string;
  is_direct_claim: boolean;
  needs_research: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeClaimSourceDocument = {
  source_document_id: string;
  workspace_id: string;
  title: string;
  source_type: string;
  source_text: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeClaimExtractionRun = {
  extraction_id: string;
  workspace_id: string;
  source_document_id: string;
  extractor_type: string;
  status: string;
  candidate_claim_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeCandidateWellnessClaim = {
  candidate_claim_id: string;
  workspace_id: string;
  source_document_id: string;
  extraction_run_id: string;
  claim_text: string;
  normalized_claim_text: string;
  source_excerpt: string;
  source_location: string | null;
  claim_type: string | null;
  claim_family: string | null;
  subject: string | null;
  predicate: string | null;
  object: string | null;
  claim_strength: string;
  evidence_sensitivity: string;
  is_direct_claim: boolean;
  needs_research: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ClaimExtractionCreateInput = {
  workspace_id: string;
  title: string;
  source_type: ClaimSourceType;
  source_text: string;
  source_url?: string | null;
  extractor_type?: ClaimExtractionExtractorType;
};

export type ClaimExtractionCreateResult =
  | {
      ok: true;
      source_document: PrivacySafeClaimSourceDocument;
      extraction_run: PrivacySafeClaimExtractionRun;
      candidate_claims: PrivacySafeCandidateWellnessClaim[];
    }
  | { ok: false; error: string };

export type ClaimExtractionListFilters = {
  workspace_id?: string;
  limit?: number;
};

export type ClaimExtractionListResult = {
  extractions: Array<
    PrivacySafeClaimExtractionRun & {
      source_title: string;
      source_type: string;
    }
  >;
  error?: string;
};

export type ClaimExtractionDetailResult = {
  extraction: PrivacySafeClaimExtractionRun | null;
  source_document: PrivacySafeClaimSourceDocument | null;
  candidate_claims: PrivacySafeCandidateWellnessClaim[];
  error?: string;
};

export const CLAIM_EXTRACTION_PRIVATE_FIELDS = [
  "id",
  "payload_json",
  "metadata",
  "raw_payload",
  "bearer",
  "authorization",
  "actor_email",
  "latest_fingerprint",
  "conversation_alias",
] as const;

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "claim_extraction_tables_missing";
  }

  return sanitized;
}

export function isClaimExtractionPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeClaimSourceDocument(
  row: ClaimSourceDocumentRow
): PrivacySafeClaimSourceDocument {
  return {
    source_document_id: row.id,
    workspace_id: row.workspace_id,
    title: row.title,
    source_type: row.source_type,
    source_text: row.source_text,
    source_url: row.source_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPrivacySafeClaimExtractionRun(
  row: ClaimExtractionRunRow
): PrivacySafeClaimExtractionRun {
  return {
    extraction_id: row.id,
    workspace_id: row.workspace_id,
    source_document_id: row.source_document_id,
    extractor_type: row.extractor_type,
    status: row.status,
    candidate_claim_count: row.candidate_claim_count,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPrivacySafeCandidateWellnessClaim(
  row: CandidateWellnessClaimRow
): PrivacySafeCandidateWellnessClaim {
  return {
    candidate_claim_id: row.id,
    workspace_id: row.workspace_id,
    source_document_id: row.source_document_id,
    extraction_run_id: row.extraction_run_id,
    claim_text: row.claim_text,
    normalized_claim_text: row.normalized_claim_text,
    source_excerpt: row.source_excerpt,
    source_location: row.source_location,
    claim_type: row.claim_type,
    claim_family: row.claim_family,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    claim_strength: row.claim_strength,
    evidence_sensitivity: row.evidence_sensitivity,
    is_direct_claim: row.is_direct_claim,
    needs_research: row.needs_research,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function isPrivacySafeClaimExtractionPayload(payload: Record<string, unknown>): boolean {
  for (const field of CLAIM_EXTRACTION_PRIVATE_FIELDS) {
    if (field in payload) {
      return false;
    }
  }

  return true;
}

function applyAccessToListFilters(
  filters: ClaimExtractionListFilters,
  access: ReviewQueueAccessContext
): ClaimExtractionListFilters & { workspace_ids?: string[] } {
  if (access.mode === "break_glass") {
    return filters;
  }

  const allowed = access.workspaceIds;
  if (allowed.length === 0) {
    return { ...filters, workspace_ids: ["__no_workspace_access__"] };
  }

  if (filters.workspace_id) {
    if (!allowed.includes(filters.workspace_id)) {
      return { ...filters, workspace_ids: ["__no_workspace_access__"] };
    }

    return { ...filters, workspace_ids: [filters.workspace_id] };
  }

  return { ...filters, workspace_ids: allowed };
}

export async function createClaimExtraction(
  input: ClaimExtractionCreateInput,
  extractedClaims: ExtractedWellnessClaim[],
  access: ReviewQueueAccessContext
): Promise<ClaimExtractionCreateResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!input.title.trim()) {
    return { ok: false, error: "title_required" };
  }

  if (!input.source_text.trim()) {
    return { ok: false, error: "source_text_required" };
  }

  if (!isSupportedClaimSourceType(input.source_type)) {
    return { ok: false, error: "unsupported_source_type" };
  }

  if (!isClaimExtractionPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const extractorType = input.extractor_type ?? DEFAULT_CLAIM_EXTRACTOR_TYPE;
  const status: ClaimExtractionRunStatus = "completed";

  try {
    const client = createSupabaseServerClient();
    const now = new Date().toISOString();

    const { data: sourceDocument, error: sourceError } = await client
      .from(CLAIM_SOURCE_DOCUMENTS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        title: input.title.trim(),
        source_type: input.source_type,
        source_text: input.source_text.trim(),
        source_url: input.source_url?.trim() || null,
        updated_at: now,
      })
      .select("*")
      .single();

    if (sourceError || !sourceDocument) {
      return { ok: false, error: normalizeStoreError(sourceError) };
    }

    const sourceRow = sourceDocument as ClaimSourceDocumentRow;

    const { data: extractionRun, error: runError } = await client
      .from(CLAIM_EXTRACTION_RUNS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        source_document_id: sourceRow.id,
        extractor_type: extractorType,
        status,
        candidate_claim_count: extractedClaims.length,
        error_message: null,
        updated_at: now,
      })
      .select("*")
      .single();

    if (runError || !extractionRun) {
      return { ok: false, error: normalizeStoreError(runError) };
    }

    const runRow = extractionRun as ClaimExtractionRunRow;
    let candidateClaims: PrivacySafeCandidateWellnessClaim[] = [];

    if (extractedClaims.length > 0) {
      const candidateStatus: CandidateClaimStatus = "candidate";
      const { data: insertedClaims, error: claimsError } = await client
        .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
        .insert(
          extractedClaims.map((claim) => ({
            workspace_id: input.workspace_id,
            source_document_id: sourceRow.id,
            extraction_run_id: runRow.id,
            claim_text: claim.claim_text,
            normalized_claim_text: claim.normalized_claim_text,
            source_excerpt: claim.source_excerpt,
            source_location: claim.source_location,
            claim_type: claim.claim_type,
            claim_family: claim.claim_family,
            subject: claim.subject,
            predicate: claim.predicate,
            object: claim.object,
            claim_strength: claim.claim_strength,
            evidence_sensitivity: claim.evidence_sensitivity,
            is_direct_claim: claim.is_direct_claim,
            needs_research: claim.needs_research,
            status: candidateStatus,
            updated_at: now,
          }))
        )
        .select("*");

      if (claimsError) {
        return { ok: false, error: normalizeStoreError(claimsError) };
      }

      candidateClaims = ((insertedClaims ?? []) as CandidateWellnessClaimRow[]).map(
        toPrivacySafeCandidateWellnessClaim
      );
    }

    return {
      ok: true,
      source_document: toPrivacySafeClaimSourceDocument(sourceRow),
      extraction_run: toPrivacySafeClaimExtractionRun(runRow),
      candidate_claims: candidateClaims,
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listClaimExtractions(
  access: ReviewQueueAccessContext,
  filters: ClaimExtractionListFilters = {}
): Promise<ClaimExtractionListResult> {
  if (!isClaimExtractionPersistenceConfigured()) {
    return { extractions: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    const limit = filters.limit ?? 50;

    let query = client.from(CLAIM_EXTRACTION_RUNS_TABLE).select("*");

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    const { data: runs, error: runsError } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (runsError) {
      return { extractions: [], error: normalizeStoreError(runsError) };
    }

    const runRows = (runs ?? []) as ClaimExtractionRunRow[];
    if (runRows.length === 0) {
      return { extractions: [] };
    }

    const sourceDocumentIds = [...new Set(runRows.map((run) => run.source_document_id))];
    const { data: sourceDocuments, error: sourceError } = await client
      .from(CLAIM_SOURCE_DOCUMENTS_TABLE)
      .select("id, title, source_type")
      .in("id", sourceDocumentIds);

    if (sourceError) {
      return { extractions: [], error: normalizeStoreError(sourceError) };
    }

    const sourceById = new Map(
      ((sourceDocuments ?? []) as Array<{ id: string; title: string; source_type: string }>).map(
        (doc) => [doc.id, doc]
      )
    );

    return {
      extractions: runRows.map((run) => {
        const source = sourceById.get(run.source_document_id);
        const safeRun = toPrivacySafeClaimExtractionRun(run);
        return {
          ...safeRun,
          source_title: source?.title ?? "Unknown source",
          source_type: source?.source_type ?? "other",
        };
      }),
    };
  } catch (error) {
    return { extractions: [], error: normalizeStoreError(error) };
  }
}

export async function getClaimExtractionById(
  extractionId: string,
  access: ReviewQueueAccessContext
): Promise<ClaimExtractionDetailResult> {
  if (!isClaimExtractionPersistenceConfigured()) {
    return {
      extraction: null,
      source_document: null,
      candidate_claims: [],
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    const { data: run, error: runError } = await client
      .from(CLAIM_EXTRACTION_RUNS_TABLE)
      .select("*")
      .eq("id", extractionId)
      .maybeSingle();

    if (runError) {
      return {
        extraction: null,
        source_document: null,
        candidate_claims: [],
        error: normalizeStoreError(runError),
      };
    }

    if (!run) {
      return { extraction: null, source_document: null, candidate_claims: [] };
    }

    const runRow = run as ClaimExtractionRunRow;
    if (!canAccessReviewItemWorkspace(access, runRow.workspace_id)) {
      return {
        extraction: null,
        source_document: null,
        candidate_claims: [],
        error: "forbidden",
      };
    }

    const { data: sourceDocument, error: sourceError } = await client
      .from(CLAIM_SOURCE_DOCUMENTS_TABLE)
      .select("*")
      .eq("id", runRow.source_document_id)
      .maybeSingle();

    if (sourceError) {
      return {
        extraction: null,
        source_document: null,
        candidate_claims: [],
        error: normalizeStoreError(sourceError),
      };
    }

    const { data: claims, error: claimsError } = await client
      .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
      .select("*")
      .eq("extraction_run_id", runRow.id)
      .order("claim_text", { ascending: true });

    if (claimsError) {
      return {
        extraction: toPrivacySafeClaimExtractionRun(runRow),
        source_document: sourceDocument
          ? toPrivacySafeClaimSourceDocument(sourceDocument as ClaimSourceDocumentRow)
          : null,
        candidate_claims: [],
        error: normalizeStoreError(claimsError),
      };
    }

    return {
      extraction: toPrivacySafeClaimExtractionRun(runRow),
      source_document: sourceDocument
        ? toPrivacySafeClaimSourceDocument(sourceDocument as ClaimSourceDocumentRow)
        : null,
      candidate_claims: ((claims ?? []) as CandidateWellnessClaimRow[]).map(
        toPrivacySafeCandidateWellnessClaim
      ),
    };
  } catch (error) {
    return {
      extraction: null,
      source_document: null,
      candidate_claims: [],
      error: normalizeStoreError(error),
    };
  }
}

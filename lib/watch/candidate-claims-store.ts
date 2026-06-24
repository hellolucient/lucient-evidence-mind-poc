import {
  CANDIDATE_CLAIMS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  isSupportedCandidateClaimReviewStatus,
  type CandidateClaimReviewStatus,
} from "@/lib/review/mind-claim-intelligence-constants";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type CandidateClaimRow = {
  id: string;
  workspace_id: string;
  source_document_id: string | null;
  extraction_job_id: string | null;
  claim_text: string;
  exact_source_phrase: string | null;
  subject: string | null;
  predicate: string | null;
  object_or_outcome: string | null;
  claim_family: string | null;
  claim_type: string | null;
  evidence_sensitivity: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  confidence: number | null;
  reason_for_extraction: string | null;
  suggested_review_status: string | null;
  review_status: string;
  operator_edited_claim_text: string | null;
  operator_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeCandidateClaim = {
  candidate_claim_id: string;
  workspace_id: string;
  source_document_id: string | null;
  extraction_job_id: string | null;
  claim_text: string;
  exact_source_phrase: string | null;
  subject: string | null;
  predicate: string | null;
  object_or_outcome: string | null;
  claim_family: string | null;
  claim_type: string | null;
  evidence_sensitivity: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  confidence: number | null;
  reason_for_extraction: string | null;
  suggested_review_status: string | null;
  review_status: string;
  operator_edited_claim_text: string | null;
  operator_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateClaimUpdateInput = {
  claim_text?: string;
  operator_edited_claim_text?: string | null;
  operator_notes?: string | null;
  review_status?: CandidateClaimReviewStatus;
};

export const CANDIDATE_CLAIM_PRIVATE_FIELDS = ["id"] as const;

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
    return "candidate_claims_table_missing";
  }

  return sanitized;
}

export function isCandidateClaimsPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeCandidateClaim(row: CandidateClaimRow): PrivacySafeCandidateClaim {
  return {
    candidate_claim_id: row.id,
    workspace_id: row.workspace_id,
    source_document_id: row.source_document_id,
    extraction_job_id: row.extraction_job_id,
    claim_text: row.claim_text,
    exact_source_phrase: row.exact_source_phrase,
    subject: row.subject,
    predicate: row.predicate,
    object_or_outcome: row.object_or_outcome,
    claim_family: row.claim_family,
    claim_type: row.claim_type,
    evidence_sensitivity: row.evidence_sensitivity,
    risk_level: row.risk_level,
    regulatory_sensitivity: row.regulatory_sensitivity,
    confidence: row.confidence,
    reason_for_extraction: row.reason_for_extraction,
    suggested_review_status: row.suggested_review_status,
    review_status: row.review_status,
    operator_edited_claim_text: row.operator_edited_claim_text,
    operator_notes: row.operator_notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listCandidateClaimsBySourceDocument(
  sourceDocumentId: string,
  access: ReviewQueueAccessContext
): Promise<{ claims: PrivacySafeCandidateClaim[]; error?: string }> {
  if (!isCandidateClaimsPersistenceConfigured()) {
    return { claims: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CANDIDATE_CLAIMS_TABLE)
      .select("*")
      .eq("source_document_id", sourceDocumentId)
      .order("created_at", { ascending: true });

    if (error) {
      return { claims: [], error: normalizeStoreError(error) };
    }

    const rows = (data ?? []) as CandidateClaimRow[];
    const filtered = rows.filter((row) => canAccessReviewItemWorkspace(access, row.workspace_id));

    return {
      claims: filtered.map(toPrivacySafeCandidateClaim),
    };
  } catch (error) {
    return { claims: [], error: normalizeStoreError(error) };
  }
}

export async function getCandidateClaimById(
  candidateClaimId: string,
  access: ReviewQueueAccessContext
): Promise<{ claim: PrivacySafeCandidateClaim | null; error?: string }> {
  if (!isCandidateClaimsPersistenceConfigured()) {
    return { claim: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CANDIDATE_CLAIMS_TABLE)
      .select("*")
      .eq("id", candidateClaimId)
      .maybeSingle();

    if (error) {
      return { claim: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { claim: null, error: "candidate_claim_not_found" };
    }

    const row = data as CandidateClaimRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { claim: null, error: "forbidden" };
    }

    return { claim: toPrivacySafeCandidateClaim(row) };
  } catch (error) {
    return { claim: null, error: normalizeStoreError(error) };
  }
}

export async function updateCandidateClaim(
  candidateClaimId: string,
  access: ReviewQueueAccessContext,
  input: CandidateClaimUpdateInput
): Promise<
  | { ok: true; claim: PrivacySafeCandidateClaim }
  | { ok: false; error: string }
> {
  const lookup = await getCandidateClaimById(candidateClaimId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!lookup.claim) {
    return { ok: false, error: lookup.error ?? "candidate_claim_not_found" };
  }

  if (input.review_status && !isSupportedCandidateClaimReviewStatus(input.review_status)) {
    return { ok: false, error: "unsupported_review_status" };
  }

  if (!isCandidateClaimsPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.claim_text !== undefined) {
    patch.claim_text = input.claim_text.trim();
  }

  if (input.operator_edited_claim_text !== undefined) {
    patch.operator_edited_claim_text = input.operator_edited_claim_text?.trim() || null;
  }

  if (input.operator_notes !== undefined) {
    patch.operator_notes = input.operator_notes?.trim() || null;
  }

  if (input.review_status !== undefined) {
    patch.review_status = input.review_status;
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CANDIDATE_CLAIMS_TABLE)
      .update(patch)
      .eq("id", candidateClaimId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      claim: toPrivacySafeCandidateClaim(data as CandidateClaimRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

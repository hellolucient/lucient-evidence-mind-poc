import {
  CANDIDATE_CLAIMS_TABLE,
  MIND_CLAIM_EXTRACTION_JOBS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";
import type { ParsedMindClaimExtractionCandidate } from "@/lib/watch/mind-claim-extraction-contract";

export type MindClaimExtractionJobRow = {
  id: string;
  workspace_id: string;
  source_document_id: string;
  status: string;
  destination: string;
  prompt_version: string;
  output_contract_version: string;
  review_status: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  response_fetched_at: string | null;
  parsed_at: string | null;
  external_thread_id: string | null;
  external_message_id: string | null;
  mind_response_text: string | null;
  parse_error: string | null;
  cost_units: number | null;
  cost_report: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeMindClaimExtractionJob = {
  extraction_job_id: string;
  workspace_id: string;
  source_document_id: string;
  status: string;
  destination: string;
  prompt_version: string;
  output_contract_version: string;
  review_status: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  response_fetched_at: string | null;
  parsed_at: string | null;
  external_thread_id: string | null;
  external_message_id: string | null;
  mind_response_text: string | null;
  parse_error: string | null;
  cost_units: number | null;
  cost_report: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const MIND_CLAIM_EXTRACTION_JOB_PRIVATE_FIELDS = ["id"] as const;

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
    return "mind_claim_extraction_jobs_table_missing";
  }

  return sanitized;
}

export function isMindClaimExtractionPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeMindClaimExtractionJob(
  row: MindClaimExtractionJobRow
): PrivacySafeMindClaimExtractionJob {
  return {
    extraction_job_id: row.id,
    workspace_id: row.workspace_id,
    source_document_id: row.source_document_id,
    status: row.status,
    destination: row.destination,
    prompt_version: row.prompt_version,
    output_contract_version: row.output_contract_version,
    review_status: row.review_status,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    sent_at: row.sent_at,
    response_fetched_at: row.response_fetched_at,
    parsed_at: row.parsed_at,
    external_thread_id: row.external_thread_id,
    external_message_id: row.external_message_id,
    mind_response_text: row.mind_response_text,
    parse_error: row.parse_error,
    cost_units: row.cost_units,
    cost_report: row.cost_report,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createMindClaimExtractionJob(
  input: {
    workspace_id: string;
    source_document_id: string;
    created_by?: string | null;
  },
  access: ReviewQueueAccessContext
): Promise<
  | { ok: true; job: PrivacySafeMindClaimExtractionJob }
  | { ok: false; error: string }
> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!isMindClaimExtractionPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from(MIND_CLAIM_EXTRACTION_JOBS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        source_document_id: input.source_document_id,
        status: "pending_approval",
        destination: "hellominds",
        prompt_version: "mind_claim_extraction_v1",
        output_contract_version: "mind_claim_extraction_json_v1",
        review_status: "pending",
        created_by: input.created_by?.trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      job: toPrivacySafeMindClaimExtractionJob(data as MindClaimExtractionJobRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function getMindClaimExtractionJobById(
  jobId: string,
  access: ReviewQueueAccessContext
): Promise<{ job: PrivacySafeMindClaimExtractionJob | null; error?: string }> {
  if (!isMindClaimExtractionPersistenceConfigured()) {
    return { job: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_EXTRACTION_JOBS_TABLE)
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      return { job: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { job: null, error: "extraction_job_not_found" };
    }

    const row = data as MindClaimExtractionJobRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { job: null, error: "forbidden" };
    }

    return { job: toPrivacySafeMindClaimExtractionJob(row) };
  } catch (error) {
    return { job: null, error: normalizeStoreError(error) };
  }
}

export async function getLatestMindClaimExtractionJobBySourceDocumentId(
  sourceDocumentId: string,
  access: ReviewQueueAccessContext
): Promise<{ job: PrivacySafeMindClaimExtractionJob | null; error?: string }> {
  if (!isMindClaimExtractionPersistenceConfigured()) {
    return { job: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_EXTRACTION_JOBS_TABLE)
      .select("*")
      .eq("source_document_id", sourceDocumentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { job: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { job: null };
    }

    const row = data as MindClaimExtractionJobRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { job: null, error: "forbidden" };
    }

    return { job: toPrivacySafeMindClaimExtractionJob(row) };
  } catch (error) {
    return { job: null, error: normalizeStoreError(error) };
  }
}

export async function updateMindClaimExtractionJob(
  jobId: string,
  access: ReviewQueueAccessContext,
  patch: Partial<{
    status: string;
    review_status: string;
    approved_by: string | null;
    approved_at: string | null;
    sent_at: string | null;
    response_fetched_at: string | null;
    parsed_at: string | null;
    external_thread_id: string | null;
    external_message_id: string | null;
    mind_response_text: string | null;
    parse_error: string | null;
    cost_units: number | null;
    cost_report: Record<string, unknown> | null;
  }>
): Promise<
  | { ok: true; job: PrivacySafeMindClaimExtractionJob }
  | { ok: false; error: string }
> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!lookup.job) {
    return { ok: false, error: lookup.error ?? "extraction_job_not_found" };
  }

  if (!isMindClaimExtractionPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_EXTRACTION_JOBS_TABLE)
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      job: toPrivacySafeMindClaimExtractionJob(data as MindClaimExtractionJobRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function countCandidateClaimsForExtractionJob(
  extractionJobId: string
): Promise<number> {
  if (!isMindClaimExtractionPersistenceConfigured()) {
    return 0;
  }

  try {
    const client = createSupabaseServerClient();
    const { count, error } = await client
      .from(CANDIDATE_CLAIMS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("extraction_job_id", extractionJobId);

    if (error) {
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function insertCandidateClaimsFromExtraction(
  input: {
    workspace_id: string;
    source_document_id: string;
    extraction_job_id: string;
    claims: ParsedMindClaimExtractionCandidate[];
    created_by?: string | null;
  },
  access: ReviewQueueAccessContext
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (input.claims.length === 0) {
    return { ok: true, count: 0 };
  }

  if (!isMindClaimExtractionPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const now = new Date().toISOString();
    const rows = input.claims.map((claim) => ({
      workspace_id: input.workspace_id,
      source_document_id: input.source_document_id,
      extraction_job_id: input.extraction_job_id,
      claim_text: claim.claim_text,
      exact_source_phrase: claim.exact_source_phrase,
      subject: claim.subject,
      predicate: claim.predicate,
      object_or_outcome: claim.object_or_outcome,
      claim_family: claim.claim_family,
      claim_type: claim.claim_type,
      evidence_sensitivity: claim.evidence_sensitivity,
      risk_level: claim.risk_level,
      regulatory_sensitivity: claim.regulatory_sensitivity,
      confidence: claim.confidence,
      reason_for_extraction: claim.reason_for_extraction,
      suggested_review_status: claim.suggested_review_status,
      review_status: "pending",
      created_by: input.created_by?.trim() || null,
      created_at: now,
      updated_at: now,
    }));

    const { error } = await client.from(CANDIDATE_CLAIMS_TABLE).insert(rows);
    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return { ok: true, count: rows.length };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

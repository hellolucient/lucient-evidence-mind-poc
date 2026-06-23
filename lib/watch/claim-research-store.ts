/**
 * Phase 44C — durable claim research runs and citations persistence.
 *
 * SAFETY: Controlled single-claim research only.
 * Must not send Mind digests or call HelloMinds send/live-send/retry paths.
 */
import {
  CLAIM_RESEARCH_CITATIONS_TABLE,
  CLAIM_RESEARCH_RUNS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
  WELLNESS_CLAIMS_TABLE,
} from "@/engine/watchlist/supabase-client";
import type { WellnessClaimResearchStatus } from "@/lib/review/claim-registry-constants";
import { isSupportedWellnessClaimResearchStatus } from "@/lib/review/claim-registry-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  getWellnessClaimById,
  type PrivacySafeWellnessClaim,
} from "@/lib/watch/wellness-claims-store";
import {
  runControlledClaimResearch,
  type ControlledResearchCitation,
  type ControlledResearchResult,
} from "@/lib/watch/evidence-research-runner";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ClaimResearchRunRow = {
  id: string;
  workspace_id: string;
  claim_id: string;
  status: string;
  research_mode: string;
  query_text: string;
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  risk_score: number | null;
  summary: string | null;
  safer_wording: string | null;
  research_notes: string | null;
  citation_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimResearchCitationRow = {
  id: string;
  workspace_id: string;
  claim_id: string;
  research_run_id: string;
  title: string;
  source: string;
  url: string | null;
  publication_year: number | null;
  evidence_type: string | null;
  relevance: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeClaimResearchCitation = {
  citation_id: string;
  title: string;
  source: string;
  url: string | null;
  publication_year: number | null;
  evidence_type: string | null;
  relevance: string;
  summary: string | null;
  created_at: string;
};

export type PrivacySafeClaimResearchRun = {
  research_run_id: string;
  claim_id: string;
  workspace_id: string;
  status: string;
  research_mode: string;
  query_text: string;
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  risk_score: number | null;
  summary: string | null;
  safer_wording: string | null;
  research_notes: string | null;
  citation_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  citations?: PrivacySafeClaimResearchCitation[];
};

export type ClaimResearchRunListResult = {
  runs: PrivacySafeClaimResearchRun[];
  error?: string;
};

export type ClaimResearchRunLookupResult = {
  run: PrivacySafeClaimResearchRun | null;
  error?: string;
};

export type RunClaimResearchResult =
  | {
      ok: true;
      run: PrivacySafeClaimResearchRun;
      claim: PrivacySafeWellnessClaim;
    }
  | { ok: false; error: string };

export const CLAIM_RESEARCH_PRIVATE_FIELDS = ["id", "payload_json", "metadata"] as const;

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
    return "claim_research_tables_missing";
  }

  return sanitized;
}

export function isClaimResearchPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeClaimResearchCitation(
  row: ClaimResearchCitationRow
): PrivacySafeClaimResearchCitation {
  return {
    citation_id: row.id,
    title: row.title,
    source: row.source,
    url: row.url,
    publication_year: row.publication_year,
    evidence_type: row.evidence_type,
    relevance: row.relevance,
    summary: row.summary,
    created_at: row.created_at,
  };
}

export function toPrivacySafeClaimResearchRun(
  row: ClaimResearchRunRow,
  citations: PrivacySafeClaimResearchCitation[] = []
): PrivacySafeClaimResearchRun {
  return {
    research_run_id: row.id,
    claim_id: row.claim_id,
    workspace_id: row.workspace_id,
    status: row.status,
    research_mode: row.research_mode,
    query_text: row.query_text,
    evidence_posture: row.evidence_posture,
    evidence_strength: row.evidence_strength,
    risk_level: row.risk_level,
    risk_score: row.risk_score,
    summary: row.summary,
    safer_wording: row.safer_wording,
    research_notes: row.research_notes,
    citation_count: row.citation_count,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    citations: citations.length > 0 ? citations : undefined,
  };
}

export function isPrivacySafeClaimResearchPayload(payload: Record<string, unknown>): boolean {
  for (const field of CLAIM_RESEARCH_PRIVATE_FIELDS) {
    if (field in payload) {
      return false;
    }
  }

  return true;
}

function isResearchEligibleClaim(claim: PrivacySafeWellnessClaim): boolean {
  return claim.status === "active" && claim.review_status === "accepted";
}

async function updateWellnessClaimResearchStatus(
  claimId: string,
  researchStatus: WellnessClaimResearchStatus
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupportedWellnessClaimResearchStatus(researchStatus)) {
    return { ok: false, error: "unsupported_research_status" };
  }

  try {
    const client = createSupabaseServerClient();
    const { error } = await client
      .from(WELLNESS_CLAIMS_TABLE)
      .update({ research_status: researchStatus, updated_at: new Date().toISOString() })
      .eq("id", claimId);

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

async function insertResearchRun(
  claim: PrivacySafeWellnessClaim,
  result: ControlledResearchResult
): Promise<{ row: ClaimResearchRunRow | null; error?: string }> {
  const now = new Date().toISOString();
  const insert = {
    workspace_id: claim.workspace_id,
    claim_id: claim.claim_id,
    status: "completed",
    research_mode: result.research_mode,
    query_text: result.query_text,
    evidence_posture: result.evidence_posture,
    evidence_strength: result.evidence_strength,
    risk_level: result.risk_level,
    risk_score: result.risk_score,
    summary: result.summary,
    safer_wording: result.safer_wording,
    research_notes: result.research_notes,
    citation_count: result.citations.length,
    error_message: null,
    updated_at: now,
  };

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_RESEARCH_RUNS_TABLE)
      .insert(insert)
      .select("*")
      .single();

    if (error || !data) {
      return { row: null, error: normalizeStoreError(error) };
    }

    return { row: data as ClaimResearchRunRow };
  } catch (error) {
    return { row: null, error: normalizeStoreError(error) };
  }
}

async function insertFailedResearchRun(
  claim: PrivacySafeWellnessClaim,
  queryText: string,
  errorMessage: string
): Promise<{ row: ClaimResearchRunRow | null; error?: string }> {
  const now = new Date().toISOString();
  const insert = {
    workspace_id: claim.workspace_id,
    claim_id: claim.claim_id,
    status: "failed",
    research_mode: "mock_evidence_v1",
    query_text: queryText,
    evidence_posture: null,
    evidence_strength: null,
    risk_level: null,
    risk_score: null,
    summary: null,
    safer_wording: null,
    research_notes: null,
    citation_count: 0,
    error_message: errorMessage,
    updated_at: now,
  };

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_RESEARCH_RUNS_TABLE)
      .insert(insert)
      .select("*")
      .single();

    if (error || !data) {
      return { row: null, error: normalizeStoreError(error) };
    }

    return { row: data as ClaimResearchRunRow };
  } catch (error) {
    return { row: null, error: normalizeStoreError(error) };
  }
}

async function insertCitations(
  claim: PrivacySafeWellnessClaim,
  researchRunId: string,
  citations: ControlledResearchCitation[]
): Promise<{ citations: PrivacySafeClaimResearchCitation[]; error?: string }> {
  if (citations.length === 0) {
    return { citations: [] };
  }

  const now = new Date().toISOString();
  const rows = citations.map((citation) => ({
    workspace_id: claim.workspace_id,
    claim_id: claim.claim_id,
    research_run_id: researchRunId,
    title: citation.title,
    source: citation.source,
    url: citation.url,
    publication_year: citation.publication_year,
    evidence_type: citation.evidence_type,
    relevance: citation.relevance,
    summary: citation.summary,
    updated_at: now,
  }));

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_RESEARCH_CITATIONS_TABLE)
      .insert(rows)
      .select("*");

    if (error) {
      return { citations: [], error: normalizeStoreError(error) };
    }

    return {
      citations: ((data ?? []) as ClaimResearchCitationRow[]).map(toPrivacySafeClaimResearchCitation),
    };
  } catch (error) {
    return { citations: [], error: normalizeStoreError(error) };
  }
}

async function loadCitationsForRun(
  researchRunId: string
): Promise<{ citations: PrivacySafeClaimResearchCitation[]; error?: string }> {
  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_RESEARCH_CITATIONS_TABLE)
      .select("*")
      .eq("research_run_id", researchRunId)
      .order("created_at", { ascending: true });

    if (error) {
      return { citations: [], error: normalizeStoreError(error) };
    }

    return {
      citations: ((data ?? []) as ClaimResearchCitationRow[]).map(toPrivacySafeClaimResearchCitation),
    };
  } catch (error) {
    return { citations: [], error: normalizeStoreError(error) };
  }
}

export async function listClaimResearchRuns(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<ClaimResearchRunListResult> {
  if (!isClaimResearchPersistenceConfigured()) {
    return { runs: [], error: "supabase_not_configured" };
  }

  const claimLookup = await getWellnessClaimById(claimId, access);
  if (claimLookup.error === "forbidden") {
    return { runs: [], error: "forbidden" };
  }

  if (!claimLookup.claim) {
    return { runs: [], error: "claim_not_found" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_RESEARCH_RUNS_TABLE)
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false });

    if (error) {
      return { runs: [], error: normalizeStoreError(error) };
    }

    return {
      runs: ((data ?? []) as ClaimResearchRunRow[]).map((row) => toPrivacySafeClaimResearchRun(row)),
    };
  } catch (error) {
    return { runs: [], error: normalizeStoreError(error) };
  }
}

export async function getClaimResearchRunById(
  claimId: string,
  researchRunId: string,
  access: ReviewQueueAccessContext
): Promise<ClaimResearchRunLookupResult> {
  if (!isClaimResearchPersistenceConfigured()) {
    return { run: null, error: "supabase_not_configured" };
  }

  const claimLookup = await getWellnessClaimById(claimId, access);
  if (claimLookup.error === "forbidden") {
    return { run: null, error: "forbidden" };
  }

  if (!claimLookup.claim) {
    return { run: null, error: "claim_not_found" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_RESEARCH_RUNS_TABLE)
      .select("*")
      .eq("id", researchRunId)
      .eq("claim_id", claimId)
      .maybeSingle();

    if (error) {
      return { run: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { run: null };
    }

    const row = data as ClaimResearchRunRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { run: null, error: "forbidden" };
    }

    const citationsResult = await loadCitationsForRun(researchRunId);
    if (citationsResult.error) {
      return { run: null, error: citationsResult.error };
    }

    return {
      run: toPrivacySafeClaimResearchRun(row, citationsResult.citations),
    };
  } catch (error) {
    return { run: null, error: normalizeStoreError(error) };
  }
}

export async function runControlledClaimResearchForClaim(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<RunClaimResearchResult> {
  if (!isClaimResearchPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const claimLookup = await getWellnessClaimById(claimId, access);
  if (claimLookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!claimLookup.claim) {
    return { ok: false, error: "claim_not_found" };
  }

  const claim = claimLookup.claim;
  if (!isResearchEligibleClaim(claim)) {
    return { ok: false, error: "claim_not_research_eligible" };
  }

  const researchOutput = runControlledClaimResearch(claim);
  if (!researchOutput.ok) {
    const failedRun = await insertFailedResearchRun(
      claim,
      claim.claim_text,
      researchOutput.error_message
    );
    if (failedRun.error || !failedRun.row) {
      return { ok: false, error: failedRun.error ?? "research_run_insert_failed" };
    }

    return { ok: false, error: researchOutput.error_message };
  }

  const insertedRun = await insertResearchRun(claim, researchOutput);
  if (insertedRun.error || !insertedRun.row) {
    return { ok: false, error: insertedRun.error ?? "research_run_insert_failed" };
  }

  const citationsResult = await insertCitations(
    claim,
    insertedRun.row.id,
    researchOutput.citations
  );
  if (citationsResult.error) {
    return { ok: false, error: citationsResult.error };
  }

  const statusUpdate = await updateWellnessClaimResearchStatus(claim.claim_id, "completed");
  if (!statusUpdate.ok) {
    return { ok: false, error: statusUpdate.error ?? "research_status_update_failed" };
  }

  const refreshedClaim = await getWellnessClaimById(claimId, access);
  const updatedClaim = refreshedClaim.claim ?? {
    ...claim,
    research_status: "completed",
  };

  return {
    ok: true,
    run: toPrivacySafeClaimResearchRun(insertedRun.row, citationsResult.citations),
    claim: updatedClaim,
  };
}

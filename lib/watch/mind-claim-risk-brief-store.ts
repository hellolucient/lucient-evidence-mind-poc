import {
  MIND_CLAIM_RISK_BRIEF_JOBS_TABLE,
  MIND_CLAIM_RISK_BRIEFS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";
import type { ParsedMindClaimRiskBrief } from "@/lib/watch/mind-claim-risk-brief-contract";

export type MindClaimRiskBriefJobRow = {
  id: string;
  workspace_id: string;
  client_claim_id: string;
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
  outbound_prompt_text?: string | null;
  mind_response_text: string | null;
  parse_error: string | null;
  cost_units: number | null;
  cost_report: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MindClaimRiskBriefRow = {
  id: string;
  workspace_id: string;
  client_claim_id: string;
  risk_brief_job_id: string | null;
  contract_version?: string | null;
  source_context?: string | null;
  search_capability_statement: string | null;
  searches_performed: unknown;
  evidence_found: unknown;
  evidence_not_found: unknown;
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  safer_wording: string | null;
  operator_recommendation: string | null;
  key_evidence_risk_insight: string | null;
  limitations: string | null;
  pmids: string[];
  dois: string[];
  urls: string[];
  verification_summary?: Record<string, unknown> | null;
  cost_report: Record<string, unknown> | null;
  created_at: string;
};

export type PrivacySafeMindClaimRiskBriefJob = {
  risk_brief_job_id: string;
  workspace_id: string;
  client_claim_id: string;
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
  outbound_prompt_text: string | null;
  mind_response_text: string | null;
  parse_error: string | null;
  cost_units: number | null;
  cost_report: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeMindClaimRiskBrief = {
  risk_brief_id: string;
  workspace_id: string;
  client_claim_id: string;
  risk_brief_job_id: string | null;
  contract_version: string | null;
  source_context: string | null;
  search_capability_statement: string | null;
  searches_performed: unknown[];
  evidence_found: unknown[];
  evidence_not_found: unknown[];
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  safer_wording: string | null;
  operator_recommendation: string | null;
  key_evidence_risk_insight: string | null;
  limitations: string | null;
  pmids: string[];
  dois: string[];
  urls: string[];
  verification_summary: Record<string, unknown> | null;
  cost_report: Record<string, unknown> | null;
  created_at: string;
};

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
    return "mind_claim_risk_brief_tables_missing";
  }

  return sanitized;
}

export function isMindClaimRiskBriefPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeMindClaimRiskBriefJob(
  row: MindClaimRiskBriefJobRow
): PrivacySafeMindClaimRiskBriefJob {
  return {
    risk_brief_job_id: row.id,
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
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
    outbound_prompt_text: row.outbound_prompt_text ?? null,
    mind_response_text: row.mind_response_text,
    parse_error: row.parse_error,
    cost_units: row.cost_units,
    cost_report: row.cost_report,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPrivacySafeMindClaimRiskBrief(
  row: MindClaimRiskBriefRow
): PrivacySafeMindClaimRiskBrief {
  return {
    risk_brief_id: row.id,
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
    risk_brief_job_id: row.risk_brief_job_id,
    contract_version: row.contract_version ?? null,
    source_context: row.source_context ?? null,
    search_capability_statement: row.search_capability_statement,
    searches_performed: Array.isArray(row.searches_performed) ? row.searches_performed : [],
    evidence_found: Array.isArray(row.evidence_found) ? row.evidence_found : [],
    evidence_not_found: Array.isArray(row.evidence_not_found) ? row.evidence_not_found : [],
    evidence_posture: row.evidence_posture,
    evidence_strength: row.evidence_strength,
    risk_level: row.risk_level,
    regulatory_sensitivity: row.regulatory_sensitivity,
    safer_wording: row.safer_wording,
    operator_recommendation: row.operator_recommendation,
    key_evidence_risk_insight: row.key_evidence_risk_insight,
    limitations: row.limitations,
    pmids: row.pmids ?? [],
    dois: row.dois ?? [],
    urls: row.urls ?? [],
    verification_summary: row.verification_summary ?? null,
    cost_report: row.cost_report,
    created_at: row.created_at,
  };
}

export async function createMindClaimRiskBriefJob(
  input: {
    workspace_id: string;
    client_claim_id: string;
    created_by?: string | null;
    prompt_version?: string | null;
    output_contract_version?: string | null;
  },
  access: ReviewQueueAccessContext
): Promise<
  | { ok: true; job: PrivacySafeMindClaimRiskBriefJob }
  | { ok: false; error: string }
> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEF_JOBS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        client_claim_id: input.client_claim_id,
        status: "pending_approval",
        destination: "hellominds",
        prompt_version: input.prompt_version?.trim() || "mind_claim_risk_brief_live_research_v2",
        output_contract_version:
          input.output_contract_version?.trim() || "mind_claim_risk_brief_json_v2",
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
      job: toPrivacySafeMindClaimRiskBriefJob(data as MindClaimRiskBriefJobRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function getMindClaimRiskBriefJobById(
  jobId: string,
  access: ReviewQueueAccessContext
): Promise<{ job: PrivacySafeMindClaimRiskBriefJob | null; error?: string }> {
  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { job: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEF_JOBS_TABLE)
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      return { job: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { job: null, error: "risk_brief_job_not_found" };
    }

    const row = data as MindClaimRiskBriefJobRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { job: null, error: "forbidden" };
    }

    return { job: toPrivacySafeMindClaimRiskBriefJob(row) };
  } catch (error) {
    return { job: null, error: normalizeStoreError(error) };
  }
}

export async function getLatestMindClaimRiskBriefJobByClientClaim(
  clientClaimId: string,
  access: ReviewQueueAccessContext
): Promise<{ job: PrivacySafeMindClaimRiskBriefJob | null; error?: string }> {
  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { job: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEF_JOBS_TABLE)
      .select("*")
      .eq("client_claim_id", clientClaimId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { job: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { job: null, error: "risk_brief_job_not_found" };
    }

    const row = data as MindClaimRiskBriefJobRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { job: null, error: "forbidden" };
    }

    return { job: toPrivacySafeMindClaimRiskBriefJob(row) };
  } catch (error) {
    return { job: null, error: normalizeStoreError(error) };
  }
}

export async function updateMindClaimRiskBriefJob(
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
    outbound_prompt_text: string | null;
    mind_response_text: string | null;
    parse_error: string | null;
    cost_units: number | null;
    cost_report: Record<string, unknown> | null;
  }>
): Promise<
  | { ok: true; job: PrivacySafeMindClaimRiskBriefJob }
  | { ok: false; error: string }
> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!lookup.job) {
    return { ok: false, error: lookup.error ?? "risk_brief_job_not_found" };
  }

  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEF_JOBS_TABLE)
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
      job: toPrivacySafeMindClaimRiskBriefJob(data as MindClaimRiskBriefJobRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function getMindClaimRiskBriefByJobId(
  riskBriefJobId: string
): Promise<PrivacySafeMindClaimRiskBrief | null> {
  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return null;
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEFS_TABLE)
      .select("*")
      .eq("risk_brief_job_id", riskBriefJobId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toPrivacySafeMindClaimRiskBrief(data as MindClaimRiskBriefRow);
  } catch {
    return null;
  }
}

export async function listMindClaimRiskBriefsByClientClaim(
  clientClaimId: string,
  access: ReviewQueueAccessContext
): Promise<{ briefs: PrivacySafeMindClaimRiskBrief[]; error?: string }> {
  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { briefs: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEFS_TABLE)
      .select("*")
      .eq("client_claim_id", clientClaimId)
      .order("created_at", { ascending: false });

    if (error) {
      return { briefs: [], error: normalizeStoreError(error) };
    }

    const rows = (data ?? []) as MindClaimRiskBriefRow[];
    const filtered = rows.filter((row) => canAccessReviewItemWorkspace(access, row.workspace_id));

    return {
      briefs: filtered.map(toPrivacySafeMindClaimRiskBrief),
    };
  } catch (error) {
    return { briefs: [], error: normalizeStoreError(error) };
  }
}

export async function getMindClaimRiskBriefById(
  riskBriefId: string,
  access: ReviewQueueAccessContext
): Promise<{ brief: PrivacySafeMindClaimRiskBrief | null; error?: string }> {
  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { brief: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEFS_TABLE)
      .select("*")
      .eq("id", riskBriefId)
      .maybeSingle();

    if (error) {
      return { brief: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { brief: null, error: "risk_brief_not_found" };
    }

    const row = data as MindClaimRiskBriefRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { brief: null, error: "forbidden" };
    }

    return { brief: toPrivacySafeMindClaimRiskBrief(row) };
  } catch (error) {
    return { brief: null, error: normalizeStoreError(error) };
  }
}

export async function insertMindClaimRiskBrief(
  input: {
    workspace_id: string;
    client_claim_id: string;
    risk_brief_job_id: string;
    parsed: ParsedMindClaimRiskBrief;
  },
  access: ReviewQueueAccessContext
): Promise<
  | { ok: true; brief: PrivacySafeMindClaimRiskBrief }
  | { ok: false; error: string }
> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!isMindClaimRiskBriefPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(MIND_CLAIM_RISK_BRIEFS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        client_claim_id: input.client_claim_id,
        risk_brief_job_id: input.risk_brief_job_id,
        contract_version: input.parsed.contract_version ?? null,
        source_context: input.parsed.source_context ?? null,
        search_capability_statement: input.parsed.search_capability_statement,
        searches_performed: input.parsed.searches_performed,
        evidence_found: input.parsed.evidence_found,
        evidence_not_found: input.parsed.evidence_not_found,
        evidence_posture: input.parsed.evidence_posture,
        evidence_strength: input.parsed.evidence_strength,
        risk_level: input.parsed.risk_level,
        regulatory_sensitivity: input.parsed.regulatory_sensitivity,
        safer_wording: input.parsed.safer_wording,
        operator_recommendation: input.parsed.operator_recommendation,
        key_evidence_risk_insight: input.parsed.key_evidence_risk_insight,
        limitations: input.parsed.limitations,
        pmids: input.parsed.pmids,
        dois: input.parsed.dois,
        urls: input.parsed.urls,
        verification_summary: input.parsed.verification_summary ?? null,
        cost_report: input.parsed.cost_report,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      brief: toPrivacySafeMindClaimRiskBrief(data as MindClaimRiskBriefRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

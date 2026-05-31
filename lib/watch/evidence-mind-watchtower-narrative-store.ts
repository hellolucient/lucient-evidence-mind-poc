import {
  EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedWatchtowerNarrativeConfidenceLevel,
  isSupportedWatchtowerNarrativeGenerationMethod,
  isSupportedWatchtowerNarrativeRiskPosture,
  isSupportedWatchtowerNarrativeType,
  type WatchtowerNarrativeConfidenceLevel,
  type WatchtowerNarrativeGenerationMethod,
  type WatchtowerNarrativeRiskPosture,
  type WatchtowerNarrativeType,
} from "@/lib/review/evidence-mind-watchtower-narrative-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type WatchtowerNarrativeRow = {
  id: string;
  workspace_id: string;
  digest_id: string | null;
  claim_family: string | null;
  narrative_type: string;
  narrative_version: string;
  title: string;
  summary_text: string;
  what_changed_text: string | null;
  why_it_matters_text: string | null;
  operator_focus_text: string | null;
  recommended_next_action_text: string | null;
  risk_posture: string;
  confidence_level: string | null;
  source_counts_json: Record<string, unknown> | null;
  referenced_entities_json: Record<string, unknown> | null;
  generation_method: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeWatchtowerNarrative = {
  id: string;
  workspace_id: string;
  digest_id: string | null;
  claim_family: string | null;
  narrative_type: WatchtowerNarrativeType;
  narrative_version: string;
  title: string;
  summary_text: string;
  what_changed_text: string | null;
  why_it_matters_text: string | null;
  operator_focus_text: string | null;
  recommended_next_action_text: string | null;
  risk_posture: WatchtowerNarrativeRiskPosture;
  confidence_level: WatchtowerNarrativeConfidenceLevel | null;
  source_counts_json: Record<string, unknown> | null;
  referenced_entities_json: Record<string, unknown> | null;
  generation_method: WatchtowerNarrativeGenerationMethod;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

export type WatchtowerNarrativeInsertInput = {
  workspace_id: string;
  digest_id?: string | null;
  claim_family?: string | null;
  narrative_type: WatchtowerNarrativeType;
  narrative_version: string;
  title: string;
  summary_text: string;
  what_changed_text?: string | null;
  why_it_matters_text?: string | null;
  operator_focus_text?: string | null;
  recommended_next_action_text?: string | null;
  risk_posture: WatchtowerNarrativeRiskPosture;
  confidence_level?: WatchtowerNarrativeConfidenceLevel | null;
  source_counts_json?: Record<string, unknown> | null;
  referenced_entities_json?: Record<string, unknown> | null;
  generation_method: WatchtowerNarrativeGenerationMethod;
  generated_at?: string;
};

export type WatchtowerNarrativeInsertResult =
  | { ok: true; narrative: PrivacySafeWatchtowerNarrative }
  | { ok: false; error: string };

export type WatchtowerNarrativeLookupResult = {
  narrative: PrivacySafeWatchtowerNarrative | null;
  error?: string;
};

export const NARRATIVE_PRIVATE_FIELDS = [
  "source_counts_json",
  "referenced_entities_json",
] as const;

export const NARRATIVE_DISPLAY_FIELDS = [
  "id",
  "workspace_id",
  "digest_id",
  "claim_family",
  "narrative_type",
  "narrative_version",
  "title",
  "summary_text",
  "what_changed_text",
  "why_it_matters_text",
  "operator_focus_text",
  "recommended_next_action_text",
  "risk_posture",
  "confidence_level",
  "generation_method",
  "generated_at",
  "created_at",
  "updated_at",
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

function isDuplicateActiveNarrativeError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "23505" &&
    (message.includes("evidence_mind_watchtower_narratives_digest_type_version_idx") ||
      message.includes("duplicate key") ||
      message.includes("unique constraint"))
  );
}

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "evidence_mind_watchtower_narratives_table_missing";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    isDuplicateActiveNarrativeError(error as { code?: string; message?: string })
  ) {
    return "duplicate_active_narrative";
  }

  return sanitized;
}

export function isWatchtowerNarrativePersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeWatchtowerNarrative(
  row: WatchtowerNarrativeRow
): PrivacySafeWatchtowerNarrative {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    digest_id: row.digest_id,
    claim_family: row.claim_family,
    narrative_type: isSupportedWatchtowerNarrativeType(row.narrative_type)
      ? row.narrative_type
      : "digest_interpretation",
    narrative_version: row.narrative_version,
    title: row.title,
    summary_text: row.summary_text,
    what_changed_text: row.what_changed_text,
    why_it_matters_text: row.why_it_matters_text,
    operator_focus_text: row.operator_focus_text,
    recommended_next_action_text: row.recommended_next_action_text,
    risk_posture: isSupportedWatchtowerNarrativeRiskPosture(row.risk_posture)
      ? row.risk_posture
      : "unknown",
    confidence_level:
      row.confidence_level && isSupportedWatchtowerNarrativeConfidenceLevel(row.confidence_level)
        ? row.confidence_level
        : null,
    source_counts_json: row.source_counts_json,
    referenced_entities_json: row.referenced_entities_json,
    generation_method: isSupportedWatchtowerNarrativeGenerationMethod(row.generation_method)
      ? row.generation_method
      : "deterministic_template",
    generated_at: row.generated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function isPrivacySafeWatchtowerNarrativePayload(
  narrative: Record<string, unknown>
): boolean {
  for (const field of NARRATIVE_PRIVATE_FIELDS) {
    if (field in narrative) {
      return false;
    }
  }

  return NARRATIVE_DISPLAY_FIELDS.every((field) => field in narrative);
}

export async function createWatchtowerNarrative(
  input: WatchtowerNarrativeInsertInput,
  access: ReviewQueueAccessContext
): Promise<WatchtowerNarrativeInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (
    !input.workspace_id.trim() ||
    !input.narrative_version.trim() ||
    !input.title.trim() ||
    !input.summary_text.trim()
  ) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (!isSupportedWatchtowerNarrativeType(input.narrative_type)) {
    return { ok: false, error: "unsupported_narrative_type" };
  }

  if (!isSupportedWatchtowerNarrativeRiskPosture(input.risk_posture)) {
    return { ok: false, error: "unsupported_risk_posture" };
  }

  if (!isSupportedWatchtowerNarrativeGenerationMethod(input.generation_method)) {
    return { ok: false, error: "unsupported_generation_method" };
  }

  if (
    input.confidence_level &&
    !isSupportedWatchtowerNarrativeConfidenceLevel(input.confidence_level)
  ) {
    return { ok: false, error: "unsupported_confidence_level" };
  }

  if (!isWatchtowerNarrativePersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        digest_id: input.digest_id ?? null,
        claim_family: input.claim_family ?? null,
        narrative_type: input.narrative_type,
        narrative_version: input.narrative_version.trim(),
        title: input.title.trim(),
        summary_text: input.summary_text.trim(),
        what_changed_text: input.what_changed_text ?? null,
        why_it_matters_text: input.why_it_matters_text ?? null,
        operator_focus_text: input.operator_focus_text ?? null,
        recommended_next_action_text: input.recommended_next_action_text ?? null,
        risk_posture: input.risk_posture,
        confidence_level: input.confidence_level ?? null,
        source_counts_json: input.source_counts_json ?? null,
        referenced_entities_json: input.referenced_entities_json ?? null,
        generation_method: input.generation_method,
        generated_at: input.generated_at ?? new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      narrative: toPrivacySafeWatchtowerNarrative(data as WatchtowerNarrativeRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function findWatchtowerNarrativeForDigest(
  digestId: string,
  narrativeType: WatchtowerNarrativeType,
  narrativeVersion: string,
  access: ReviewQueueAccessContext
): Promise<WatchtowerNarrativeLookupResult> {
  if (!digestId.trim()) {
    return { narrative: null, error: "required_fields_missing" };
  }

  if (!isWatchtowerNarrativePersistenceConfigured()) {
    return { narrative: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE)
      .select("*")
      .eq("digest_id", digestId)
      .eq("narrative_type", narrativeType)
      .eq("narrative_version", narrativeVersion)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { narrative: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { narrative: null };
    }

    const narrative = toPrivacySafeWatchtowerNarrative(data as WatchtowerNarrativeRow);
    if (!canAccessReviewItemWorkspace(access, narrative.workspace_id)) {
      return { narrative: null, error: "forbidden" };
    }

    return { narrative };
  } catch (error) {
    return { narrative: null, error: normalizeStoreError(error) };
  }
}

export async function getWatchtowerNarrativeById(
  narrativeId: string,
  access: ReviewQueueAccessContext
): Promise<WatchtowerNarrativeLookupResult> {
  if (!narrativeId.trim()) {
    return { narrative: null, error: "required_fields_missing" };
  }

  if (!isWatchtowerNarrativePersistenceConfigured()) {
    return { narrative: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE)
      .select("*")
      .eq("id", narrativeId)
      .maybeSingle();

    if (error) {
      return { narrative: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { narrative: null };
    }

    const narrative = toPrivacySafeWatchtowerNarrative(data as WatchtowerNarrativeRow);
    if (!canAccessReviewItemWorkspace(access, narrative.workspace_id)) {
      return { narrative: null, error: "forbidden" };
    }

    return { narrative };
  } catch (error) {
    return { narrative: null, error: normalizeStoreError(error) };
  }
}

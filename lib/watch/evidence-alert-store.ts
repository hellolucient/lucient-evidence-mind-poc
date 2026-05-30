import type { EvidenceSource } from "@/lib/evidence-stubs";
import type { WatchCheckResponse } from "@/lib/watch-check";
import type { RunDueResponse, WatchRunTopicResult } from "@/lib/watch-run-due";
import type { WatchTopicState } from "@/lib/watchlist-state";
import {
  createSupabaseServerClient,
  EVIDENCE_ALERTS_TABLE,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { sanitizeWatchRunErrorMessage } from "./watch-run-logger";

export type EvidenceAlertPersistenceResult = {
  configured: boolean;
  persisted: boolean;
  evidence_alerts_logged: number;
  evidence_alerts_duplicate_skipped: number;
  evidence_alert_ids: string[];
  evidence_alerts_error?: string;
};

export type EvidenceAlertCandidate = {
  watchlist_item_id: string;
  claim_family: string;
  intervention: string | null;
  outcome: string | null;
  query: string | null;
  source: string;
  external_id: string;
  external_id_type: string;
  title: string | null;
  abstract: string | null;
  publication_date: string | null;
  journal: string | null;
  authors: unknown | null;
  url: string | null;
  alert_type: string;
  severity: string | null;
  raw_payload: Record<string, unknown> | null;
};

type EvidenceAlertInsertRow = {
  watch_run_id: string | null;
  watchlist_item_id: string;
  claim_family: string;
  intervention: string | null;
  outcome: string | null;
  query: string | null;
  source: string;
  external_id: string;
  external_id_type: string;
  title: string | null;
  abstract: string | null;
  publication_date: string | null;
  journal: string | null;
  authors: unknown | null;
  url: string | null;
  alert_type: string;
  alert_status: string;
  severity: string | null;
  raw_payload: Record<string, unknown> | null;
};

const DUPLICATE_ERROR_CODES = new Set(["23505", "PGRST116"]);

function extractInterventionOutcome(source: EvidenceSource | undefined): {
  intervention: string | null;
  outcome: string | null;
} {
  if (!source) {
    return { intervention: null, outcome: null };
  }

  const intervention =
    source.appraisal?.appraisal_debug?.intervention_terms_found?.[0] ??
    source.appraisal?.exposure_role ??
    null;
  const outcome =
    source.appraisal?.appraisal_debug?.outcome_terms_found?.[0] ??
    source.analysis?.outcomes?.[0] ??
    source.appraisal?.outcome_role ??
    null;

  return { intervention, outcome };
}

function resolveAlertType(
  check: WatchCheckResponse,
  source: EvidenceSource | undefined
): string {
  if (check.evidence_change_alert.alert_required) {
    return check.evidence_change_alert.alert_type;
  }

  if (source?.appraisal && check.evidence_change_alert.alert_type !== "none") {
    return check.evidence_change_alert.alert_type;
  }

  return "new_evidence";
}

function buildSourceByPmid(sources: EvidenceSource[]): Map<string, EvidenceSource> {
  const byPmid = new Map<string, EvidenceSource>();

  for (const source of sources) {
    const pmid = source.meta?.pmid?.trim();
    if (pmid) {
      byPmid.set(pmid, source);
    }
  }

  return byPmid;
}

export function buildEvidenceAlertCandidates(
  check: WatchCheckResponse,
  topic: WatchTopicState
): EvidenceAlertCandidate[] {
  const newPmids = check.pubmed_check.new_pmids;
  if (newPmids.length === 0) {
    return [];
  }

  const sourceByPmid = buildSourceByPmid(check.new_sources);
  const severity = check.evidence_delta.change_level;
  const detectedAt = check.generated_at;

  return newPmids.map((pmid) => {
    const source = sourceByPmid.get(pmid);
    const { intervention, outcome } = extractInterventionOutcome(source);

    return {
      watchlist_item_id: topic.watch_topic_id,
      claim_family: topic.claim_family,
      intervention,
      outcome,
      query: check.query_used,
      source: "pubmed",
      external_id: pmid,
      external_id_type: "pmid",
      title: source?.title ?? null,
      abstract: source?.abstract?.text ?? source?.summary ?? null,
      publication_date:
        source?.meta?.publication_date ??
        (source?.publication_year ? String(source.publication_year) : null),
      journal: source?.meta?.journal ?? null,
      authors: source?.meta?.citation ? { citation: source.meta.citation } : null,
      url: source?.url ?? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      alert_type: resolveAlertType(check, source),
      severity,
      raw_payload: {
        watch_check_id: check.watch_check_id,
        detected_at: detectedAt,
        alert_required: check.evidence_change_alert.alert_required,
        alert_summary: check.evidence_change_alert.alert_summary,
        delta_summary: check.evidence_delta.delta_summary,
        source_id: source?.source_id ?? null,
      },
    };
  });
}

export function buildEvidenceAlertCandidatesFromRunResult(
  result: WatchRunTopicResult
): EvidenceAlertCandidate[] {
  return result.new_evidence_candidates ?? [];
}

function buildInsertRow(
  candidate: EvidenceAlertCandidate,
  watchRunId: string | null
): EvidenceAlertInsertRow {
  return {
    watch_run_id: watchRunId,
    watchlist_item_id: candidate.watchlist_item_id,
    claim_family: candidate.claim_family,
    intervention: candidate.intervention,
    outcome: candidate.outcome,
    query: candidate.query,
    source: candidate.source,
    external_id: candidate.external_id,
    external_id_type: candidate.external_id_type,
    title: candidate.title,
    abstract: candidate.abstract,
    publication_date: candidate.publication_date,
    journal: candidate.journal,
    authors: candidate.authors,
    url: candidate.url,
    alert_type: candidate.alert_type,
    alert_status: "new",
    severity: candidate.severity,
    raw_payload: candidate.raw_payload,
  };
}

export function isEvidenceAlertPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

function emptyPersistenceResult(
  overrides: Partial<EvidenceAlertPersistenceResult> = {}
): EvidenceAlertPersistenceResult {
  return {
    configured: isEvidenceAlertPersistenceConfigured(),
    persisted: false,
    evidence_alerts_logged: 0,
    evidence_alerts_duplicate_skipped: 0,
    evidence_alert_ids: [],
    ...overrides,
  };
}

function isDuplicateInsertError(error: { code?: string; message?: string }): boolean {
  if (error.code && DUPLICATE_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes("duplicate") || message.includes("unique");
}

export async function persistEvidenceAlertsFromRunDue(options: {
  runDue: RunDueResponse;
  watchRunId?: string | null;
  dryRun?: boolean;
}): Promise<EvidenceAlertPersistenceResult> {
  const { runDue, watchRunId = null, dryRun = runDue.dry_run } = options;

  if (dryRun) {
    return emptyPersistenceResult();
  }

  if (!isEvidenceAlertPersistenceConfigured()) {
    return emptyPersistenceResult({
      evidence_alerts_error: "supabase_not_configured",
    });
  }

  const candidates = runDue.results.flatMap((result) =>
    buildEvidenceAlertCandidatesFromRunResult(result)
  );

  if (candidates.length === 0) {
    return emptyPersistenceResult({ persisted: true });
  }

  let evidenceAlertsLogged = 0;
  let evidenceAlertsDuplicateSkipped = 0;
  const evidenceAlertIds: string[] = [];
  let lastError: string | undefined;

  for (const candidate of candidates) {
    try {
      const client = createSupabaseServerClient();
      const { data, error } = await client
        .from(EVIDENCE_ALERTS_TABLE)
        .insert(buildInsertRow(candidate, watchRunId))
        .select("id")
        .single();

      if (error) {
        if (isDuplicateInsertError(error)) {
          evidenceAlertsDuplicateSkipped += 1;
          continue;
        }
        lastError = sanitizeWatchRunErrorMessage(error);
        continue;
      }

      if (data?.id) {
        evidenceAlertsLogged += 1;
        evidenceAlertIds.push(data.id);
      }
    } catch (error) {
      lastError = sanitizeWatchRunErrorMessage(error);
    }
  }

  return {
    configured: true,
    persisted: true,
    evidence_alerts_logged: evidenceAlertsLogged,
    evidence_alerts_duplicate_skipped: evidenceAlertsDuplicateSkipped,
    evidence_alert_ids: evidenceAlertIds,
    ...(lastError ? { evidence_alerts_error: lastError } : {}),
  };
}

export async function linkEvidenceAlertsToWatchRun(
  alertIds: string[],
  watchRunId: string
): Promise<void> {
  if (
    !isEvidenceAlertPersistenceConfigured() ||
    alertIds.length === 0 ||
    !watchRunId
  ) {
    return;
  }

  try {
    const client = createSupabaseServerClient();
    await client
      .from(EVIDENCE_ALERTS_TABLE)
      .update({
        watch_run_id: watchRunId,
        updated_at: new Date().toISOString(),
      })
      .in("id", alertIds);
  } catch {
    // Non-fatal: alerts remain persisted without watch_run linkage.
  }
}

export type EvidenceAlertPersistenceSummary = Pick<
  EvidenceAlertPersistenceResult,
  "evidence_alerts_logged" | "evidence_alerts_duplicate_skipped"
>;

export function toEvidenceAlertPersistenceSummary(
  result: EvidenceAlertPersistenceResult
): EvidenceAlertPersistenceSummary {
  return {
    evidence_alerts_logged: result.evidence_alerts_logged,
    evidence_alerts_duplicate_skipped: result.evidence_alerts_duplicate_skipped,
  };
}

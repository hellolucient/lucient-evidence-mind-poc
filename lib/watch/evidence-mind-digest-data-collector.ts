import {
  CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE,
  EVIDENCE_ALERTS_TABLE,
  EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE,
  EVIDENCE_CHANGE_BRIEFS_TABLE,
  EVIDENCE_REVIEW_ITEMS_TABLE,
  WATCH_RUNS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import type { PrivacySafeEvidenceChangeBrief } from "@/lib/watch/evidence-change-brief-store";
import type { PrivacySafeReviewItem } from "@/lib/watch/evidence-review-item-store";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type DigestSourceAlert = {
  id: string;
  claim_family: string | null;
  title: string | null;
  alert_type: string;
  severity: string | null;
  created_at: string;
};

export type DigestSourceBriefClaim = {
  brief_id: string;
  client_claim_id: string;
  claim_family: string;
  claim_text_snapshot: string;
};

export type DigestSourceMapping = {
  client_claim_id: string;
  claim_family: string;
  mapping_status: string;
};

export type DigestSourceData = {
  watchlists_checked_count: number;
  alerts: DigestSourceAlert[];
  review_items: PrivacySafeReviewItem[];
  briefs: PrivacySafeEvidenceChangeBrief[];
  brief_claims: DigestSourceBriefClaim[];
  mappings: DigestSourceMapping[];
  error?: string;
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

function normalizeCollectorError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "digest_source_table_missing";
  }

  return sanitized;
}

export function isDigestSourceCollectionConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

function toPrivacySafeReviewItem(row: {
  id: string;
  evidence_alert_id: string | null;
  watch_run_id: string | null;
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  signal: string | null;
  severity: string | null;
  status: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}): PrivacySafeReviewItem {
  return {
    id: row.id,
    evidence_alert_id: row.evidence_alert_id,
    watch_run_id: row.watch_run_id,
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
    claim_family: row.claim_family,
    signal: row.signal,
    severity: row.severity,
    status: row.status as PrivacySafeReviewItem["status"],
    summary: row.summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPrivacySafeBrief(row: {
  id: string;
  workspace_id: string;
  claim_family: string;
  watchlist_id: string | null;
  evidence_alert_id: string | null;
  review_item_id: string | null;
  brief_title: string;
  brief_summary: string;
  what_changed: string;
  why_it_matters: string;
  evidence_signal: string;
  risk_implication: string;
  recommended_action: string;
  safer_wording: string | null;
  affected_client_claims_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}): PrivacySafeEvidenceChangeBrief {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    claim_family: row.claim_family,
    watchlist_id: row.watchlist_id,
    evidence_alert_id: row.evidence_alert_id,
    review_item_id: row.review_item_id,
    brief_title: row.brief_title,
    brief_summary: row.brief_summary,
    what_changed: row.what_changed,
    why_it_matters: row.why_it_matters,
    evidence_signal: row.evidence_signal,
    risk_implication: row.risk_implication,
    recommended_action: row.recommended_action,
    safer_wording: row.safer_wording,
    affected_client_claims_count: row.affected_client_claims_count,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function collectDigestSourceData(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<DigestSourceData> {
  if (!isDigestSourceCollectionConfigured()) {
    return {
      watchlists_checked_count: 0,
      alerts: [],
      review_items: [],
      briefs: [],
      brief_claims: [],
      mappings: [],
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();

    const { data: watchRuns, error: watchRunError } = await client
      .from(WATCH_RUNS_TABLE)
      .select("checked_count")
      .gte("started_at", periodStart)
      .lte("started_at", periodEnd);

    if (watchRunError) {
      return emptyDigestSource(normalizeCollectorError(watchRunError));
    }

    const watchlistsCheckedCount = (watchRuns ?? []).reduce(
      (sum, row) => sum + (typeof row.checked_count === "number" ? row.checked_count : 0),
      0
    );

    const { data: reviewItemRows, error: reviewError } = await client
      .from(EVIDENCE_REVIEW_ITEMS_TABLE)
      .select(
        "id, evidence_alert_id, watch_run_id, workspace_id, client_claim_id, claim_family, signal, severity, status, summary, created_at, updated_at"
      )
      .eq("workspace_id", workspaceId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .order("created_at", { ascending: false })
      .limit(100);

    if (reviewError) {
      return emptyDigestSource(normalizeCollectorError(reviewError));
    }

    const reviewItems = (reviewItemRows ?? []).map(toPrivacySafeReviewItem);

    const { data: briefRows, error: briefError } = await client
      .from(EVIDENCE_CHANGE_BRIEFS_TABLE)
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .order("created_at", { ascending: false })
      .limit(100);

    if (briefError) {
      return emptyDigestSource(normalizeCollectorError(briefError));
    }

    const briefs = (briefRows ?? []).map(toPrivacySafeBrief);
    const briefIds = briefs.map((brief) => brief.id);

    let briefClaims: DigestSourceBriefClaim[] = [];
    if (briefIds.length > 0) {
      const { data: claimRows, error: claimError } = await client
        .from(EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE)
        .select("brief_id, client_claim_id, claim_family, claim_text_snapshot")
        .eq("workspace_id", workspaceId)
        .in("brief_id", briefIds);

      if (claimError) {
        return emptyDigestSource(normalizeCollectorError(claimError));
      }

      briefClaims = (claimRows ?? []).map((row) => ({
        brief_id: row.brief_id,
        client_claim_id: row.client_claim_id,
        claim_family: row.claim_family,
        claim_text_snapshot: row.claim_text_snapshot,
      }));
    }

    const { data: mappingRows, error: mappingError } = await client
      .from(CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE)
      .select("client_claim_id, claim_family, mapping_status")
      .eq("workspace_id", workspaceId)
      .eq("mapping_status", "active");

    if (mappingError) {
      return emptyDigestSource(normalizeCollectorError(mappingError));
    }

    const mappings = (mappingRows ?? []).map((row) => ({
      client_claim_id: row.client_claim_id,
      claim_family: row.claim_family,
      mapping_status: row.mapping_status,
    }));

    const claimFamilies = new Set<string>();
    for (const item of reviewItems) {
      if (item.claim_family) claimFamilies.add(item.claim_family);
    }
    for (const brief of briefs) {
      if (brief.claim_family) claimFamilies.add(brief.claim_family);
    }
    for (const mapping of mappings) {
      if (mapping.claim_family) claimFamilies.add(mapping.claim_family);
    }

    let alerts: DigestSourceAlert[] = [];
    if (claimFamilies.size > 0) {
      const { data: alertRows, error: alertError } = await client
        .from(EVIDENCE_ALERTS_TABLE)
        .select("id, claim_family, title, alert_type, severity, created_at")
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd)
        .in("claim_family", [...claimFamilies])
        .order("created_at", { ascending: false })
        .limit(100);

      if (alertError) {
        return emptyDigestSource(normalizeCollectorError(alertError));
      }

      alerts = (alertRows ?? []).map((row) => ({
        id: row.id,
        claim_family: row.claim_family,
        title: row.title,
        alert_type: row.alert_type,
        severity: row.severity,
        created_at: row.created_at,
      }));
    }

    return {
      watchlists_checked_count: watchlistsCheckedCount,
      alerts,
      review_items: reviewItems,
      briefs,
      brief_claims: briefClaims,
      mappings,
    };
  } catch (error) {
    return emptyDigestSource(normalizeCollectorError(error));
  }
}

function emptyDigestSource(error: string): DigestSourceData {
  return {
    watchlists_checked_count: 0,
    alerts: [],
    review_items: [],
    briefs: [],
    brief_claims: [],
    mappings: [],
    error,
  };
}

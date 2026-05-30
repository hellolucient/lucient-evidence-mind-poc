import {
  createSupabaseServerClient,
  EVIDENCE_REVIEW_ITEMS_TABLE,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { sanitizeWatchRunErrorMessage } from "./watch-run-logger";
import type { EvidenceReviewHandoffItem, ReviewItemStatus } from "./evidence-review-handoff";
import { buildReviewItemsFromAlertCandidate } from "./evidence-review-handoff";
import type { EvidenceAlertCandidate } from "./evidence-alert-store";

export type ReviewItemPersistenceResult = {
  enabled: boolean;
  persisted: boolean;
  review_items_logged: number;
  review_items_duplicate_skipped: number;
  review_item_ids: string[];
  review_items_error?: string;
};

export const REVIEW_ITEM_STATUSES: ReviewItemStatus[] = [
  "open",
  "acknowledged",
  "in_review",
  "resolved",
  "dismissed",
];

export type ReviewItemRow = {
  id: string;
  evidence_alert_id: string | null;
  watch_run_id: string | null;
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  signal: string | null;
  severity: string | null;
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
  status: string;
  summary: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeReviewItem = {
  id: string;
  evidence_alert_id: string | null;
  watch_run_id: string | null;
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  signal: string | null;
  severity: string | null;
  status: ReviewItemStatus;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewItemListFilters = {
  workspace_id?: string;
  status?: string;
  claim_family?: string;
  signal?: string;
  limit?: number;
};

export type ReviewItemListResult = {
  items: PrivacySafeReviewItem[];
  count: number;
  error?: string;
};

export type ReviewItemGetResult = {
  item: PrivacySafeReviewItem | null;
  error?: string;
  not_found?: boolean;
};

export type ReviewItemUpdateResult = {
  item: PrivacySafeReviewItem | null;
  error?: string;
  not_found?: boolean;
  invalid_status?: boolean;
};

type ReviewItemInsertRow = {
  evidence_alert_id: string | null;
  watch_run_id: string | null;
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  signal: string;
  severity: string | null;
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
  status: string;
  summary: string;
  raw_payload: Record<string, unknown>;
};

const DUPLICATE_ERROR_CODES = new Set(["23505", "PGRST116"]);
const NOT_FOUND_ERROR_CODES = new Set(["PGRST116"]);

export const DEMO_REVIEW_ITEM_ROW: ReviewItemRow = {
  id: "demo-review-item-001",
  evidence_alert_id: "demo-alert-001",
  watch_run_id: "demo-run-001",
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_family: "magnesium_cortisol_stress",
  signal: "human_review_required",
  severity: "medium",
  human_review_required: true,
  client_claim_re_review_required: true,
  status: "open",
  summary:
    "Evidence alert for magnesium_cortisol_stress (99988877) may affect workspace claim demo-claim-magnesium-stress-001; signal=human_review_required.",
  raw_payload: {
    external_id: "99988877",
    source_type: "spa_menu_description",
    source_label: "Demo Spa Magnesium Recovery Treatment",
    claim_context: "Spa menu treatment description for magnesium recovery offering.",
    handoff_phase: "17",
  },
  created_at: "2026-05-30T21:00:00.000Z",
  updated_at: "2026-05-30T21:00:00.000Z",
};

function isDuplicateInsertError(error: { code?: string; message?: string }): boolean {
  if (error.code && DUPLICATE_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes("duplicate") || message.includes("unique");
}

function isNotFoundError(error: { code?: string; message?: string }): boolean {
  if (error.code && NOT_FOUND_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes("0 rows") || message.includes("not found");
}

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
    return "evidence_review_items_table_missing";
  }

  return sanitized;
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 50);
}

export function isSupportedReviewItemStatus(
  status: string
): status is ReviewItemStatus {
  return REVIEW_ITEM_STATUSES.includes(status as ReviewItemStatus);
}

export function toPrivacySafeReviewItem(row: ReviewItemRow): PrivacySafeReviewItem {
  return {
    id: row.id,
    evidence_alert_id: row.evidence_alert_id,
    watch_run_id: row.watch_run_id,
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
    claim_family: row.claim_family,
    signal: row.signal,
    severity: row.severity,
    status: isSupportedReviewItemStatus(row.status) ? row.status : "open",
    summary: row.summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createDemoReviewItem(): PrivacySafeReviewItem {
  return toPrivacySafeReviewItem(DEMO_REVIEW_ITEM_ROW);
}

export function isReviewItemPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

function buildInsertRow(item: EvidenceReviewHandoffItem): ReviewItemInsertRow {
  return {
    evidence_alert_id: item.evidence_alert_id,
    watch_run_id: item.watch_run_id,
    workspace_id: item.workspace_id,
    client_claim_id: item.client_claim_id,
    claim_family: item.claim_family_id,
    signal: item.signal,
    severity: item.severity,
    human_review_required: item.human_review_required,
    client_claim_re_review_required: item.client_claim_re_review_required,
    status: item.status,
    summary: item.summary,
    raw_payload: item.raw_payload,
  };
}

export function emptyReviewItemPersistenceResult(
  overrides: Partial<ReviewItemPersistenceResult> = {}
): ReviewItemPersistenceResult {
  return {
    enabled: false,
    persisted: false,
    review_items_logged: 0,
    review_items_duplicate_skipped: 0,
    review_item_ids: [],
    ...overrides,
  };
}

export async function persistReviewHandoffItems(
  items: EvidenceReviewHandoffItem[]
): Promise<ReviewItemPersistenceResult> {
  if (items.length === 0) {
    return emptyReviewItemPersistenceResult({ enabled: true, persisted: true });
  }

  if (!isReviewItemPersistenceConfigured()) {
    return emptyReviewItemPersistenceResult({
      enabled: true,
      review_items_error: "supabase_not_configured",
    });
  }

  let reviewItemsLogged = 0;
  let reviewItemsDuplicateSkipped = 0;
  const reviewItemIds: string[] = [];
  let lastError: string | undefined;

  for (const item of items) {
    try {
      const client = createSupabaseServerClient();
      const { data, error } = await client
        .from(EVIDENCE_REVIEW_ITEMS_TABLE)
        .insert(buildInsertRow(item))
        .select("id")
        .single();

      if (error) {
        if (isDuplicateInsertError(error)) {
          reviewItemsDuplicateSkipped += 1;
          continue;
        }
        lastError = normalizeStoreError(error);
        continue;
      }

      if (data?.id) {
        reviewItemsLogged += 1;
        reviewItemIds.push(data.id);
      }
    } catch (error) {
      lastError = normalizeStoreError(error);
    }
  }

  return {
    enabled: true,
    persisted: true,
    review_items_logged: reviewItemsLogged,
    review_items_duplicate_skipped: reviewItemsDuplicateSkipped,
    review_item_ids: reviewItemIds,
    ...(lastError ? { review_items_error: lastError } : {}),
  };
}

export async function persistReviewHandoffsForAlertCandidates(options: {
  candidates: Array<{
    candidate: EvidenceAlertCandidate;
    evidence_alert_id: string;
  }>;
  watchRunId: string | null;
}): Promise<ReviewItemPersistenceResult> {
  const items = options.candidates.flatMap(({ candidate, evidence_alert_id }) =>
    buildReviewItemsFromAlertCandidate({
      candidate,
      evidence_alert_id,
      watch_run_id: options.watchRunId,
    }).items
  );

  return persistReviewHandoffItems(items);
}

export async function listReviewItems(
  filters: ReviewItemListFilters = {}
): Promise<ReviewItemListResult> {
  if (!isReviewItemPersistenceConfigured()) {
    return {
      items: [],
      count: 0,
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    let query = client.from(EVIDENCE_REVIEW_ITEMS_TABLE).select("*");

    if (filters.workspace_id) {
      query = query.eq("workspace_id", filters.workspace_id);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.claim_family) {
      query = query.eq("claim_family", filters.claim_family);
    }
    if (filters.signal) {
      query = query.eq("signal", filters.signal);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(clampLimit(filters.limit));

    if (error) {
      return {
        items: [],
        count: 0,
        error: normalizeStoreError(error),
      };
    }

    const rows = (data ?? []) as ReviewItemRow[];

    return {
      items: rows.map(toPrivacySafeReviewItem),
      count: rows.length,
    };
  } catch (error) {
    return {
      items: [],
      count: 0,
      error: normalizeStoreError(error),
    };
  }
}

export async function getReviewItemById(id: string): Promise<ReviewItemGetResult> {
  if (!isReviewItemPersistenceConfigured()) {
    return {
      item: null,
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_REVIEW_ITEMS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return {
        item: null,
        error: normalizeStoreError(error),
      };
    }

    if (!data) {
      return {
        item: null,
        not_found: true,
        error: "review_item_not_found",
      };
    }

    return {
      item: toPrivacySafeReviewItem(data as ReviewItemRow),
    };
  } catch (error) {
    return {
      item: null,
      error: normalizeStoreError(error),
    };
  }
}

export async function updateReviewItemStatus(
  id: string,
  status: string
): Promise<ReviewItemUpdateResult> {
  if (!isSupportedReviewItemStatus(status)) {
    return {
      item: null,
      invalid_status: true,
      error: "unsupported_review_item_status",
    };
  }

  if (!isReviewItemPersistenceConfigured()) {
    return {
      item: null,
      error: "supabase_not_configured",
    };
  }

  const updatedAt = new Date().toISOString();

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_REVIEW_ITEMS_TABLE)
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (isNotFoundError(error)) {
        return {
          item: null,
          not_found: true,
          error: "review_item_not_found",
        };
      }

      return {
        item: null,
        error: normalizeStoreError(error),
      };
    }

    if (!data) {
      return {
        item: null,
        not_found: true,
        error: "review_item_not_found",
      };
    }

    return {
      item: toPrivacySafeReviewItem(data as ReviewItemRow),
    };
  } catch (error) {
    return {
      item: null,
      error: normalizeStoreError(error),
    };
  }
}

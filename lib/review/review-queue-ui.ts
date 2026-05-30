import {
  getReviewItemById,
  isReviewItemPersistenceConfigured,
  isSupportedReviewItemStatus,
  listReviewItems,
  REVIEW_ITEM_STATUSES,
  toPrivacySafeReviewItem,
  updateReviewItemStatus,
  type PrivacySafeReviewItem,
  type ReviewItemListFilters,
  type ReviewItemRow,
} from "@/lib/watch/evidence-review-item-store";
import type { ReviewItemStatus } from "@/lib/watch/evidence-review-handoff";
import { PRIVACY_SAFE_REVIEW_ITEM_FIELDS } from "@/lib/review/review-items-api";

export const REVIEW_QUEUE_PRIVATE_FIELDS = [
  "raw_payload",
  "claim_text",
  "human_review_required",
  "client_claim_re_review_required",
] as const;

export const REVIEW_QUEUE_STATUS_OPTIONS = [...REVIEW_ITEM_STATUSES] as ReviewItemStatus[];

export type ReviewQueuePageFilters = ReviewItemListFilters;

export type ReviewQueueListRow = Pick<
  PrivacySafeReviewItem,
  | "id"
  | "status"
  | "signal"
  | "severity"
  | "claim_family"
  | "workspace_id"
  | "client_claim_id"
  | "summary"
  | "updated_at"
>;

export type ReviewQueueDetailView = PrivacySafeReviewItem;

export type ReviewQueueStatusCounts = Record<ReviewItemStatus, number>;

export type ReviewQueuePageData = {
  configured: boolean;
  filters: ReviewQueuePageFilters;
  items: ReviewQueueListRow[];
  selectedItem: ReviewQueueDetailView | null;
  filteredCount: number;
  statusCounts: ReviewQueueStatusCounts;
  listError: string | null;
  listErrorMessage: string | null;
  selectedError: string | null;
  selectedErrorMessage: string | null;
};

export type ReviewQueueStatusUpdateResult =
  | {
      ok: true;
      item: ReviewQueueDetailView;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

function emptyStatusCounts(): ReviewQueueStatusCounts {
  return REVIEW_ITEM_STATUSES.reduce((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {} as ReviewQueueStatusCounts);
}

export function computeStatusCounts(items: PrivacySafeReviewItem[]): ReviewQueueStatusCounts {
  const counts = emptyStatusCounts();

  for (const item of items) {
    if (isSupportedReviewItemStatus(item.status)) {
      counts[item.status] += 1;
    }
  }

  return counts;
}

export function shapeReviewQueueListRow(item: PrivacySafeReviewItem): ReviewQueueListRow {
  return {
    id: item.id,
    status: item.status,
    signal: item.signal,
    severity: item.severity,
    claim_family: item.claim_family,
    workspace_id: item.workspace_id,
    client_claim_id: item.client_claim_id,
    summary: item.summary,
    updated_at: item.updated_at,
  };
}

export function shapeReviewQueueDetailView(item: PrivacySafeReviewItem): ReviewQueueDetailView {
  return { ...item };
}

export function isReviewQueueDisplayItem(item: Record<string, unknown>): boolean {
  for (const field of REVIEW_QUEUE_PRIVATE_FIELDS) {
    if (field in item) {
      return false;
    }
  }

  return PRIVACY_SAFE_REVIEW_ITEM_FIELDS.every((field) => field in item);
}

export function reviewQueueErrorMessage(error: string | null | undefined): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_review_items_table_missing":
      return "The evidence_review_items table is missing. Apply the Phase 18 migration in Supabase.";
    case "review_item_not_found":
      return "Review item not found.";
    case "unsupported_review_item_status":
      return "Unsupported review item status.";
    default:
      return `Server error: ${error}`;
  }
}

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

export function parseReviewQueuePageFilters(
  params: Record<string, string | string[] | undefined>
): ReviewQueuePageFilters {
  const limitParam = readParam(params, "limit");
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

  const status = readParam(params, "status");

  return {
    workspace_id: readParam(params, "workspace_id") || undefined,
    status: status && isSupportedReviewItemStatus(status) ? status : undefined,
    claim_family: readParam(params, "claim_family") || undefined,
    signal: readParam(params, "signal") || undefined,
    limit: parsedLimit,
  };
}

export function parseReviewQueuePageFiltersWithSelection(
  params: Record<string, string | string[] | undefined>
): ReviewQueuePageFilters & { selected_id?: string } {
  const filters = parseReviewQueuePageFilters(params);
  const selectedId = readParam(params, "selected_id");

  return {
    ...filters,
    selected_id: selectedId || undefined,
  };
}

export async function buildReviewQueuePageData(
  params: Record<string, string | string[] | undefined>
): Promise<ReviewQueuePageData> {
  const filtersWithSelection = parseReviewQueuePageFiltersWithSelection(params);
  const { selected_id: selectedId, ...filters } = filtersWithSelection;
  const configured = isReviewItemPersistenceConfigured();

  if (!configured) {
    return {
      configured: false,
      filters,
      items: [],
      selectedItem: null,
      filteredCount: 0,
      statusCounts: emptyStatusCounts(),
      listError: "supabase_not_configured",
      listErrorMessage: reviewQueueErrorMessage("supabase_not_configured"),
      selectedError: null,
      selectedErrorMessage: null,
    };
  }

  const countFilters: ReviewItemListFilters = {
    workspace_id: filters.workspace_id,
    claim_family: filters.claim_family,
    signal: filters.signal,
    limit: 50,
  };

  const [listResult, countResult, selectedResult] = await Promise.all([
    listReviewItems(filters),
    listReviewItems(countFilters),
    selectedId ? getReviewItemById(selectedId) : Promise.resolve(null),
  ]);

  const listError = listResult.error ?? null;
  const selectedError =
    selectedResult && ("error" in selectedResult ? (selectedResult.error ?? null) : null);

  return {
    configured: true,
    filters,
    items: listResult.items.map(shapeReviewQueueListRow),
    selectedItem:
      selectedResult && selectedResult.item
        ? shapeReviewQueueDetailView(selectedResult.item)
        : null,
    filteredCount: listResult.count,
    statusCounts: computeStatusCounts(countResult.items),
    listError,
    listErrorMessage: reviewQueueErrorMessage(listError),
    selectedError,
    selectedErrorMessage: reviewQueueErrorMessage(selectedError),
  };
}

export async function updateReviewQueueItemStatus(
  id: string,
  status: string
): Promise<ReviewQueueStatusUpdateResult> {
  if (!isSupportedReviewItemStatus(status)) {
    return {
      ok: false,
      error: "unsupported_review_item_status",
      message: reviewQueueErrorMessage("unsupported_review_item_status") ?? "Invalid status.",
    };
  }

  const result = await updateReviewItemStatus(id, status);

  if (result.invalid_status) {
    return {
      ok: false,
      error: result.error ?? "unsupported_review_item_status",
      message:
        reviewQueueErrorMessage(result.error ?? "unsupported_review_item_status") ??
        "Invalid status.",
    };
  }

  if (result.not_found) {
    return {
      ok: false,
      error: result.error ?? "review_item_not_found",
      message: reviewQueueErrorMessage(result.error ?? "review_item_not_found") ?? "Not found.",
    };
  }

  if (result.error || !result.item) {
    return {
      ok: false,
      error: result.error ?? "server_error",
      message: reviewQueueErrorMessage(result.error ?? "server_error") ?? "Update failed.",
    };
  }

  return {
    ok: true,
    item: shapeReviewQueueDetailView(result.item),
  };
}

/** Test helper: ensure a DB row maps to a privacy-safe display shape. */
export function reviewQueueDisplayShapeFromRow(row: ReviewItemRow): ReviewQueueDetailView {
  return shapeReviewQueueDetailView(toPrivacySafeReviewItem(row));
}

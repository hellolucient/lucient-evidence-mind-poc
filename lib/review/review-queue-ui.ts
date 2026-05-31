import {
  applyWorkspaceScopeToListFilters,
  canAccessReviewItemWorkspace,
  type ReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { listReviewItemAuditEvents } from "@/lib/review/evidence-review-item-audit-store";
import { listReviewItemNotes } from "@/lib/review/evidence-review-item-notes-store";
import { resolveLinkedClientClaimForReviewItem } from "@/lib/watch/client-claims-store";
import { performReviewItemNoteCreate } from "@/lib/review/review-item-note-create";
import { performReviewItemStatusUpdate } from "@/lib/review/review-item-status-update";
import {
  getReviewItemById,
  isReviewItemPersistenceConfigured,
  isSupportedReviewItemStatus,
  listReviewItems,
  REVIEW_ITEM_STATUSES,
  toPrivacySafeReviewItem,
  type PrivacySafeReviewItem,
  type ReviewItemListFilters,
  type ReviewItemRow,
} from "@/lib/watch/evidence-review-item-store";
import { PRIVACY_SAFE_REVIEW_ITEM_FIELDS } from "@/lib/review/review-items-api";
import { REVIEW_QUEUE_DETAIL_FIELDS, REVIEW_QUEUE_PRIVATE_FIELDS } from "@/lib/review/review-queue-constants";
import type {
  ReviewQueueDetailView,
  ReviewQueueListRow,
  ReviewQueueNoteAddResult,
  ReviewQueueNoteFlash,
  ReviewQueuePageData,
  ReviewQueuePageFilters,
  ReviewQueueStatusCounts,
  ReviewQueueStatusUpdateResult,
  ReviewQueueUpdateFlash,
} from "@/lib/review/review-queue-types";

export {
  REVIEW_QUEUE_DETAIL_FIELDS,
  REVIEW_QUEUE_PRIVATE_FIELDS,
  REVIEW_QUEUE_STATUS_OPTIONS,
} from "@/lib/review/review-queue-constants";

export { REVIEW_QUEUE_NOTE_DECISION_OPTIONS } from "@/lib/review/review-queue-note-constants";

export type {
  ReviewQueueDetailView,
  ReviewQueueListRow,
  ReviewQueueNoteAddResult,
  ReviewQueueNoteFlash,
  ReviewQueuePageData,
  ReviewQueuePageFilters,
  ReviewQueueStatusCounts,
  ReviewQueueStatusUpdateResult,
  ReviewQueueUpdateFlash,
} from "@/lib/review/review-queue-types";

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

export function resolveEffectiveSelectedId(
  selectedId: string | undefined,
  items: ReviewQueueListRow[]
): string | null {
  if (selectedId) {
    return selectedId;
  }

  return items[0]?.id ?? null;
}

export function isReviewQueueSelectedItemView(
  item: Record<string, unknown>
): item is ReviewQueueDetailView {
  if (!isReviewQueueDisplayItem(item)) {
    return false;
  }

  return REVIEW_QUEUE_DETAIL_FIELDS.every((field) => field in item);
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
    case "forbidden":
      return "Review item is outside your workspace scope.";
    case "unsupported_review_item_status":
      return "Unsupported review item status.";
    case "note_text_required":
      return "Note text is required.";
    case "unsupported_decision_type":
      return "Unsupported decision type.";
    case "evidence_review_item_notes_table_missing":
      return "The evidence_review_item_notes table is missing. Apply the Phase 25 migration in Supabase.";
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

export function parseReviewQueueUpdateFlash(
  params: Record<string, string | string[] | undefined>
): ReviewQueueUpdateFlash | null {
  const successStatus = readParam(params, "update_ok");
  if (successStatus) {
    return {
      kind: "success",
      status: successStatus,
    };
  }

  const error = readParam(params, "update_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "update_error_message") ?? error,
    };
  }

  return null;
}

export function parseReviewQueueNoteFlash(
  params: Record<string, string | string[] | undefined>
): ReviewQueueNoteFlash | null {
  if (readParam(params, "note_ok")) {
    return { kind: "success" };
  }

  const error = readParam(params, "note_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "note_error_message") ?? error,
    };
  }

  return null;
}

export function buildReviewItemsUpdateRedirectPath(options: {
  returnQuery: string;
  result: ReviewQueueStatusUpdateResult;
  itemId?: string;
}): string {
  const params = new URLSearchParams(options.returnQuery);
  params.delete("update_ok");
  params.delete("update_error");
  params.delete("update_error_message");

  if (options.result.ok) {
    params.set("selected_id", options.result.item.id);
    params.set("update_ok", options.result.item.status);
  } else {
    const itemId = options.itemId;
    if (itemId) {
      params.set("selected_id", itemId);
    }
    params.set("update_error", options.result.error);
    params.set("update_error_message", options.result.message);
  }

  const query = params.toString();
  return query ? `/review-items?${query}` : "/review-items";
}

export function buildReviewItemsNoteRedirectPath(options: {
  returnQuery: string;
  result: ReviewQueueNoteAddResult;
  itemId?: string;
}): string {
  const params = new URLSearchParams(options.returnQuery);
  params.delete("note_ok");
  params.delete("note_error");
  params.delete("note_error_message");

  if (options.result.ok) {
    if (options.itemId) {
      params.set("selected_id", options.itemId);
    }
    params.set("note_ok", "1");
  } else {
    const itemId = options.itemId;
    if (itemId) {
      params.set("selected_id", itemId);
    }
    params.set("note_error", options.result.error);
    params.set("note_error_message", options.result.message);
  }

  const query = params.toString();
  return query ? `/review-items?${query}` : "/review-items";
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
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<Omit<ReviewQueuePageData, "authStatus">> {
  const filtersWithSelection = parseReviewQueuePageFiltersWithSelection(params);
  const { selected_id: selectedId, ...filters } = filtersWithSelection;
  const scopedFilters = applyWorkspaceScopeToListFilters(filters, access);
  const configured = isReviewItemPersistenceConfigured();

  if (!configured) {
    return {
      configured: false,
      filters,
      items: [],
      selectedItem: null,
      effectiveSelectedId: null,
      filteredCount: 0,
      statusCounts: emptyStatusCounts(),
      listError: "supabase_not_configured",
      listErrorMessage: reviewQueueErrorMessage("supabase_not_configured"),
      selectedError: null,
      selectedErrorMessage: null,
      auditHistory: [],
      notesHistory: [],
      linkedClientClaim: null,
      updateFlash: parseReviewQueueUpdateFlash(params),
      noteFlash: parseReviewQueueNoteFlash(params),
    };
  }

  const countFilters: ReviewItemListFilters = {
    ...applyWorkspaceScopeToListFilters(
      {
        workspace_id: filters.workspace_id,
        claim_family: filters.claim_family,
        signal: filters.signal,
        limit: 50,
      },
      access
    ),
  };

  const listResult = await listReviewItems(scopedFilters);
  const items = listResult.items.map(shapeReviewQueueListRow);
  const effectiveSelectedId = resolveEffectiveSelectedId(selectedId, items);

  const [countResult, selectedResult] = await Promise.all([
    listReviewItems(countFilters),
    effectiveSelectedId
      ? getReviewItemById(effectiveSelectedId)
      : Promise.resolve(null),
  ]);

  const listError = listResult.error ?? null;
  let selectedError =
    selectedResult && ("error" in selectedResult ? (selectedResult.error ?? null) : null);

  if (
    selectedResult?.item &&
    !canAccessReviewItemWorkspace(access, selectedResult.item.workspace_id)
  ) {
    selectedError = "forbidden";
  }

  const selectedItem =
    selectedResult?.item &&
    canAccessReviewItemWorkspace(access, selectedResult.item.workspace_id)
      ? shapeReviewQueueDetailView(selectedResult.item)
      : null;

  let auditHistory: Awaited<ReturnType<typeof listReviewItemAuditEvents>>["events"] = [];
  let notesHistory: Awaited<ReturnType<typeof listReviewItemNotes>>["notes"] = [];
  let linkedClientClaim: Awaited<ReturnType<typeof resolveLinkedClientClaimForReviewItem>> = null;
  if (selectedItem && effectiveSelectedId) {
    const [auditHistoryResult, notesHistoryResult, linkedClaim] = await Promise.all([
      listReviewItemAuditEvents(effectiveSelectedId, access),
      listReviewItemNotes(effectiveSelectedId, access),
      resolveLinkedClientClaimForReviewItem(selectedItem, access),
    ]);
    auditHistory = auditHistoryResult.events;
    notesHistory = notesHistoryResult.notes;
    linkedClientClaim = linkedClaim;
  }

  return {
    configured: true,
    filters,
    items,
    selectedItem,
    auditHistory,
    notesHistory,
    linkedClientClaim,
    effectiveSelectedId,
    filteredCount: listResult.count,
    statusCounts: computeStatusCounts(countResult.items),
    listError,
    listErrorMessage: reviewQueueErrorMessage(listError),
    selectedError,
    selectedErrorMessage: reviewQueueErrorMessage(selectedError),
    updateFlash: parseReviewQueueUpdateFlash(params),
    noteFlash: parseReviewQueueNoteFlash(params),
  };
}

export function parseReviewItemStatusFormData(formData: FormData): {
  id: string;
  status: string;
  returnQuery: string;
} {
  return {
    id: String(formData.get("review_item_id") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    returnQuery: String(formData.get("return_query") ?? "").trim(),
  };
}

export function parseReviewItemNoteFormData(formData: FormData): {
  id: string;
  noteText: string;
  decisionType: string;
  returnQuery: string;
} {
  return {
    id: String(formData.get("review_item_id") ?? "").trim(),
    noteText: String(formData.get("note_text") ?? "").trim(),
    decisionType: String(formData.get("decision_type") ?? "").trim(),
    returnQuery: String(formData.get("return_query") ?? "").trim(),
  };
}

export type ReviewQueueNoteSubmission = {
  redirectPath: string;
  result: ReviewQueueNoteAddResult;
};

export async function processReviewItemNoteSubmission(
  formData: FormData,
  access: ReviewQueueAccessContext,
  operatorEmail?: string | null
): Promise<ReviewQueueNoteSubmission> {
  const parsed = parseReviewItemNoteFormData(formData);

  if (!parsed.id) {
    const result: ReviewQueueNoteAddResult = {
      ok: false,
      error: "review_item_id_required",
      message: "Review item ID is required.",
    };
    return {
      result,
      redirectPath: buildReviewItemsNoteRedirectPath({
        returnQuery: parsed.returnQuery,
        result,
      }),
    };
  }

  if (!parsed.noteText) {
    const result: ReviewQueueNoteAddResult = {
      ok: false,
      error: "note_text_required",
      message: reviewQueueErrorMessage("note_text_required") ?? "Note text is required.",
    };
    return {
      result,
      redirectPath: buildReviewItemsNoteRedirectPath({
        returnQuery: parsed.returnQuery,
        result,
        itemId: parsed.id,
      }),
    };
  }

  const existing = await getReviewItemById(parsed.id);
  if (existing.item && !canAccessReviewItemWorkspace(access, existing.item.workspace_id)) {
    const result: ReviewQueueNoteAddResult = {
      ok: false,
      error: "forbidden",
      message: "Review item is outside your workspace scope.",
    };
    return {
      result,
      redirectPath: buildReviewItemsNoteRedirectPath({
        returnQuery: parsed.returnQuery,
        result,
        itemId: parsed.id,
      }),
    };
  }

  const result = await performReviewItemNoteCreate({
    reviewItemId: parsed.id,
    noteText: parsed.noteText,
    decisionType: parsed.decisionType || null,
    access,
    operatorEmail,
    existingItem: existing.item ?? null,
  });

  return {
    result,
    redirectPath: buildReviewItemsNoteRedirectPath({
      returnQuery: parsed.returnQuery,
      result,
      itemId: parsed.id,
    }),
  };
}

export type ReviewQueueStatusUpdateSubmission = {
  redirectPath: string;
  result: ReviewQueueStatusUpdateResult;
};

export async function processReviewItemStatusUpdateSubmission(
  formData: FormData,
  access: ReviewQueueAccessContext,
  operatorEmail?: string | null
): Promise<ReviewQueueStatusUpdateSubmission> {
  const parsed = parseReviewItemStatusFormData(formData);

  if (!parsed.id) {
    const result: ReviewQueueStatusUpdateResult = {
      ok: false,
      error: "review_item_id_required",
      message: "Review item ID is required.",
    };
    return {
      result,
      redirectPath: buildReviewItemsUpdateRedirectPath({
        returnQuery: parsed.returnQuery,
        result,
      }),
    };
  }

  if (!parsed.status) {
    const result: ReviewQueueStatusUpdateResult = {
      ok: false,
      error: "status_required",
      message: "Status is required.",
    };
    return {
      result,
      redirectPath: buildReviewItemsUpdateRedirectPath({
        returnQuery: parsed.returnQuery,
        result,
        itemId: parsed.id,
      }),
    };
  }

  const existing = await getReviewItemById(parsed.id);
  if (existing.item && !canAccessReviewItemWorkspace(access, existing.item.workspace_id)) {
    const result: ReviewQueueStatusUpdateResult = {
      ok: false,
      error: "forbidden",
      message: "Review item is outside your workspace scope.",
    };
    return {
      result,
      redirectPath: buildReviewItemsUpdateRedirectPath({
        returnQuery: parsed.returnQuery,
        result,
        itemId: parsed.id,
      }),
    };
  }

  const result = await performReviewItemStatusUpdate({
    id: parsed.id,
    status: parsed.status,
    access,
    operatorEmail,
    existingItem: existing.item ?? null,
  });

  return {
    result,
    redirectPath: buildReviewItemsUpdateRedirectPath({
      returnQuery: parsed.returnQuery,
      result,
      itemId: parsed.id,
    }),
  };
}


/** Test helper: ensure a DB row maps to a privacy-safe display shape. */
export function reviewQueueDisplayShapeFromRow(row: ReviewItemRow): ReviewQueueDetailView {
  return shapeReviewQueueDetailView(toPrivacySafeReviewItem(row));
}

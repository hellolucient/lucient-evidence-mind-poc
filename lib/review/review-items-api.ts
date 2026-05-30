import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  applyWorkspaceScopeToListFilters,
  canAccessReviewItemWorkspace,
  type ReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { performReviewItemStatusUpdate } from "@/lib/review/review-item-status-update";
import {
  getReviewItemById,
  listReviewItems,
  type PrivacySafeReviewItem,
  type ReviewItemListFilters,
} from "@/lib/watch/evidence-review-item-store";

export function parseReviewItemListFilters(
  searchParams: URLSearchParams
): ReviewItemListFilters {
  const limitParam = searchParams.get("limit");
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

  return {
    workspace_id: searchParams.get("workspace_id") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    claim_family: searchParams.get("claim_family") ?? undefined,
    signal: searchParams.get("signal") ?? undefined,
    limit: parsedLimit,
  };
}

export async function buildReviewItemsListApiResponse(
  filters: ReviewItemListFilters,
  access: ReviewQueueAccessContext
) {
  const scopedFilters = applyWorkspaceScopeToListFilters(filters, access);
  const result = await listReviewItems(scopedFilters);

  return {
    ok: true as const,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/review-items",
    count: result.count,
    limit: filters.limit ?? 20,
    items: result.items,
    list_error: result.error ?? null,
  };
}

export async function buildReviewItemGetApiResponse(
  id: string,
  access: ReviewQueueAccessContext
) {
  const result = await getReviewItemById(id);

  if (result.item && !canAccessReviewItemWorkspace(access, result.item.workspace_id)) {
    return {
      ok: false as const,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/review-items/[id]",
      error: "forbidden",
      status: 403,
    };
  }

  if (result.not_found) {
    return {
      ok: false as const,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/review-items/[id]",
      error: result.error ?? "review_item_not_found",
    };
  }

  if (result.error) {
    return {
      ok: false as const,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/review-items/[id]",
      error: result.error,
    };
  }

  return {
    ok: true as const,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/review-items/[id]",
    item: result.item as PrivacySafeReviewItem,
  };
}

export type ReviewItemStatusUpdateBody = {
  status?: unknown;
};

export async function buildReviewItemStatusUpdateApiResponse(
  id: string,
  body: ReviewItemStatusUpdateBody,
  access: ReviewQueueAccessContext,
  operatorEmail?: string | null
) {
  if (typeof body.status !== "string" || body.status.trim().length === 0) {
    return {
      ok: false as const,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/review-items/[id]/status",
      error: "status_required",
      status: 400,
    };
  }

  const existing = await getReviewItemById(id);
  if (existing.item && !canAccessReviewItemWorkspace(access, existing.item.workspace_id)) {
    return {
      ok: false as const,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/review-items/[id]/status",
      error: "forbidden",
      status: 403,
    };
  }

  const result = await performReviewItemStatusUpdate({
    id,
    status: body.status.trim(),
    access,
    operatorEmail,
    existingItem: existing.item ?? null,
  });

  if (!result.ok) {
    if (result.error === "unsupported_review_item_status") {
      return {
        ok: false as const,
        phase: CURRENT_WATCH_PHASE,
        route: "/api/review-items/[id]/status",
        error: result.error,
        status: 400,
      };
    }

    if (result.error === "review_item_not_found") {
      return {
        ok: false as const,
        phase: CURRENT_WATCH_PHASE,
        route: "/api/review-items/[id]/status",
        error: result.error,
        status: 404,
      };
    }

    return {
      ok: false as const,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/review-items/[id]/status",
      error: result.error,
      status: 500,
    };
  }

  return {
    ok: true as const,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/review-items/[id]/status",
    item: result.item as PrivacySafeReviewItem,
    status: 200,
  };
}

export const PRIVACY_SAFE_REVIEW_ITEM_FIELDS = [
  "id",
  "evidence_alert_id",
  "watch_run_id",
  "workspace_id",
  "client_claim_id",
  "claim_family",
  "signal",
  "severity",
  "status",
  "summary",
  "created_at",
  "updated_at",
] as const;

export function isPrivacySafeReviewItemPayload(item: Record<string, unknown>): boolean {
  return PRIVACY_SAFE_REVIEW_ITEM_FIELDS.every((field) => field in item);
}

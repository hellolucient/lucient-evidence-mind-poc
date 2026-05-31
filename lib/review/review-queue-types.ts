import type { ReviewItemListFilters, PrivacySafeReviewItem } from "@/lib/watch/evidence-review-item-store";
import type { ReviewItemStatus } from "@/lib/watch/evidence-review-handoff";
import type { PrivacySafeReviewItemAuditEvent } from "@/lib/review/evidence-review-item-audit-store";
import type { PrivacySafeReviewItemNote } from "@/lib/review/evidence-review-item-notes-store";
import type { PrivacySafeClientClaim } from "@/lib/watch/client-claims-store";

import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

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

export type ReviewQueueNoteAddResult =
  | {
      ok: true;
      note: PrivacySafeReviewItemNote;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type ReviewQueueNoteFlash =
  | {
      kind: "success";
    }
  | {
      kind: "error";
      error: string;
      message: string;
    };

export type ReviewQueueUpdateFlash =
  | {
      kind: "success";
      status: string;
    }
  | {
      kind: "error";
      error: string;
      message: string;
    };

export type ReviewQueuePageData = {
  configured: boolean;
  filters: ReviewQueuePageFilters;
  items: ReviewQueueListRow[];
  selectedItem: ReviewQueueDetailView | null;
  auditHistory: PrivacySafeReviewItemAuditEvent[];
  notesHistory: PrivacySafeReviewItemNote[];
  linkedClientClaim: PrivacySafeClientClaim | null;
  effectiveSelectedId: string | null;
  filteredCount: number;
  statusCounts: ReviewQueueStatusCounts;
  listError: string | null;
  listErrorMessage: string | null;
  selectedError: string | null;
  selectedErrorMessage: string | null;
  updateFlash: ReviewQueueUpdateFlash | null;
  noteFlash: ReviewQueueNoteFlash | null;
  authStatus: ReviewQueueAuthPanelData;
};

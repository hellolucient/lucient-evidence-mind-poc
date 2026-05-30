import {
  createSupabaseServerClient,
  EVIDENCE_REVIEW_ITEMS_TABLE,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { sanitizeWatchRunErrorMessage } from "./watch-run-logger";
import type { EvidenceReviewHandoffItem } from "./evidence-review-handoff";
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

function isDuplicateInsertError(error: { code?: string; message?: string }): boolean {
  if (error.code && DUPLICATE_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes("duplicate") || message.includes("unique");
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
        lastError = sanitizeWatchRunErrorMessage(error);
        continue;
      }

      if (data?.id) {
        reviewItemsLogged += 1;
        reviewItemIds.push(data.id);
      }
    } catch (error) {
      lastError = sanitizeWatchRunErrorMessage(error);
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

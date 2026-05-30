import { describe, expect, it } from "vitest";

import { DEMO_REVIEW_ITEM_ROW } from "@/lib/watch/evidence-review-item-store";
import {
  computeStatusCounts,
  isReviewQueueDisplayItem,
  isReviewQueueSelectedItemView,
  parseReviewQueuePageFilters,
  resolveEffectiveSelectedId,
  REVIEW_QUEUE_DETAIL_FIELDS,
  REVIEW_QUEUE_PRIVATE_FIELDS,
  REVIEW_QUEUE_STATUS_OPTIONS,
  reviewQueueDisplayShapeFromRow,
  reviewQueueErrorMessage,
  shapeReviewQueueDetailView,
  shapeReviewQueueListRow,
} from "./review-queue-ui";

const demoItem = reviewQueueDisplayShapeFromRow(DEMO_REVIEW_ITEM_ROW);

describe("review-queue-ui", () => {
  it("REVIEW_QUEUE_STATUS_OPTIONS matches supported operator statuses", () => {
    expect(REVIEW_QUEUE_STATUS_OPTIONS).toEqual([
      "open",
      "acknowledged",
      "in_review",
      "resolved",
      "dismissed",
    ]);
    expect(REVIEW_QUEUE_STATUS_OPTIONS.every((status) => typeof status === "string")).toBe(true);
  });

  it("shapeReviewQueueListRow keeps table columns only", () => {
    const row = shapeReviewQueueListRow(demoItem);

    expect(row).toEqual({
      id: demoItem.id,
      status: demoItem.status,
      signal: demoItem.signal,
      severity: demoItem.severity,
      claim_family: demoItem.claim_family,
      workspace_id: demoItem.workspace_id,
      client_claim_id: demoItem.client_claim_id,
      summary: demoItem.summary,
      updated_at: demoItem.updated_at,
    });
    expect(row).not.toHaveProperty("raw_payload");
    expect(row).not.toHaveProperty("claim_text");
  });

  it("shapeReviewQueueDetailView preserves privacy-safe detail fields", () => {
    const detail = shapeReviewQueueDetailView(demoItem);

    expect(isReviewQueueDisplayItem(detail as Record<string, unknown>)).toBe(true);
    expect(isReviewQueueSelectedItemView(detail as Record<string, unknown>)).toBe(true);
    for (const field of REVIEW_QUEUE_PRIVATE_FIELDS) {
      expect(detail).not.toHaveProperty(field);
    }
    expect(detail.id).toBe(demoItem.id);
    expect(detail.evidence_alert_id).toBe(demoItem.evidence_alert_id);
  });

  it("isReviewQueueSelectedItemView requires the detail panel field set", () => {
    const detail = shapeReviewQueueDetailView(demoItem);

    expect(REVIEW_QUEUE_DETAIL_FIELDS.every((field) => field in detail)).toBe(true);
    expect(isReviewQueueSelectedItemView(detail as Record<string, unknown>)).toBe(true);
    expect(
      isReviewQueueSelectedItemView({
        ...detail,
        raw_payload: { secret: true },
      } as Record<string, unknown>)
    ).toBe(false);
  });

  it("reviewQueueDisplayShapeFromRow excludes raw_payload from DB rows", () => {
    const display = reviewQueueDisplayShapeFromRow(DEMO_REVIEW_ITEM_ROW);

    expect(display).not.toHaveProperty("raw_payload");
    expect(display).not.toHaveProperty("claim_text");
    expect(isReviewQueueSelectedItemView(display as Record<string, unknown>)).toBe(true);
    expect(JSON.stringify(display).toLowerCase()).not.toContain("claim_context");
  });

  it("resolveEffectiveSelectedId prefers explicit selection then first list row", () => {
    const rows = [
      shapeReviewQueueListRow(demoItem),
      shapeReviewQueueListRow({ ...demoItem, id: "item-2" }),
    ];

    expect(resolveEffectiveSelectedId(undefined, rows)).toBe(demoItem.id);
    expect(resolveEffectiveSelectedId("item-2", rows)).toBe("item-2");
    expect(resolveEffectiveSelectedId(undefined, [])).toBeNull();
  });

  it("computeStatusCounts aggregates by status", () => {
    const counts = computeStatusCounts([
      { ...demoItem, status: "open" },
      { ...demoItem, id: "item-2", status: "acknowledged" },
      { ...demoItem, id: "item-3", status: "open" },
    ]);

    expect(counts.open).toBe(2);
    expect(counts.acknowledged).toBe(1);
    expect(counts.in_review).toBe(0);
  });

  it("parseReviewQueuePageFilters reads page search params", () => {
    expect(
      parseReviewQueuePageFilters({
        status: "acknowledged",
        workspace_id: "demo-workspace-spa-menu",
        claim_family: "magnesium_cortisol_stress",
        signal: "human_review_required",
      })
    ).toEqual({
      status: "acknowledged",
      workspace_id: "demo-workspace-spa-menu",
      claim_family: "magnesium_cortisol_stress",
      signal: "human_review_required",
      limit: undefined,
    });
  });

  it("parseReviewQueuePageFilters ignores unsupported status values", () => {
    expect(parseReviewQueuePageFilters({ status: "invalid" }).status).toBeUndefined();
  });

  it("reviewQueueErrorMessage maps known store errors", () => {
    expect(reviewQueueErrorMessage("supabase_not_configured")).toContain("Supabase");
    expect(reviewQueueErrorMessage("evidence_review_items_table_missing")).toContain(
      "evidence_review_items"
    );
    expect(reviewQueueErrorMessage(null)).toBeNull();
  });
});

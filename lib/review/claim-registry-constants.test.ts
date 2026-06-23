import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_WELLNESS_CLAIM_RESEARCH_STATUS,
  DEFAULT_WELLNESS_CLAIM_REVIEW_STATUS,
  DEFAULT_WELLNESS_CLAIM_STATUS,
  WELLNESS_CLAIM_RESEARCH_STATUSES,
  WELLNESS_CLAIM_REVIEW_STATUSES,
  WELLNESS_CLAIM_STATUSES,
  isSupportedWellnessClaimResearchStatus,
  isSupportedWellnessClaimReviewStatus,
  isSupportedWellnessClaimStatus,
} from "@/lib/review/claim-registry-constants";

describe("claim registry constants", () => {
  it("defines wellness claim status enums", () => {
    expect(WELLNESS_CLAIM_STATUSES).toEqual(["active", "archived"]);
    expect(WELLNESS_CLAIM_REVIEW_STATUSES).toEqual(["accepted", "needs_edit", "rejected"]);
    expect(WELLNESS_CLAIM_RESEARCH_STATUSES).toEqual(["not_started", "queued", "completed"]);
    expect(DEFAULT_WELLNESS_CLAIM_STATUS).toBe("active");
    expect(DEFAULT_WELLNESS_CLAIM_REVIEW_STATUS).toBe("accepted");
    expect(DEFAULT_WELLNESS_CLAIM_RESEARCH_STATUS).toBe("not_started");
  });

  it("validates supported enum values", () => {
    expect(isSupportedWellnessClaimStatus("active")).toBe(true);
    expect(isSupportedWellnessClaimStatus("archived")).toBe(true);
    expect(isSupportedWellnessClaimStatus("paused")).toBe(false);

    expect(isSupportedWellnessClaimReviewStatus("accepted")).toBe(true);
    expect(isSupportedWellnessClaimResearchStatus("not_started")).toBe(true);
    expect(isSupportedWellnessClaimResearchStatus("completed")).toBe(true);
  });
});

describe("wellness_claims migration", () => {
  it("creates wellness_claims with review and research status constraints", () => {
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/20260623200000_create_wellness_claims_phase44b.sql"
    );
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.wellness_claims");
    expect(sql).toContain("source_candidate_claim_id");
    expect(sql).toContain("research_status text NOT NULL DEFAULT 'not_started'");
    expect(sql).toContain("review_status IN ('accepted', 'needs_edit', 'rejected')");
    expect(sql).toContain("wellness_claims_source_candidate_claim_id_unique_idx");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CLAIM_CITATION_EVIDENCE_TYPES,
  CLAIM_CITATION_RELEVANCE_LEVELS,
  CLAIM_EVIDENCE_POSTURES,
  CLAIM_EVIDENCE_STRENGTHS,
  CLAIM_RESEARCH_MODES,
  CLAIM_RESEARCH_RISK_LEVELS,
  CLAIM_RESEARCH_RUN_STATUSES,
  DEFAULT_CLAIM_RESEARCH_MODE,
  isSupportedClaimEvidencePosture,
  isSupportedClaimResearchMode,
  isSupportedClaimResearchRunStatus,
} from "@/lib/review/claim-research-constants";

describe("claim research constants", () => {
  it("defines research enums", () => {
    expect(CLAIM_RESEARCH_RUN_STATUSES).toEqual(["completed", "failed"]);
    expect(CLAIM_RESEARCH_MODES).toEqual([
      "controlled_pubmed_v1",
      "pubmed_live_v1",
      "mock_evidence_v1",
      "existing_engine_v1",
    ]);
    expect(CLAIM_EVIDENCE_POSTURES).toEqual([
      "supportive",
      "mixed",
      "weak",
      "insufficient",
      "not_found",
    ]);
    expect(CLAIM_EVIDENCE_STRENGTHS).toEqual(["high", "moderate", "low", "very_low"]);
    expect(CLAIM_RESEARCH_RISK_LEVELS).toEqual(["low", "medium", "high"]);
    expect(CLAIM_CITATION_EVIDENCE_TYPES).toContain("systematic_review");
    expect(CLAIM_CITATION_RELEVANCE_LEVELS).toEqual(["high", "medium", "low"]);
    expect(DEFAULT_CLAIM_RESEARCH_MODE).toBe("mock_evidence_v1");
  });

  it("validates supported enum values", () => {
    expect(isSupportedClaimResearchRunStatus("completed")).toBe(true);
    expect(isSupportedClaimResearchRunStatus("pending")).toBe(false);
    expect(isSupportedClaimResearchMode("mock_evidence_v1")).toBe(true);
    expect(isSupportedClaimEvidencePosture("mixed")).toBe(true);
  });
});

describe("claim research migration", () => {
  it("creates claim_research_runs and claim_research_citations tables", () => {
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/20260623210000_create_claim_research_phase44c.sql"
    );
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.claim_research_runs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.claim_research_citations");
    expect(sql).toContain("evidence_posture");
    expect(sql).toContain("safer_wording");
    expect(sql).toContain(
      "research_mode IN ('controlled_pubmed_v1', 'pubmed_live_v1', 'mock_evidence_v1', 'existing_engine_v1')"
    );
    expect(sql).toContain("claim_research_runs_claim_created_idx");
  });

  it("follow-up migration allows pubmed_live_v1 for already-deployed databases", () => {
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/20260623213000_allow_pubmed_live_research_mode.sql"
    );
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("DROP CONSTRAINT IF EXISTS claim_research_runs_mode_check");
    expect(sql).toContain("pubmed_live_v1");
    expect(sql).toContain("Phase 44C-REAL");
  });
});

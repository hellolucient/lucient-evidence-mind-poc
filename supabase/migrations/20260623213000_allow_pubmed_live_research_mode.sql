-- Phase 44C-REAL follow-up: allow pubmed_live_v1 in claim_research_runs.research_mode.
--
-- Phase 44C-REAL introduced pubmed_live_v1 for live PubMed-backed single-claim research.
-- The original Phase 44C migration (20260623210000) may already have been applied in
-- production without that value in the research_mode check constraint, causing inserts
-- with research_mode = 'pubmed_live_v1' to fail with a constraint violation.
-- This idempotent follow-up keeps deployed databases compatible with live PubMed research.

ALTER TABLE public.claim_research_runs
  DROP CONSTRAINT IF EXISTS claim_research_runs_mode_check;

ALTER TABLE public.claim_research_runs
  ADD CONSTRAINT claim_research_runs_mode_check
  CHECK (
    research_mode = ANY (
      ARRAY[
        'controlled_pubmed_v1'::text,
        'mock_evidence_v1'::text,
        'existing_engine_v1'::text,
        'pubmed_live_v1'::text
      ]
    )
  );

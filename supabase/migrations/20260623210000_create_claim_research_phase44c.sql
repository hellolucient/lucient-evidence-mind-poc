-- Phase 44C: durable single-claim evidence research runs and citations.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.claim_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.wellness_claims (id) ON DELETE CASCADE,
  status text NOT NULL,
  research_mode text NOT NULL,
  query_text text NOT NULL,
  evidence_posture text,
  evidence_strength text,
  risk_level text,
  risk_score integer,
  summary text,
  safer_wording text,
  research_notes text,
  citation_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_research_runs_status_check CHECK (
    status IN ('completed', 'failed')
  ),
  CONSTRAINT claim_research_runs_mode_check CHECK (
    research_mode IN ('controlled_pubmed_v1', 'pubmed_live_v1', 'mock_evidence_v1', 'existing_engine_v1')
  ),
  CONSTRAINT claim_research_runs_evidence_posture_check CHECK (
    evidence_posture IS NULL OR evidence_posture IN (
      'supportive', 'mixed', 'weak', 'insufficient', 'not_found'
    )
  ),
  CONSTRAINT claim_research_runs_evidence_strength_check CHECK (
    evidence_strength IS NULL OR evidence_strength IN (
      'high', 'moderate', 'low', 'very_low'
    )
  ),
  CONSTRAINT claim_research_runs_risk_level_check CHECK (
    risk_level IS NULL OR risk_level IN ('low', 'medium', 'high')
  )
);

CREATE TABLE IF NOT EXISTS public.claim_research_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.wellness_claims (id) ON DELETE CASCADE,
  research_run_id uuid NOT NULL REFERENCES public.claim_research_runs (id) ON DELETE CASCADE,
  title text NOT NULL,
  source text NOT NULL,
  url text,
  publication_year integer,
  evidence_type text,
  relevance text NOT NULL,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_research_citations_relevance_check CHECK (
    relevance IN ('high', 'medium', 'low')
  ),
  CONSTRAINT claim_research_citations_evidence_type_check CHECK (
    evidence_type IS NULL OR evidence_type IN (
      'systematic_review',
      'rct',
      'clinical_trial',
      'review',
      'observational',
      'animal',
      'in_vitro',
      'unknown'
    )
  )
);

CREATE INDEX IF NOT EXISTS claim_research_runs_workspace_idx
  ON public.claim_research_runs (workspace_id);

CREATE INDEX IF NOT EXISTS claim_research_runs_claim_created_idx
  ON public.claim_research_runs (claim_id, created_at DESC);

CREATE INDEX IF NOT EXISTS claim_research_runs_workspace_claim_idx
  ON public.claim_research_runs (workspace_id, claim_id);

CREATE INDEX IF NOT EXISTS claim_research_citations_research_run_idx
  ON public.claim_research_citations (research_run_id);

CREATE INDEX IF NOT EXISTS claim_research_citations_claim_idx
  ON public.claim_research_citations (claim_id);

ALTER TABLE public.claim_research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_research_citations ENABLE ROW LEVEL SECURITY;

-- Phase 44A: durable claim source documents, extraction runs, and candidate wellness claims.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.claim_source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  title text NOT NULL,
  source_type text NOT NULL,
  source_text text NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_source_documents_source_type_check CHECK (
    source_type IN (
      'spa_menu',
      'treatment_description',
      'product_description',
      'website_copy',
      'brochure',
      'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS claim_source_documents_workspace_idx
  ON public.claim_source_documents (workspace_id);

CREATE INDEX IF NOT EXISTS claim_source_documents_workspace_created_idx
  ON public.claim_source_documents (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.claim_extraction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  source_document_id uuid NOT NULL REFERENCES public.claim_source_documents (id) ON DELETE CASCADE,
  extractor_type text NOT NULL,
  status text NOT NULL,
  candidate_claim_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_extraction_runs_extractor_type_check CHECK (
    extractor_type IN ('internal_llm_stub', 'rule_based_v1', 'manual_test')
  ),
  CONSTRAINT claim_extraction_runs_status_check CHECK (
    status IN ('completed', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS claim_extraction_runs_workspace_idx
  ON public.claim_extraction_runs (workspace_id);

CREATE INDEX IF NOT EXISTS claim_extraction_runs_workspace_created_idx
  ON public.claim_extraction_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS claim_extraction_runs_source_document_idx
  ON public.claim_extraction_runs (source_document_id);

CREATE TABLE IF NOT EXISTS public.candidate_wellness_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  source_document_id uuid NOT NULL REFERENCES public.claim_source_documents (id) ON DELETE CASCADE,
  extraction_run_id uuid NOT NULL REFERENCES public.claim_extraction_runs (id) ON DELETE CASCADE,
  claim_text text NOT NULL,
  normalized_claim_text text NOT NULL,
  source_excerpt text NOT NULL,
  source_location text,
  claim_type text,
  claim_family text,
  subject text,
  predicate text,
  object text,
  claim_strength text NOT NULL,
  evidence_sensitivity text NOT NULL,
  is_direct_claim boolean NOT NULL DEFAULT true,
  needs_research boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'candidate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_wellness_claims_strength_check CHECK (
    claim_strength IN ('soft', 'moderate', 'strong')
  ),
  CONSTRAINT candidate_wellness_claims_sensitivity_check CHECK (
    evidence_sensitivity IN ('low', 'medium', 'high')
  ),
  CONSTRAINT candidate_wellness_claims_status_check CHECK (
    status IN ('candidate', 'accepted', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS candidate_wellness_claims_workspace_idx
  ON public.candidate_wellness_claims (workspace_id);

CREATE INDEX IF NOT EXISTS candidate_wellness_claims_extraction_run_idx
  ON public.candidate_wellness_claims (extraction_run_id);

CREATE INDEX IF NOT EXISTS candidate_wellness_claims_source_document_idx
  ON public.candidate_wellness_claims (source_document_id);

ALTER TABLE public.claim_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_wellness_claims ENABLE ROW LEVEL SECURITY;

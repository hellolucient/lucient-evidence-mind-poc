-- Phase 44B: durable registered wellness claims registry (review promotion target).
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.wellness_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  source_document_id uuid REFERENCES public.claim_source_documents (id) ON DELETE SET NULL,
  source_candidate_claim_id uuid REFERENCES public.candidate_wellness_claims (id) ON DELETE SET NULL,
  claim_text text NOT NULL,
  normalized_claim_text text NOT NULL,
  claim_type text,
  claim_family text,
  subject text,
  predicate text,
  object text,
  claim_strength text NOT NULL,
  evidence_sensitivity text NOT NULL,
  source_excerpt text,
  source_location text,
  status text NOT NULL DEFAULT 'active',
  review_status text NOT NULL DEFAULT 'accepted',
  research_status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wellness_claims_strength_check CHECK (
    claim_strength IN ('soft', 'moderate', 'strong')
  ),
  CONSTRAINT wellness_claims_sensitivity_check CHECK (
    evidence_sensitivity IN ('low', 'medium', 'high')
  ),
  CONSTRAINT wellness_claims_status_check CHECK (
    status IN ('active', 'archived')
  ),
  CONSTRAINT wellness_claims_review_status_check CHECK (
    review_status IN ('accepted', 'needs_edit', 'rejected')
  ),
  CONSTRAINT wellness_claims_research_status_check CHECK (
    research_status IN ('not_started', 'queued', 'completed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wellness_claims_source_candidate_claim_id_unique_idx
  ON public.wellness_claims (source_candidate_claim_id)
  WHERE source_candidate_claim_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wellness_claims_workspace_idx
  ON public.wellness_claims (workspace_id);

CREATE INDEX IF NOT EXISTS wellness_claims_workspace_created_idx
  ON public.wellness_claims (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wellness_claims_workspace_family_idx
  ON public.wellness_claims (workspace_id, claim_family);

CREATE INDEX IF NOT EXISTS wellness_claims_workspace_research_status_idx
  ON public.wellness_claims (workspace_id, research_status);

ALTER TABLE public.wellness_claims ENABLE ROW LEVEL SECURITY;

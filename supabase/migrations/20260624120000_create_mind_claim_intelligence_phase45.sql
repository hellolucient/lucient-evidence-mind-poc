-- Phase 45: Mind-centered claim intelligence layer.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.source_intake_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  title text,
  source_text text NOT NULL,
  source_type text NOT NULL DEFAULT 'spa_wellness_copy',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_intake_documents_workspace_idx
  ON public.source_intake_documents (workspace_id);

CREATE INDEX IF NOT EXISTS source_intake_documents_workspace_created_idx
  ON public.source_intake_documents (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mind_claim_extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  source_document_id uuid NOT NULL REFERENCES public.source_intake_documents (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  destination text NOT NULL DEFAULT 'hellominds',
  prompt_version text NOT NULL DEFAULT 'mind_claim_extraction_v1',
  output_contract_version text NOT NULL DEFAULT 'mind_claim_extraction_json_v1',
  review_status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  response_fetched_at timestamptz,
  parsed_at timestamptz,
  external_thread_id text,
  external_message_id text,
  mind_response_text text,
  parse_error text,
  cost_units numeric,
  cost_report jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mind_claim_extraction_jobs_status_check CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'response_fetched',
      'parsed',
      'parse_failed',
      'failed',
      'cancelled'
    )
  ),
  CONSTRAINT mind_claim_extraction_jobs_review_status_check CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS mind_claim_extraction_jobs_workspace_idx
  ON public.mind_claim_extraction_jobs (workspace_id);

CREATE INDEX IF NOT EXISTS mind_claim_extraction_jobs_source_document_idx
  ON public.mind_claim_extraction_jobs (source_document_id);

CREATE INDEX IF NOT EXISTS mind_claim_extraction_jobs_workspace_created_idx
  ON public.mind_claim_extraction_jobs (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.candidate_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  source_document_id uuid REFERENCES public.source_intake_documents (id) ON DELETE CASCADE,
  extraction_job_id uuid REFERENCES public.mind_claim_extraction_jobs (id) ON DELETE SET NULL,
  claim_text text NOT NULL,
  exact_source_phrase text,
  subject text,
  predicate text,
  object_or_outcome text,
  claim_family text,
  claim_type text,
  evidence_sensitivity text,
  risk_level text,
  regulatory_sensitivity text,
  confidence numeric,
  reason_for_extraction text,
  suggested_review_status text,
  review_status text NOT NULL DEFAULT 'pending',
  operator_edited_claim_text text,
  operator_notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_claims_review_status_check CHECK (
    review_status IN ('pending', 'accepted', 'rejected', 'edited')
  )
);

CREATE INDEX IF NOT EXISTS candidate_claims_workspace_idx
  ON public.candidate_claims (workspace_id);

CREATE INDEX IF NOT EXISTS candidate_claims_source_document_idx
  ON public.candidate_claims (source_document_id);

CREATE INDEX IF NOT EXISTS candidate_claims_extraction_job_idx
  ON public.candidate_claims (extraction_job_id);

CREATE INDEX IF NOT EXISTS candidate_claims_workspace_created_idx
  ON public.candidate_claims (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mind_claim_risk_brief_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  client_claim_id uuid NOT NULL REFERENCES public.client_claims (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  destination text NOT NULL DEFAULT 'hellominds',
  prompt_version text NOT NULL DEFAULT 'mind_claim_risk_brief_v1',
  output_contract_version text NOT NULL DEFAULT 'mind_claim_risk_brief_json_v1',
  review_status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  response_fetched_at timestamptz,
  parsed_at timestamptz,
  external_thread_id text,
  external_message_id text,
  mind_response_text text,
  parse_error text,
  cost_units numeric,
  cost_report jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mind_claim_risk_brief_jobs_status_check CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'response_fetched',
      'parsed',
      'parse_failed',
      'failed',
      'cancelled'
    )
  ),
  CONSTRAINT mind_claim_risk_brief_jobs_review_status_check CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS mind_claim_risk_brief_jobs_workspace_idx
  ON public.mind_claim_risk_brief_jobs (workspace_id);

CREATE INDEX IF NOT EXISTS mind_claim_risk_brief_jobs_client_claim_idx
  ON public.mind_claim_risk_brief_jobs (client_claim_id);

CREATE INDEX IF NOT EXISTS mind_claim_risk_brief_jobs_workspace_created_idx
  ON public.mind_claim_risk_brief_jobs (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mind_claim_risk_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  client_claim_id uuid NOT NULL REFERENCES public.client_claims (id) ON DELETE CASCADE,
  risk_brief_job_id uuid REFERENCES public.mind_claim_risk_brief_jobs (id) ON DELETE SET NULL,
  search_capability_statement text,
  searches_performed jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_not_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_posture text,
  evidence_strength text,
  risk_level text,
  regulatory_sensitivity text,
  safer_wording text,
  operator_recommendation text,
  key_evidence_risk_insight text,
  limitations text,
  pmids text[] NOT NULL DEFAULT '{}',
  dois text[] NOT NULL DEFAULT '{}',
  urls text[] NOT NULL DEFAULT '{}',
  cost_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mind_claim_risk_briefs_workspace_idx
  ON public.mind_claim_risk_briefs (workspace_id);

CREATE INDEX IF NOT EXISTS mind_claim_risk_briefs_client_claim_idx
  ON public.mind_claim_risk_briefs (client_claim_id);

CREATE INDEX IF NOT EXISTS mind_claim_risk_briefs_risk_brief_job_idx
  ON public.mind_claim_risk_briefs (risk_brief_job_id);

CREATE INDEX IF NOT EXISTS mind_claim_risk_briefs_created_idx
  ON public.mind_claim_risk_briefs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.mind_claim_intelligence_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  event_summary text NOT NULL,
  actor text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mind_claim_intelligence_audit_events_workspace_idx
  ON public.mind_claim_intelligence_audit_events (workspace_id);

CREATE INDEX IF NOT EXISTS mind_claim_intelligence_audit_events_entity_idx
  ON public.mind_claim_intelligence_audit_events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS mind_claim_intelligence_audit_events_created_idx
  ON public.mind_claim_intelligence_audit_events (created_at DESC);

ALTER TABLE public.source_intake_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_claim_extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_claim_risk_brief_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_claim_risk_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_claim_intelligence_audit_events ENABLE ROW LEVEL SECURITY;

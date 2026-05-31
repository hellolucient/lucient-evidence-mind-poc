-- Phase 28: evidence change briefs and affected claim snapshots.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.evidence_change_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  claim_family text NOT NULL,
  watchlist_id text,
  evidence_alert_id text,
  review_item_id uuid,
  brief_title text NOT NULL,
  brief_summary text NOT NULL,
  what_changed text NOT NULL,
  why_it_matters text NOT NULL,
  evidence_signal text NOT NULL,
  risk_implication text NOT NULL,
  recommended_action text NOT NULL,
  safer_wording text,
  affected_client_claims_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_change_briefs_status_check
    CHECK (status IN ('draft', 'ready_for_review', 'reviewed', 'archived')),
  CONSTRAINT evidence_change_briefs_evidence_signal_check
    CHECK (
      evidence_signal IN (
        'supportive',
        'mixed',
        'weak',
        'contradictory',
        'safety_signal',
        'unclear'
      )
    ),
  CONSTRAINT evidence_change_briefs_risk_implication_check
    CHECK (
      risk_implication IN (
        'no_change',
        'monitor',
        'wording_review_recommended',
        'escalation_recommended',
        'claim_not_supported'
      )
    )
);

CREATE INDEX IF NOT EXISTS evidence_change_briefs_workspace_idx
  ON public.evidence_change_briefs (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_change_briefs_claim_family_idx
  ON public.evidence_change_briefs (claim_family);

CREATE INDEX IF NOT EXISTS evidence_change_briefs_evidence_alert_idx
  ON public.evidence_change_briefs (evidence_alert_id);

CREATE INDEX IF NOT EXISTS evidence_change_briefs_review_item_idx
  ON public.evidence_change_briefs (review_item_id);

CREATE INDEX IF NOT EXISTS evidence_change_briefs_status_idx
  ON public.evidence_change_briefs (status);

CREATE TABLE IF NOT EXISTS public.evidence_change_brief_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.evidence_change_briefs (id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  client_claim_id text NOT NULL,
  claim_text_snapshot text NOT NULL,
  claim_source_type text,
  claim_source_label text,
  claim_family text NOT NULL,
  mapping_confidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_change_brief_claims_unique_key
    UNIQUE (brief_id, client_claim_id)
);

CREATE INDEX IF NOT EXISTS evidence_change_brief_claims_workspace_idx
  ON public.evidence_change_brief_claims (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_change_brief_claims_brief_idx
  ON public.evidence_change_brief_claims (brief_id);

CREATE INDEX IF NOT EXISTS evidence_change_brief_claims_client_claim_idx
  ON public.evidence_change_brief_claims (client_claim_id);

CREATE INDEX IF NOT EXISTS evidence_change_brief_claims_claim_family_idx
  ON public.evidence_change_brief_claims (claim_family);

ALTER TABLE public.evidence_change_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_change_brief_claims ENABLE ROW LEVEL SECURITY;

-- Phase 29: Evidence Mind digests and digest item snapshots.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.evidence_mind_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  digest_title text NOT NULL,
  digest_summary text NOT NULL,
  watchlists_checked_count integer NOT NULL DEFAULT 0,
  new_alerts_count integer NOT NULL DEFAULT 0,
  review_items_count integer NOT NULL DEFAULT 0,
  briefs_count integer NOT NULL DEFAULT 0,
  affected_claim_families_count integer NOT NULL DEFAULT 0,
  affected_client_claims_count integer NOT NULL DEFAULT 0,
  highest_risk_implication text NOT NULL,
  recommended_focus text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_mind_digests_status_check
    CHECK (status IN ('draft', 'ready_for_review', 'reviewed', 'archived')),
  CONSTRAINT evidence_mind_digests_highest_risk_check
    CHECK (
      highest_risk_implication IN (
        'none',
        'monitor',
        'wording_review_recommended',
        'escalation_recommended',
        'claim_not_supported',
        'unknown'
      )
    )
);

CREATE INDEX IF NOT EXISTS evidence_mind_digests_workspace_idx
  ON public.evidence_mind_digests (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_mind_digests_period_start_idx
  ON public.evidence_mind_digests (period_start);

CREATE INDEX IF NOT EXISTS evidence_mind_digests_period_end_idx
  ON public.evidence_mind_digests (period_end);

CREATE INDEX IF NOT EXISTS evidence_mind_digests_status_idx
  ON public.evidence_mind_digests (status);

CREATE TABLE IF NOT EXISTS public.evidence_mind_digest_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id uuid NOT NULL REFERENCES public.evidence_mind_digests (id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  item_type text NOT NULL,
  item_ref_id text,
  claim_family text,
  client_claim_id text,
  title_snapshot text NOT NULL,
  summary_snapshot text,
  risk_implication text,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_mind_digest_items_type_check
    CHECK (
      item_type IN (
        'evidence_brief',
        'review_item',
        'evidence_alert',
        'client_claim',
        'claim_family'
      )
    )
);

CREATE INDEX IF NOT EXISTS evidence_mind_digest_items_digest_idx
  ON public.evidence_mind_digest_items (digest_id);

CREATE INDEX IF NOT EXISTS evidence_mind_digest_items_workspace_idx
  ON public.evidence_mind_digest_items (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_mind_digest_items_type_idx
  ON public.evidence_mind_digest_items (item_type);

CREATE INDEX IF NOT EXISTS evidence_mind_digest_items_claim_family_idx
  ON public.evidence_mind_digest_items (claim_family);

CREATE INDEX IF NOT EXISTS evidence_mind_digest_items_client_claim_idx
  ON public.evidence_mind_digest_items (client_claim_id);

ALTER TABLE public.evidence_mind_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_mind_digest_items ENABLE ROW LEVEL SECURITY;

-- Phase 17: durable evidence review handoff items for Mind/app client claim mapping.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.
-- Optional: only required when EIE_ENABLE_REVIEW_HANDOFFS=true.

CREATE TABLE IF NOT EXISTS public.evidence_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_alert_id uuid REFERENCES public.evidence_alerts(id) ON DELETE SET NULL,
  watch_run_id uuid REFERENCES public.watch_runs(id) ON DELETE SET NULL,
  workspace_id text NOT NULL,
  client_claim_id text NOT NULL,
  claim_family text NOT NULL,
  signal text,
  severity text,
  human_review_required boolean NOT NULL DEFAULT false,
  client_claim_re_review_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  summary text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_review_items_alert_claim_unique_idx
  ON public.evidence_review_items (
    evidence_alert_id,
    client_claim_id
  );

CREATE INDEX IF NOT EXISTS evidence_review_items_workspace_id_idx
  ON public.evidence_review_items (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_review_items_claim_family_idx
  ON public.evidence_review_items (claim_family);

CREATE INDEX IF NOT EXISTS evidence_review_items_status_idx
  ON public.evidence_review_items (status);

CREATE INDEX IF NOT EXISTS evidence_review_items_created_at_desc_idx
  ON public.evidence_review_items (created_at DESC);

ALTER TABLE public.evidence_review_items ENABLE ROW LEVEL SECURITY;

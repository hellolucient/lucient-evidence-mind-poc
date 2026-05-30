-- Phase 14: durable evidence alert persistence for Evidence Mind watchtower detections.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.evidence_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_run_id uuid REFERENCES public.watch_runs(id) ON DELETE SET NULL,
  watchlist_item_id text,
  claim_family text,
  intervention text,
  outcome text,
  query text,
  source text NOT NULL DEFAULT 'pubmed',
  external_id text NOT NULL,
  external_id_type text NOT NULL DEFAULT 'pmid',
  title text,
  abstract text,
  publication_date text,
  journal text,
  authors jsonb,
  url text,
  alert_type text NOT NULL DEFAULT 'new_evidence',
  alert_status text NOT NULL DEFAULT 'new',
  severity text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_alerts_source_external_claim_unique_idx
  ON public.evidence_alerts (
    source,
    external_id,
    COALESCE(claim_family, '')
  );

CREATE INDEX IF NOT EXISTS evidence_alerts_created_at_desc_idx
  ON public.evidence_alerts (created_at DESC);

CREATE INDEX IF NOT EXISTS evidence_alerts_detected_at_desc_idx
  ON public.evidence_alerts (detected_at DESC);

CREATE INDEX IF NOT EXISTS evidence_alerts_alert_status_idx
  ON public.evidence_alerts (alert_status);

CREATE INDEX IF NOT EXISTS evidence_alerts_source_external_id_idx
  ON public.evidence_alerts (source, external_id);

CREATE INDEX IF NOT EXISTS evidence_alerts_watch_run_id_idx
  ON public.evidence_alerts (watch_run_id);

CREATE INDEX IF NOT EXISTS evidence_alerts_claim_family_idx
  ON public.evidence_alerts (claim_family);

ALTER TABLE public.evidence_alerts ENABLE ROW LEVEL SECURITY;

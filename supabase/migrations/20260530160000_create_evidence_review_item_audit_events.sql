-- Phase 24: durable audit trail for review queue operator status actions.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.evidence_review_item_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  review_item_id uuid NOT NULL REFERENCES public.evidence_review_items(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  old_status text,
  new_status text NOT NULL,
  actor_type text NOT NULL,
  actor_email text,
  access_mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS evidence_review_item_audit_events_review_item_created_idx
  ON public.evidence_review_item_audit_events (review_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS evidence_review_item_audit_events_workspace_created_idx
  ON public.evidence_review_item_audit_events (workspace_id, created_at DESC);

ALTER TABLE public.evidence_review_item_audit_events ENABLE ROW LEVEL SECURITY;

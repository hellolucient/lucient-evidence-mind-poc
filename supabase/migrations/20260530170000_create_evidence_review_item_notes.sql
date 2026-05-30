-- Phase 25: durable operator notes and decision rationale for review queue items.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.evidence_review_item_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  review_item_id uuid NOT NULL REFERENCES public.evidence_review_items(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  decision_type text,
  actor_type text NOT NULL,
  actor_email text,
  access_mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_review_item_notes_review_item_created_idx
  ON public.evidence_review_item_notes (review_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS evidence_review_item_notes_workspace_created_idx
  ON public.evidence_review_item_notes (workspace_id, created_at DESC);

ALTER TABLE public.evidence_review_item_notes ENABLE ROW LEVEL SECURITY;

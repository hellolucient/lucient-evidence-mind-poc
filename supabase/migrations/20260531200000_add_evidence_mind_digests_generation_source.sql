-- Phase 30: track whether a Mind digest was created manually or by scheduled generation.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

ALTER TABLE public.evidence_mind_digests
  ADD COLUMN IF NOT EXISTS generation_source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.evidence_mind_digests
  DROP CONSTRAINT IF EXISTS evidence_mind_digests_generation_source_check;

ALTER TABLE public.evidence_mind_digests
  ADD CONSTRAINT evidence_mind_digests_generation_source_check
  CHECK (generation_source IN ('manual', 'scheduled'));

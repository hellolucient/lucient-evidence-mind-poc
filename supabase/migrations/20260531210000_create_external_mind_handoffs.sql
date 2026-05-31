-- Phase 31: durable external Mind handoff payloads from Evidence Mind Digests.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.external_mind_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  digest_id uuid NOT NULL REFERENCES public.evidence_mind_digests (id) ON DELETE CASCADE,
  handoff_type text NOT NULL,
  destination text NOT NULL,
  payload_version text NOT NULL,
  payload_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  CONSTRAINT external_mind_handoffs_handoff_type_check
    CHECK (handoff_type IN ('digest_summary', 'evidence_change', 'review_queue_summary')),
  CONSTRAINT external_mind_handoffs_destination_check
    CHECK (destination IN ('animoca_mind', 'internal_export', 'test_sink')),
  CONSTRAINT external_mind_handoffs_status_check
    CHECK (status IN ('draft', 'ready', 'sent', 'failed', 'archived'))
);

CREATE INDEX IF NOT EXISTS external_mind_handoffs_workspace_idx
  ON public.external_mind_handoffs (workspace_id);

CREATE INDEX IF NOT EXISTS external_mind_handoffs_digest_idx
  ON public.external_mind_handoffs (digest_id);

CREATE INDEX IF NOT EXISTS external_mind_handoffs_destination_idx
  ON public.external_mind_handoffs (destination);

CREATE INDEX IF NOT EXISTS external_mind_handoffs_status_idx
  ON public.external_mind_handoffs (status);

CREATE INDEX IF NOT EXISTS external_mind_handoffs_created_at_idx
  ON public.external_mind_handoffs (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS external_mind_handoffs_active_digest_destination_version_idx
  ON public.external_mind_handoffs (digest_id, destination, payload_version)
  WHERE status IN ('draft', 'ready');

ALTER TABLE public.external_mind_handoffs ENABLE ROW LEVEL SECURITY;

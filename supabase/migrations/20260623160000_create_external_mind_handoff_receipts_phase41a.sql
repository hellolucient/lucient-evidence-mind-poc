-- Phase 41A: durable external Mind receipt verification records.

CREATE TABLE IF NOT EXISTS public.external_mind_handoff_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  handoff_id uuid NOT NULL REFERENCES public.external_mind_handoffs (id) ON DELETE CASCADE,
  digest_id uuid REFERENCES public.evidence_mind_digests (id) ON DELETE SET NULL,
  destination text NOT NULL,
  provider text NOT NULL,
  conversation_id_suffix text,
  message_id_suffix text,
  receipt_status text NOT NULL,
  http_status integer,
  receipt_source text NOT NULL,
  verified_at timestamptz,
  response_excerpt text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_mind_handoff_receipts_receipt_status_check
    CHECK (
      receipt_status IN (
        'delivery_confirmed_from_send_event',
        'fetched_from_hellominds'
      )
    ),
  CONSTRAINT external_mind_handoff_receipts_receipt_source_check
    CHECK (
      receipt_source IN (
        'send_event_metadata',
        'hellominds_read_api'
      )
    )
);

-- Allow idempotent verification (one active receipt per handoff).
CREATE UNIQUE INDEX IF NOT EXISTS external_mind_handoff_receipts_handoff_idx
  ON public.external_mind_handoff_receipts (handoff_id);

CREATE INDEX IF NOT EXISTS external_mind_handoff_receipts_workspace_created_idx
  ON public.external_mind_handoff_receipts (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS external_mind_handoff_receipts_digest_created_idx
  ON public.external_mind_handoff_receipts (digest_id, created_at DESC);

ALTER TABLE public.external_mind_handoff_receipts ENABLE ROW LEVEL SECURITY;


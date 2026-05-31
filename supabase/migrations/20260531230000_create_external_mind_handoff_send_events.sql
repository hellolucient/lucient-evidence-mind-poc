-- Phase 33: durable audit/event log for external Mind handoff send attempts.

CREATE TABLE IF NOT EXISTS public.external_mind_handoff_send_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  handoff_id uuid NOT NULL REFERENCES public.external_mind_handoffs (id) ON DELETE CASCADE,
  digest_id uuid REFERENCES public.evidence_mind_digests (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  destination text NOT NULL,
  payload_version text,
  actor_type text NOT NULL,
  actor_email text,
  access_mode text,
  result text,
  status_before text,
  status_after text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_mind_handoff_send_events_event_type_check
    CHECK (event_type IN ('send_attempted', 'send_succeeded', 'send_failed', 'send_blocked', 'send_already_sent')),
  CONSTRAINT external_mind_handoff_send_events_result_check
    CHECK (
      result IS NULL OR result IN (
        'test_sink_sent',
        'send_disabled',
        'missing_config',
        'already_sent',
        'invalid_status',
        'unauthorized',
        'failed',
        'external_sent',
        'external_send_failed'
      )
    ),
  CONSTRAINT external_mind_handoff_send_events_actor_type_check
    CHECK (actor_type IN ('supabase_operator', 'break_glass', 'system')),
  CONSTRAINT external_mind_handoff_send_events_access_mode_check
    CHECK (access_mode IS NULL OR access_mode IN ('supabase_operator', 'break_glass', 'system'))
);

CREATE INDEX IF NOT EXISTS external_mind_handoff_send_events_workspace_created_idx
  ON public.external_mind_handoff_send_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS external_mind_handoff_send_events_handoff_created_idx
  ON public.external_mind_handoff_send_events (handoff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS external_mind_handoff_send_events_digest_created_idx
  ON public.external_mind_handoff_send_events (digest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS external_mind_handoff_send_events_result_created_idx
  ON public.external_mind_handoff_send_events (result, created_at DESC);

ALTER TABLE public.external_mind_handoff_send_events ENABLE ROW LEVEL SECURITY;

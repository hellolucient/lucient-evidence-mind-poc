-- Phase 38C: external dry-run and config-invalid send audit result codes.

ALTER TABLE public.external_mind_handoff_send_events
  DROP CONSTRAINT IF EXISTS external_mind_handoff_send_events_result_check;

ALTER TABLE public.external_mind_handoff_send_events
  ADD CONSTRAINT external_mind_handoff_send_events_result_check
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
        'external_send_failed',
        'not_approved',
        'external_dry_run_ok',
        'external_config_invalid'
      )
    );

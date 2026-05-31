-- Phase 32: durable send attempt metadata for external Mind handoffs.

ALTER TABLE public.external_mind_handoffs
  ADD COLUMN IF NOT EXISTS send_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_result_json jsonb;

CREATE INDEX IF NOT EXISTS external_mind_handoffs_send_attempted_at_idx
  ON public.external_mind_handoffs (send_attempted_at);

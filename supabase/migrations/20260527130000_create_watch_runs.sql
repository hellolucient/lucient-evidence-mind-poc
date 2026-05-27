-- Phase 13: durable watch run history for Evidence Mind operational audit trail.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.watch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  trigger text NOT NULL,
  source text NOT NULL,
  phase text NOT NULL,
  durable boolean NOT NULL DEFAULT false,
  store text NOT NULL,
  adapter text NOT NULL,
  force boolean NOT NULL DEFAULT false,
  dry_run boolean NOT NULL DEFAULT false,
  checked_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  alerts_count integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  error_message text,
  response_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_runs_started_at_desc_idx
  ON public.watch_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS watch_runs_status_idx
  ON public.watch_runs (status);

CREATE INDEX IF NOT EXISTS watch_runs_trigger_idx
  ON public.watch_runs (trigger);

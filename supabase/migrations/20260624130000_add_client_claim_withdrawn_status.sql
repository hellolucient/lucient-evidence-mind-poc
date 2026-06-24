-- Phase 45 candidate acceptance undo: allow withdrawing registered claims without deletion.

ALTER TABLE public.client_claims DROP CONSTRAINT IF EXISTS client_claims_status_check;

ALTER TABLE public.client_claims ADD CONSTRAINT client_claims_status_check CHECK (
  status IN ('active', 'paused', 'archived', 'withdrawn', 'inactive')
);

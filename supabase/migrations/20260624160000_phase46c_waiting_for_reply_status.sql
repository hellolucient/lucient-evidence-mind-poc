-- Phase 46C — Live workflow hardening.
-- Allow "waiting_for_reply" status for Mind jobs when no external reply exists yet.
-- Safety: no RLS changes. Existing statuses remain valid.

ALTER TABLE public.mind_claim_extraction_jobs
  DROP CONSTRAINT IF EXISTS mind_claim_extraction_jobs_status_check;

ALTER TABLE public.mind_claim_extraction_jobs
  ADD CONSTRAINT mind_claim_extraction_jobs_status_check CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'waiting_for_reply',
      'response_fetched',
      'parsed',
      'parse_failed',
      'failed',
      'cancelled'
    )
  );

ALTER TABLE public.mind_claim_risk_brief_jobs
  DROP CONSTRAINT IF EXISTS mind_claim_risk_brief_jobs_status_check;

ALTER TABLE public.mind_claim_risk_brief_jobs
  ADD CONSTRAINT mind_claim_risk_brief_jobs_status_check CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'waiting_for_reply',
      'response_fetched',
      'parsed',
      'parse_failed',
      'failed',
      'cancelled'
    )
  );


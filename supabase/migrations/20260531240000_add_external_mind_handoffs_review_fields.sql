-- Phase 34: operator review/approval before external Mind handoff send.

ALTER TABLE public.external_mind_handoffs
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by_actor_type text,
  ADD COLUMN IF NOT EXISTS reviewed_by_actor_email text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_actor_type text,
  ADD COLUMN IF NOT EXISTS approved_by_actor_email text,
  ADD COLUMN IF NOT EXISTS approval_note text;

ALTER TABLE public.external_mind_handoffs
  DROP CONSTRAINT IF EXISTS external_mind_handoffs_review_status_check;

ALTER TABLE public.external_mind_handoffs
  ADD CONSTRAINT external_mind_handoffs_review_status_check
    CHECK (review_status IN ('pending_review', 'approved', 'rejected', 'changes_requested'));

ALTER TABLE public.external_mind_handoffs
  DROP CONSTRAINT IF EXISTS external_mind_handoffs_reviewed_by_actor_type_check;

ALTER TABLE public.external_mind_handoffs
  ADD CONSTRAINT external_mind_handoffs_reviewed_by_actor_type_check
    CHECK (
      reviewed_by_actor_type IS NULL OR reviewed_by_actor_type IN (
        'supabase_operator',
        'break_glass',
        'system'
      )
    );

ALTER TABLE public.external_mind_handoffs
  DROP CONSTRAINT IF EXISTS external_mind_handoffs_approved_by_actor_type_check;

ALTER TABLE public.external_mind_handoffs
  ADD CONSTRAINT external_mind_handoffs_approved_by_actor_type_check
    CHECK (
      approved_by_actor_type IS NULL OR approved_by_actor_type IN (
        'supabase_operator',
        'break_glass',
        'system'
      )
    );

-- Existing sent handoffs remain sent; mark as approved for audit consistency.
UPDATE public.external_mind_handoffs
SET
  review_status = 'approved',
  approved_at = COALESCE(sent_at, created_at),
  approved_by_actor_type = 'system'
WHERE status = 'sent';

-- Grandfather existing unsent handoffs so operators are not blocked retroactively.
UPDATE public.external_mind_handoffs
SET
  review_status = 'approved',
  approved_at = created_at,
  approved_by_actor_type = 'system'
WHERE status IN ('ready', 'draft', 'failed', 'archived')
  AND review_status = 'pending_review';

CREATE INDEX IF NOT EXISTS external_mind_handoffs_review_status_idx
  ON public.external_mind_handoffs (review_status);

-- Allow send audit events to record review-gated blocked sends.
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
        'not_approved'
      )
    );

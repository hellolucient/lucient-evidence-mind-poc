-- Phase 39E2.5: allow hellominds as a persisted external_mind_handoffs destination.

ALTER TABLE public.external_mind_handoffs
  DROP CONSTRAINT IF EXISTS external_mind_handoffs_destination_check;

ALTER TABLE public.external_mind_handoffs
  ADD CONSTRAINT external_mind_handoffs_destination_check
    CHECK (destination IN ('animoca_mind', 'internal_export', 'test_sink', 'hellominds'));

-- Phase 47: External Mind live research (v2) risk brief fields.
-- Minimal additive migration; keeps v1 flows working.

ALTER TABLE public.mind_claim_risk_brief_jobs
  ADD COLUMN IF NOT EXISTS outbound_prompt_text text;

ALTER TABLE public.mind_claim_risk_briefs
  ADD COLUMN IF NOT EXISTS contract_version text;

ALTER TABLE public.mind_claim_risk_briefs
  ADD COLUMN IF NOT EXISTS source_context text;

ALTER TABLE public.mind_claim_risk_briefs
  ADD COLUMN IF NOT EXISTS verification_summary jsonb;


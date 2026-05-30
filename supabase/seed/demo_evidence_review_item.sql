-- Optional demo row for Phase 18 review queue API manual testing.
-- Requires evidence_review_items migration to be applied first.
-- Does not reference real production alert IDs unless you replace the UUIDs below.

INSERT INTO public.evidence_review_items (
  id,
  evidence_alert_id,
  watch_run_id,
  workspace_id,
  client_claim_id,
  claim_family,
  signal,
  severity,
  human_review_required,
  client_claim_re_review_required,
  status,
  summary,
  raw_payload
) VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  NULL,
  NULL,
  'demo-workspace-spa-menu',
  'demo-claim-magnesium-stress-001',
  'magnesium_cortisol_stress',
  'human_review_required',
  'medium',
  true,
  true,
  'open',
  'Evidence alert for magnesium_cortisol_stress may affect workspace claim demo-claim-magnesium-stress-001; signal=human_review_required.',
  '{"source_type":"spa_menu_description","source_label":"Demo Spa Magnesium Recovery Treatment","handoff_phase":"17"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Phase 26: durable workspace-scoped client claim registry.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.client_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  client_claim_id text NOT NULL,
  claim_text text NOT NULL,
  claim_source_type text,
  claim_source_label text,
  source_url text,
  claim_family text,
  risk_level text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_claims_workspace_client_claim_id_key UNIQUE (workspace_id, client_claim_id),
  CONSTRAINT client_claims_status_check CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT client_claims_source_type_check CHECK (
    claim_source_type IS NULL OR claim_source_type IN (
      'spa_menu',
      'product_description',
      'website',
      'social_post',
      'marketing_copy',
      'internal_note',
      'other'
    )
  ),
  CONSTRAINT client_claims_risk_level_check CHECK (
    risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'unknown')
  )
);

CREATE INDEX IF NOT EXISTS client_claims_workspace_idx
  ON public.client_claims (workspace_id);

CREATE INDEX IF NOT EXISTS client_claims_workspace_status_idx
  ON public.client_claims (workspace_id, status);

CREATE INDEX IF NOT EXISTS client_claims_workspace_claim_family_idx
  ON public.client_claims (workspace_id, claim_family);

INSERT INTO public.client_claims (
  workspace_id,
  client_claim_id,
  claim_text,
  claim_source_type,
  claim_family,
  risk_level,
  status
)
VALUES (
  'demo-workspace-spa-menu',
  'demo-claim-magnesium-stress-001',
  'Magnesium helps reduce stress and supports healthy cortisol balance.',
  'spa_menu',
  'magnesium_cortisol_stress',
  'medium',
  'active'
)
ON CONFLICT (workspace_id, client_claim_id) DO NOTHING;

ALTER TABLE public.client_claims ENABLE ROW LEVEL SECURITY;

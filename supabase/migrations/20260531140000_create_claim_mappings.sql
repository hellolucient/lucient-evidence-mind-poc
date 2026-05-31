-- Phase 27: claim family profiles and client-claim-to-watchlist mappings.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.claim_family_profiles (
  claim_family text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  default_watchlist_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_family_profiles_status_check CHECK (status IN ('active', 'paused', 'archived'))
);

CREATE INDEX IF NOT EXISTS claim_family_profiles_status_idx
  ON public.claim_family_profiles (status);

INSERT INTO public.claim_family_profiles (
  claim_family,
  display_name,
  description,
  default_watchlist_id,
  status
)
VALUES (
  'magnesium_cortisol_stress',
  'Magnesium / Stress / Cortisol',
  'Claims linking magnesium with stress reduction, relaxation, or cortisol balance.',
  'watch-magnesium-cortisol',
  'active'
)
ON CONFLICT (claim_family) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.client_claim_watchlist_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  client_claim_id text NOT NULL,
  claim_family text NOT NULL,
  watchlist_id text,
  mapping_status text NOT NULL DEFAULT 'active',
  mapping_confidence text,
  mapping_source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_claim_watchlist_mappings_unique_key
    UNIQUE (workspace_id, client_claim_id, claim_family),
  CONSTRAINT client_claim_watchlist_mappings_status_check
    CHECK (mapping_status IN ('active', 'paused', 'archived')),
  CONSTRAINT client_claim_watchlist_mappings_confidence_check
    CHECK (
      mapping_confidence IS NULL OR mapping_confidence IN ('high', 'medium', 'low', 'unknown')
    ),
  CONSTRAINT client_claim_watchlist_mappings_source_check
    CHECK (mapping_source IN ('manual', 'system_suggested', 'imported', 'seeded'))
);

CREATE INDEX IF NOT EXISTS client_claim_watchlist_mappings_workspace_idx
  ON public.client_claim_watchlist_mappings (workspace_id);

CREATE INDEX IF NOT EXISTS client_claim_watchlist_mappings_client_claim_idx
  ON public.client_claim_watchlist_mappings (workspace_id, client_claim_id);

CREATE INDEX IF NOT EXISTS client_claim_watchlist_mappings_claim_family_idx
  ON public.client_claim_watchlist_mappings (claim_family);

CREATE INDEX IF NOT EXISTS client_claim_watchlist_mappings_status_idx
  ON public.client_claim_watchlist_mappings (mapping_status);

INSERT INTO public.client_claim_watchlist_mappings (
  workspace_id,
  client_claim_id,
  claim_family,
  watchlist_id,
  mapping_status,
  mapping_confidence,
  mapping_source
)
VALUES (
  'demo-workspace-spa-menu',
  'demo-claim-magnesium-stress-001',
  'magnesium_cortisol_stress',
  'watch-magnesium-cortisol',
  'active',
  'high',
  'seeded'
)
ON CONFLICT (workspace_id, client_claim_id, claim_family) DO NOTHING;

ALTER TABLE public.claim_family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_claim_watchlist_mappings ENABLE ROW LEVEL SECURITY;

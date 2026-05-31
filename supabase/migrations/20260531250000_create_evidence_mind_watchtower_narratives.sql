-- Phase 35: durable evidence-constrained watchtower narratives from Evidence Mind digests.

CREATE TABLE IF NOT EXISTS public.evidence_mind_watchtower_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  digest_id uuid REFERENCES public.evidence_mind_digests (id) ON DELETE SET NULL,
  claim_family text,
  narrative_type text NOT NULL,
  narrative_version text NOT NULL,
  title text NOT NULL,
  summary_text text NOT NULL,
  what_changed_text text,
  why_it_matters_text text,
  operator_focus_text text,
  recommended_next_action_text text,
  risk_posture text NOT NULL,
  confidence_level text,
  source_counts_json jsonb,
  referenced_entities_json jsonb,
  generation_method text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_mind_watchtower_narratives_type_check
    CHECK (
      narrative_type IN (
        'digest_interpretation',
        'claim_family_watch_update',
        'evidence_change_summary'
      )
    ),
  CONSTRAINT evidence_mind_watchtower_narratives_risk_posture_check
    CHECK (
      risk_posture IN (
        'stable',
        'monitor',
        'elevated',
        'material_change',
        'unknown'
      )
    ),
  CONSTRAINT evidence_mind_watchtower_narratives_generation_method_check
    CHECK (generation_method IN ('deterministic_template', 'llm_assisted')),
  CONSTRAINT evidence_mind_watchtower_narratives_confidence_level_check
    CHECK (
      confidence_level IS NULL OR confidence_level IN ('high', 'medium', 'low')
    )
);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narratives_workspace_idx
  ON public.evidence_mind_watchtower_narratives (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narratives_digest_idx
  ON public.evidence_mind_watchtower_narratives (digest_id);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narratives_claim_family_idx
  ON public.evidence_mind_watchtower_narratives (claim_family);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narratives_risk_posture_idx
  ON public.evidence_mind_watchtower_narratives (risk_posture);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narratives_created_at_idx
  ON public.evidence_mind_watchtower_narratives (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_mind_watchtower_narratives_digest_type_version_idx
  ON public.evidence_mind_watchtower_narratives (digest_id, narrative_type, narrative_version)
  WHERE digest_id IS NOT NULL;

ALTER TABLE public.evidence_mind_watchtower_narratives ENABLE ROW LEVEL SECURITY;

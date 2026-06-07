-- Phase 36A: durable deterministic watchtower narrative diff records (foundation only).

CREATE TABLE IF NOT EXISTS public.evidence_mind_watchtower_narrative_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  current_narrative_id uuid NOT NULL REFERENCES public.evidence_mind_watchtower_narratives (id) ON DELETE CASCADE,
  previous_narrative_id uuid REFERENCES public.evidence_mind_watchtower_narratives (id) ON DELETE SET NULL,
  current_digest_id uuid REFERENCES public.evidence_mind_digests (id) ON DELETE SET NULL,
  previous_digest_id uuid REFERENCES public.evidence_mind_digests (id) ON DELETE SET NULL,
  comparison_scope text NOT NULL,
  diff_version text NOT NULL,
  interpretation_change_level text NOT NULL,
  risk_posture_change text NOT NULL,
  operator_focus_change text NOT NULL,
  recommended_action_change text NOT NULL,
  urgency_change text NOT NULL,
  change_signals_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  deterministic_summary text NOT NULL,
  comparison_method text NOT NULL DEFAULT 'deterministic_template',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  compared_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_comparison_method_check
    CHECK (comparison_method IN ('deterministic_template')),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_comparison_scope_check
    CHECK (comparison_scope IN ('workspace_digest_sequence')),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_diff_version_check
    CHECK (diff_version IN ('watchtower_narrative_diff_v1')),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_interpretation_change_level_check
    CHECK (interpretation_change_level IN ('none', 'low', 'medium', 'high')),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_risk_posture_change_check
    CHECK (
      risk_posture_change IN (
        'unchanged',
        'increased',
        'decreased',
        'unknown_to_known',
        'known_to_unknown',
        'not_applicable'
      )
    ),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_operator_focus_change_check
    CHECK (operator_focus_change IN ('unchanged', 'changed', 'not_applicable')),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_recommended_action_change_check
    CHECK (recommended_action_change IN ('unchanged', 'changed', 'not_applicable')),
  CONSTRAINT evidence_mind_watchtower_narrative_diffs_urgency_change_check
    CHECK (urgency_change IN ('unchanged', 'increased', 'decreased', 'unknown'))
);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_mind_watchtower_narrative_diffs_current_scope_version_idx
  ON public.evidence_mind_watchtower_narrative_diffs (current_narrative_id, comparison_scope, diff_version);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narrative_diffs_workspace_compared_idx
  ON public.evidence_mind_watchtower_narrative_diffs (workspace_id, compared_at DESC);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narrative_diffs_current_narrative_idx
  ON public.evidence_mind_watchtower_narrative_diffs (current_narrative_id);

CREATE INDEX IF NOT EXISTS evidence_mind_watchtower_narrative_diffs_previous_narrative_idx
  ON public.evidence_mind_watchtower_narrative_diffs (previous_narrative_id);

ALTER TABLE public.evidence_mind_watchtower_narrative_diffs ENABLE ROW LEVEL SECURITY;

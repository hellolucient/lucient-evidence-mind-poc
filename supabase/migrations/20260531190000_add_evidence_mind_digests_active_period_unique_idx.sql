-- Phase 29 fix: dedupe existing active digests, then prevent future duplicates.
-- Run manually in Supabase SQL Editor if not using Supabase CLI migrations.
--
-- Keeps the newest active digest (created_at, then id) per workspace + period.
-- Older duplicates are archived so reviewed/archived history can still coexist later.

WITH ranked_active_digests AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, period_start, period_end
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.evidence_mind_digests
  WHERE status IN ('draft', 'ready_for_review')
)
UPDATE public.evidence_mind_digests AS digests
SET
  status = 'archived',
  updated_at = now()
FROM ranked_active_digests AS ranked
WHERE digests.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS evidence_mind_digests_active_period_unique_idx
  ON public.evidence_mind_digests (workspace_id, period_start, period_end)
  WHERE status IN ('draft', 'ready_for_review');

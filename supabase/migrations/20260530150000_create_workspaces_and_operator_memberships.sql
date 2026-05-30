-- Phase 23A: workspace registry and operator memberships for review queue auth.

CREATE TABLE IF NOT EXISTS public.workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_operator_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_operator_memberships_user_id_idx
  ON public.workspace_operator_memberships (user_id);

CREATE INDEX IF NOT EXISTS workspace_operator_memberships_workspace_id_idx
  ON public.workspace_operator_memberships (workspace_id);

INSERT INTO public.workspaces (id, name)
VALUES ('demo-workspace-spa-menu', 'Demo Spa Menu Workspace')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_operator_memberships ENABLE ROW LEVEL SECURITY;

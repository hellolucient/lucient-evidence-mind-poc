-- Phase 23A demo operator membership seed (run manually after creating a Supabase Auth user).
--
-- 1. Create an operator in Supabase Auth (Dashboard -> Authentication -> Users -> Add user)
--    or sign in once via /review-login so the user row exists.
-- 2. Replace OPERATOR_USER_UUID below with auth.users.id for that operator email.
-- 3. Run in Supabase SQL Editor.

INSERT INTO public.workspaces (id, name)
VALUES ('demo-workspace-spa-menu', 'Demo Spa Menu Workspace')
ON CONFLICT (id) DO NOTHING;

-- INSERT INTO public.workspace_operator_memberships (workspace_id, user_id, role)
-- VALUES (
--   'demo-workspace-spa-menu',
--   'OPERATOR_USER_UUID',
--   'operator'
-- )
-- ON CONFLICT (workspace_id, user_id) DO NOTHING;

import {
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";

export const WORKSPACES_TABLE = "workspaces";
export const WORKSPACE_OPERATOR_MEMBERSHIPS_TABLE = "workspace_operator_memberships";

export const DEMO_WORKSPACE_ID = "demo-workspace-spa-menu";

export type WorkspaceOperatorMembership = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export function isWorkspaceOperatorMembershipConfigured(): boolean {
  const config = getSupabaseEnvConfig();
  return config.hasSupabaseUrl && config.hasSupabaseServiceRoleKey;
}

export async function listWorkspaceIdsForOperator(userId: string): Promise<string[]> {
  if (!isWorkspaceOperatorMembershipConfigured()) {
    return [];
  }

  const client = createSupabaseServerClient();
  const { data, error } = await client
    .from(WORKSPACE_OPERATOR_MEMBERSHIPS_TABLE)
    .select("workspace_id")
    .eq("user_id", userId);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => String(row.workspace_id));
}

export async function operatorHasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const workspaceIds = await listWorkspaceIdsForOperator(userId);
  return workspaceIds.includes(workspaceId);
}

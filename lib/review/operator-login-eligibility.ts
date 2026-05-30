import { createSupabaseServerClient, getSupabaseEnvConfig } from "@/engine/watchlist/supabase-client";

import { normalizeOperatorLoginEmail } from "@/lib/review/operator-login-email";
import {
  isWorkspaceOperatorMembershipConfigured,
  listWorkspaceIdsForOperator,
  WORKSPACE_OPERATOR_MEMBERSHIPS_TABLE,
} from "@/lib/workspace-operator-membership-store";

export type AuthUserLookupResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "auth_user_not_found" | "auth_user_lookup_failed" | "supabase_service_role_not_configured" };

export type OperatorMembershipLookupResult =
  | { ok: true; hasMembership: true }
  | {
      ok: false;
      reason: "workspace_membership_not_found" | "membership_lookup_failed" | "supabase_service_role_not_configured";
    };

export async function findAuthUserIdByEmail(email: string): Promise<AuthUserLookupResult> {
  const normalizedEmail = normalizeOperatorLoginEmail(email);
  if (!normalizedEmail) {
    return { ok: false, reason: "auth_user_not_found" };
  }

  const config = getSupabaseEnvConfig();
  if (!config.hasSupabaseServiceRoleKey || !config.hasSupabaseUrl) {
    return { ok: false, reason: "supabase_service_role_not_configured" };
  }

  const client = createSupabaseServerClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { ok: false, reason: "auth_user_lookup_failed" };
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail
    );

    if (match?.id) {
      return { ok: true, userId: match.id };
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return { ok: false, reason: "auth_user_not_found" };
}

export async function operatorHasWorkspaceMembership(
  userId: string
): Promise<OperatorMembershipLookupResult> {
  if (!isWorkspaceOperatorMembershipConfigured()) {
    return { ok: false, reason: "supabase_service_role_not_configured" };
  }

  const client = createSupabaseServerClient();
  const { data, error } = await client
    .from(WORKSPACE_OPERATOR_MEMBERSHIPS_TABLE)
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    return { ok: false, reason: "membership_lookup_failed" };
  }

  if (!data || data.length === 0) {
    return { ok: false, reason: "workspace_membership_not_found" };
  }

  return { ok: true, hasMembership: true };
}

export async function validateApprovedOperatorEmail(
  email: string
): Promise<
  | { ok: true; userId: string }
  | {
      ok: false;
      reason:
        | "auth_user_not_found"
        | "auth_user_lookup_failed"
        | "workspace_membership_not_found"
        | "membership_lookup_failed"
        | "supabase_service_role_not_configured";
    }
> {
  const authUser = await findAuthUserIdByEmail(email);
  if (!authUser.ok) {
    return authUser;
  }

  const membership = await operatorHasWorkspaceMembership(authUser.userId);
  if (!membership.ok) {
    return membership;
  }

  return { ok: true, userId: authUser.userId };
}

export async function listWorkspaceIdsForApprovedOperator(
  userId: string
): Promise<string[]> {
  return listWorkspaceIdsForOperator(userId);
}

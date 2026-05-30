import { cookies } from "next/headers";

import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  INTERNAL_REVIEW_ACCESS_COOKIE,
  buildInternalReviewUnauthorizedResponse,
  buildReviewItemsAccessPath,
  isInternalReviewAccessConfigured,
  isValidInternalReviewAccessCookie,
  isValidInternalReviewAccessToken,
  readAccessTokenFromSearchParams,
  type InternalReviewAuthFailure,
} from "@/lib/internal-review-access";
import { getSupabaseAuthUser, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";
import { listWorkspaceIdsForOperator } from "@/lib/workspace-operator-membership-store";

export type ReviewQueueAccessContext =
  | {
      authorized: true;
      mode: "operator";
      userId: string;
      workspaceIds: string[];
    }
  | {
      authorized: true;
      mode: "break_glass";
      workspaceIds: null;
    };

export type ReviewQueueAccessDenied = {
  authorized: false;
  status: 401 | 403;
  reason: string;
  body?: Record<string, unknown>;
};

export type ReviewQueueAccessResult = ReviewQueueAccessContext | ReviewQueueAccessDenied;

export type ReviewQueuePageAccessResult =
  | { status: "authorized"; access: ReviewQueueAccessContext }
  | { status: "blocked"; showLoginLink: boolean }
  | { status: "redirect"; path: string };

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

async function getBreakGlassCookieAuthorized(): Promise<boolean> {
  if (!isInternalReviewAccessConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(INTERNAL_REVIEW_ACCESS_COOKIE)?.value;
  return isValidInternalReviewAccessCookie(cookieValue);
}

async function resolveBreakGlassAccess(
  authorization: string | null
): Promise<ReviewQueueAccessContext | null> {
  if (!(await getBreakGlassCookieAuthorized())) {
    const bearerToken = readBearerToken(authorization);
    if (!isValidInternalReviewAccessToken(bearerToken)) {
      return null;
    }
  }

  return {
    authorized: true,
    mode: "break_glass",
    workspaceIds: null,
  };
}

async function resolveOperatorAccess(): Promise<ReviewQueueAccessContext | null> {
  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const user = await getSupabaseAuthUser();
  if (!user) {
    return null;
  }

  const workspaceIds = await listWorkspaceIdsForOperator(user.id);
  if (workspaceIds.length === 0) {
    return null;
  }

  return {
    authorized: true,
    mode: "operator",
    userId: user.id,
    workspaceIds,
  };
}

export async function resolveReviewQueueAccess(
  authorization: string | null = null
): Promise<ReviewQueueAccessResult> {
  const operatorAccess = await resolveOperatorAccess();
  if (operatorAccess) {
    return operatorAccess;
  }

  const breakGlassAccess = await resolveBreakGlassAccess(authorization);
  if (breakGlassAccess) {
    return breakGlassAccess;
  }

  const authFailure: InternalReviewAuthFailure = {
    authorized: false,
    internal_review_access_configured: isInternalReviewAccessConfigured(),
    reason: "Unauthorized review queue request.",
  };

  return {
    authorized: false,
    status: 401,
    reason: authFailure.reason,
    body: buildInternalReviewUnauthorizedResponse(authFailure, "/review-items"),
  };
}

export async function resolveReviewQueuePageAccess(
  params: Record<string, string | string[] | undefined>
): Promise<ReviewQueuePageAccessResult> {
  const queryToken = readAccessTokenFromSearchParams(params);
  if (queryToken !== undefined) {
    if (!isValidInternalReviewAccessToken(queryToken)) {
      return {
        status: "blocked",
        showLoginLink: isSupabaseAuthConfigured(),
      };
    }

    return {
      status: "redirect",
      path: buildReviewItemsAccessPath(params),
    };
  }

  const operatorAccess = await resolveOperatorAccess();
  if (operatorAccess) {
    return { status: "authorized", access: operatorAccess };
  }

  if (await getBreakGlassCookieAuthorized()) {
    return {
      status: "authorized",
      access: {
        authorized: true,
        mode: "break_glass",
        workspaceIds: null,
      },
    };
  }

  return {
    status: "blocked",
    showLoginLink: isSupabaseAuthConfigured(),
  };
}

export async function authorizeReviewQueueApiRequest(
  headers: { authorization: string | null },
  route: string
): Promise<ReviewQueueAccessResult> {
  const access = await resolveReviewQueueAccess(headers.authorization);
  if (!access.authorized) {
    return {
      ...access,
      body: buildReviewUnauthorizedApiBody(route, access.reason),
    };
  }

  return access;
}

export function buildReviewUnauthorizedApiBody(
  route: string,
  message: string
): Record<string, unknown> {
  return {
    ok: false,
    error: "unauthorized",
    phase: CURRENT_WATCH_PHASE,
    route,
    internal_review_access_configured: isInternalReviewAccessConfigured(),
    operator_auth_configured: isSupabaseAuthConfigured(),
    message,
  };
}

export function buildReviewForbiddenApiBody(
  route: string,
  message: string
): Record<string, unknown> {
  return {
    ok: false,
    error: "forbidden",
    phase: CURRENT_WATCH_PHASE,
    route,
    message,
  };
}

export function canAccessReviewItemWorkspace(
  access: ReviewQueueAccessContext,
  workspaceId: string
): boolean {
  if (access.mode === "break_glass") {
    return true;
  }

  return access.workspaceIds.includes(workspaceId);
}

export function applyWorkspaceScopeToListFilters<T extends { workspace_id?: string }>(
  filters: T,
  access: ReviewQueueAccessContext
): T & { workspace_ids?: string[] } {
  if (access.mode === "break_glass") {
    return filters;
  }

  const allowed = access.workspaceIds;
  if (allowed.length === 0) {
    return { ...filters, workspace_ids: ["__no_workspace_access__"] };
  }

  if (filters.workspace_id) {
    if (!allowed.includes(filters.workspace_id)) {
      return { ...filters, workspace_ids: ["__no_workspace_access__"] };
    }

    return { ...filters, workspace_ids: [filters.workspace_id] };
  }

  return { ...filters, workspace_ids: allowed };
}

export function isReviewQueueAccessContext(
  access: ReviewQueueAccessResult
): access is ReviewQueueAccessContext {
  return access.authorized;
}

import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

export const INTERNAL_REVIEW_ACCESS_COOKIE = "internal_review_access";

/** Shared cookie path so UI and `/api/review-items*` routes receive the same session. */
export const INTERNAL_REVIEW_ACCESS_COOKIE_PATH = "/";

export type InternalReviewAuthFailure = {
  authorized: false;
  internal_review_access_configured: boolean;
  reason: string;
};

export type InternalReviewAuthSuccess = {
  authorized: true;
};

export type InternalReviewAuthResult =
  | InternalReviewAuthSuccess
  | InternalReviewAuthFailure;

export type InternalReviewPageAccessResult =
  | { status: "authorized" }
  | { status: "blocked" }
  | { status: "redirect"; path: string };

function getConfiguredInternalReviewAccessToken(): string | null {
  const token = process.env.INTERNAL_REVIEW_ACCESS_TOKEN?.trim();
  return token || null;
}

function timingSafeEqualStrings(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isInternalReviewAccessConfigured(): boolean {
  return Boolean(getConfiguredInternalReviewAccessToken());
}

export function internalReviewAccessCookieValue(token: string): string {
  return createHash("sha256").update(`internal-review:${token}`).digest("hex");
}

export function isValidInternalReviewAccessToken(
  provided: string | null | undefined
): boolean {
  const configured = getConfiguredInternalReviewAccessToken();
  if (!configured || !provided) {
    return false;
  }

  return timingSafeEqualStrings(provided.trim(), configured);
}

export function isValidInternalReviewAccessCookie(
  cookieValue: string | null | undefined
): boolean {
  const configured = getConfiguredInternalReviewAccessToken();
  if (!configured || !cookieValue) {
    return false;
  }

  const expected = internalReviewAccessCookieValue(configured);
  return timingSafeEqualStrings(cookieValue, expected);
}

export function readAccessTokenFromSearchParams(
  params: Record<string, string | string[] | undefined>
): string | undefined {
  const value = params.access_token;
  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}

export function buildReviewItemsPathWithoutAccessToken(
  params: Record<string, string | string[] | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === "access_token" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        searchParams.append(key, entry);
      }
      continue;
    }

    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/review-items?${query}` : "/review-items";
}

export function buildReviewItemsAccessPath(
  params: Record<string, string | string[] | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        searchParams.append(key, entry);
      }
      continue;
    }

    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/review-items/access?${query}` : "/review-items/access";
}

function configuredInternalReviewAccessCookieValue(): string | null {
  const configured = getConfiguredInternalReviewAccessToken();
  if (!configured) {
    return null;
  }

  return internalReviewAccessCookieValue(configured);
}

export function appendInternalReviewAccessCookie(response: NextResponse): void {
  const cookieValue = configuredInternalReviewAccessCookieValue();
  if (!cookieValue) {
    return;
  }

  response.cookies.set(INTERNAL_REVIEW_ACCESS_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: INTERNAL_REVIEW_ACCESS_COOKIE_PATH,
  });
}

export function buildInternalReviewUnauthorizedResponse(
  auth: InternalReviewAuthFailure,
  route: string
): Record<string, unknown> {
  return {
    ok: false,
    error: "unauthorized",
    phase: CURRENT_WATCH_PHASE,
    route,
    internal_review_access_configured: auth.internal_review_access_configured,
    message: auth.reason,
  };
}

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export async function authorizeInternalReviewApiRequest(
  headers: {
    authorization: string | null;
  },
  route: string
): Promise<
  | { authorized: true }
  | { authorized: false; body: Record<string, unknown>; status: 401 }
> {
  if (!isInternalReviewAccessConfigured()) {
    const auth: InternalReviewAuthFailure = {
      authorized: false,
      internal_review_access_configured: false,
      reason:
        "INTERNAL_REVIEW_ACCESS_TOKEN is not configured for review queue API access.",
    };
    return {
      authorized: false,
      body: buildInternalReviewUnauthorizedResponse(auth, route),
      status: 401,
    };
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(INTERNAL_REVIEW_ACCESS_COOKIE)?.value;
  if (isValidInternalReviewAccessCookie(cookieValue)) {
    return { authorized: true };
  }

  const bearerToken = readBearerToken(headers.authorization);
  if (isValidInternalReviewAccessToken(bearerToken)) {
    return { authorized: true };
  }

  const auth: InternalReviewAuthFailure = {
    authorized: false,
    internal_review_access_configured: true,
    reason: "Unauthorized review queue API request.",
  };

  return {
    authorized: false,
    body: buildInternalReviewUnauthorizedResponse(auth, route),
    status: 401,
  };
}

export async function resolveInternalReviewPageAccess(
  params: Record<string, string | string[] | undefined>
): Promise<InternalReviewPageAccessResult> {
  if (!isInternalReviewAccessConfigured()) {
    return { status: "blocked" };
  }

  const queryToken = readAccessTokenFromSearchParams(params);
  if (queryToken !== undefined) {
    if (!isValidInternalReviewAccessToken(queryToken)) {
      return { status: "blocked" };
    }

    return {
      status: "redirect",
      path: buildReviewItemsAccessPath(params),
    };
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(INTERNAL_REVIEW_ACCESS_COOKIE)?.value;
  if (isValidInternalReviewAccessCookie(cookieValue)) {
    return { status: "authorized" };
  }

  return { status: "blocked" };
}

export async function isInternalReviewUpdateAuthorized(): Promise<boolean> {
  if (!isInternalReviewAccessConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(INTERNAL_REVIEW_ACCESS_COOKIE)?.value;
  return isValidInternalReviewAccessCookie(cookieValue);
}

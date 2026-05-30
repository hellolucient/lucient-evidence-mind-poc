import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const INTERNAL_REVIEW_ACCESS_COOKIE = "internal_review_access";

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
    path: "/review-items",
  });
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

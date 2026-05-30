import { NextResponse } from "next/server";

import {
  appendInternalReviewAccessCookie,
  buildReviewItemsPathWithoutAccessToken,
  isInternalReviewAccessConfigured,
  isValidInternalReviewAccessToken,
  readAccessTokenFromSearchParams,
} from "@/lib/internal-review-access";

export const runtime = "nodejs";

function searchParamsToRecord(
  searchParams: URLSearchParams
): Record<string, string | string[] | undefined> {
  const params: Record<string, string | string[] | undefined> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }

  return params;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = searchParamsToRecord(url.searchParams);
  const token = readAccessTokenFromSearchParams(params);

  if (
    !isInternalReviewAccessConfigured() ||
    !isValidInternalReviewAccessToken(token)
  ) {
    return NextResponse.redirect(new URL("/review-items", request.url), 303);
  }

  const response = NextResponse.redirect(
    new URL(buildReviewItemsPathWithoutAccessToken(params), request.url),
    303
  );
  appendInternalReviewAccessCookie(response);

  return response;
}

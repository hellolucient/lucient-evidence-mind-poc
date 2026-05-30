import { afterEach, describe, expect, it } from "vitest";

import {
  internalReviewAccessCookieValue,
  isInternalReviewAccessConfigured,
  isValidInternalReviewAccessCookie,
  isValidInternalReviewAccessToken,
  readAccessTokenFromSearchParams,
} from "./internal-review-access";

const ORIGINAL_TOKEN = process.env.INTERNAL_REVIEW_ACCESS_TOKEN;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;
  } else {
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = ORIGINAL_TOKEN;
  }
});

describe("internal-review-access", () => {
  it("reports configuration state from INTERNAL_REVIEW_ACCESS_TOKEN", () => {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;
    expect(isInternalReviewAccessConfigured()).toBe(false);

    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = "  test-token  ";
    expect(isInternalReviewAccessConfigured()).toBe(true);
  });

  it("accepts only the configured access token", () => {
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = "expected-token";

    expect(isValidInternalReviewAccessToken("expected-token")).toBe(true);
    expect(isValidInternalReviewAccessToken("wrong-token")).toBe(false);
    expect(isValidInternalReviewAccessToken(undefined)).toBe(false);
  });

  it("validates the httpOnly session cookie without storing the raw token", () => {
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = "expected-token";

    const cookieValue = internalReviewAccessCookieValue("expected-token");
    expect(isValidInternalReviewAccessCookie(cookieValue)).toBe(true);
    expect(isValidInternalReviewAccessCookie("forged-cookie")).toBe(false);
  });

  it("reads access_token from search params", () => {
    expect(readAccessTokenFromSearchParams({ access_token: "abc" })).toBe("abc");
    expect(readAccessTokenFromSearchParams({ access_token: ["first", "second"] })).toBe("first");
    expect(readAccessTokenFromSearchParams({ status: "open" })).toBeUndefined();
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/review-items/access/route";
import {
  INTERNAL_REVIEW_ACCESS_COOKIE,
  internalReviewAccessCookieValue,
} from "@/lib/internal-review-access";

const ORIGINAL_TOKEN = process.env.INTERNAL_REVIEW_ACCESS_TOKEN;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;
  } else {
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = ORIGINAL_TOKEN;
  }
});

beforeEach(() => {
  process.env.INTERNAL_REVIEW_ACCESS_TOKEN = "expected-token";
});

describe("GET /review-items/access", () => {
  it("redirects to /review-items when token is invalid", async () => {
    const response = await GET(
      new Request("https://example.com/review-items/access?access_token=wrong-token")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/review-items");
    expect(response.cookies.get(INTERNAL_REVIEW_ACCESS_COOKIE)).toBeUndefined();
  });

  it("sets session cookie and redirects to review queue without access_token", async () => {
    const response = await GET(
      new Request(
        "https://example.com/review-items/access?access_token=expected-token&status=open"
      )
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/review-items?status=open"
    );

    const cookie = response.cookies.get(INTERNAL_REVIEW_ACCESS_COOKIE);
    expect(cookie?.value).toBe(internalReviewAccessCookieValue("expected-token"));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");
  });
});

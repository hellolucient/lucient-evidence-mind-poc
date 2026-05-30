import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCookiesGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
  })),
}));

import {
  authorizeInternalReviewApiRequest,
  internalReviewAccessCookieValue,
} from "@/lib/internal-review-access";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const ORIGINAL_TOKEN = process.env.INTERNAL_REVIEW_ACCESS_TOKEN;
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.INTERNAL_REVIEW_ACCESS_TOKEN = "expected-token";
  mockCookiesGet.mockReturnValue(undefined);
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;
  } else {
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = ORIGINAL_TOKEN;
  }

  if (ORIGINAL_CRON_SECRET === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  }

  vi.clearAllMocks();
});

describe("authorizeInternalReviewApiRequest", () => {
  it("accepts a valid internal review session cookie", async () => {
    mockCookiesGet.mockReturnValue({
      value: internalReviewAccessCookieValue("expected-token"),
    });

    const result = await authorizeInternalReviewApiRequest(
      { authorization: null },
      "/api/review-items"
    );

    expect(result).toEqual({ authorized: true });
  });

  it("accepts Bearer INTERNAL_REVIEW_ACCESS_TOKEN", async () => {
    const result = await authorizeInternalReviewApiRequest(
      { authorization: "Bearer expected-token" },
      "/api/review-items"
    );

    expect(result).toEqual({ authorized: true });
  });

  it("rejects CRON_SECRET bearer tokens", async () => {
    process.env.CRON_SECRET = "cron-secret-value";

    const result = await authorizeInternalReviewApiRequest(
      { authorization: "Bearer cron-secret-value" },
      "/api/review-items"
    );

    expect(result.authorized).toBe(false);
  });

  it("rejects unauthenticated requests", async () => {
    const result = await authorizeInternalReviewApiRequest(
      { authorization: null },
      "/api/review-items"
    );

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(401);
      expect(result.body).toMatchObject({
        ok: false,
        error: "unauthorized",
        phase: CURRENT_WATCH_PHASE,
        internal_review_access_configured: true,
      });
    }
  });

  it("fails closed when INTERNAL_REVIEW_ACCESS_TOKEN is not configured", async () => {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;

    const result = await authorizeInternalReviewApiRequest(
      { authorization: "Bearer expected-token" },
      "/api/review-items"
    );

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.body).toMatchObject({
        internal_review_access_configured: false,
      });
    }
  });
});

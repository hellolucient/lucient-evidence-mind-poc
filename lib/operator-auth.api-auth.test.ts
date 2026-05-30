import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCookiesGet = vi.fn();
const mockGetSupabaseAuthUser = vi.fn();
const mockListWorkspaceIdsForOperator = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
  })),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  isSupabaseAuthConfigured: vi.fn(() => true),
  getSupabaseAuthUser: (...args: unknown[]) => mockGetSupabaseAuthUser(...args),
}));

vi.mock("@/lib/workspace-operator-membership-store", () => ({
  listWorkspaceIdsForOperator: (...args: unknown[]) =>
    mockListWorkspaceIdsForOperator(...args),
}));

import {
  authorizeReviewQueueApiRequest,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import {
  internalReviewAccessCookieValue,
  isInternalReviewAccessConfigured,
} from "@/lib/internal-review-access";

const ORIGINAL_TOKEN = process.env.INTERNAL_REVIEW_ACCESS_TOKEN;

beforeEach(() => {
  process.env.INTERNAL_REVIEW_ACCESS_TOKEN = "expected-token";
  mockCookiesGet.mockReturnValue(undefined);
  mockGetSupabaseAuthUser.mockResolvedValue(null);
  mockListWorkspaceIdsForOperator.mockResolvedValue([]);
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;
  } else {
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN = ORIGINAL_TOKEN;
  }
  vi.clearAllMocks();
});

describe("resolveReviewQueueAccess", () => {
  it("accepts break-glass bearer token", async () => {
    const access = await resolveReviewQueueAccess("Bearer expected-token");

    expect(access.authorized).toBe(true);
    if (access.authorized) {
      expect(access.mode).toBe("break_glass");
    }
  });

  it("accepts operator session with workspace memberships", async () => {
    mockGetSupabaseAuthUser.mockResolvedValue({ id: "user-123", email: "ops@example.com" });
    mockListWorkspaceIdsForOperator.mockResolvedValue(["demo-workspace-spa-menu"]);

    const access = await resolveReviewQueueAccess(null);

    expect(access).toEqual({
      authorized: true,
      mode: "operator",
      userId: "user-123",
      workspaceIds: ["demo-workspace-spa-menu"],
    });
  });

  it("rejects CRON_SECRET bearer tokens", async () => {
    process.env.CRON_SECRET = "cron-secret-value";

    const access = await resolveReviewQueueAccess("Bearer cron-secret-value");

    expect(access.authorized).toBe(false);
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const access = await resolveReviewQueueAccess(null);

    expect(access.authorized).toBe(false);
  });

  it("accepts break-glass cookie without bearer token", async () => {
    mockCookiesGet.mockReturnValue({
      value: internalReviewAccessCookieValue("expected-token"),
    });

    const access = await resolveReviewQueueAccess(null);

    expect(access.authorized).toBe(true);
    if (access.authorized) {
      expect(access.mode).toBe("break_glass");
    }
  });
});

describe("authorizeReviewQueueApiRequest", () => {
  it("returns 401 body when access is denied", async () => {
    delete process.env.INTERNAL_REVIEW_ACCESS_TOKEN;

    const result = await authorizeReviewQueueApiRequest(
      { authorization: null },
      "/api/review-items"
    );

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(401);
      expect(result.body?.error).toBe("unauthorized");
    }

    expect(isInternalReviewAccessConfigured()).toBe(false);
  });
});

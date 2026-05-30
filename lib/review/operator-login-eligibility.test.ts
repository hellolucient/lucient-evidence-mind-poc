import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListUsers = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: () => ({
    url: "https://project.supabase.co",
    serviceRoleKey: "service-role-key",
    hasSupabaseUrl: true,
    hasSupabaseServiceRoleKey: true,
    supabaseUrlHost: "project.supabase.co",
  }),
  createSupabaseServerClient: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
      },
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import {
  findAuthUserIdByEmail,
  operatorHasWorkspaceMembership,
  validateApprovedOperatorEmail,
} from "@/lib/review/operator-login-eligibility";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("operator-login-eligibility", () => {
  it("finds auth user by normalized email", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { id: "user-123", email: "Operator@Example.com" },
        ],
      },
      error: null,
    });

    const result = await findAuthUserIdByEmail("  operator@example.com ");

    expect(result).toEqual({ ok: true, userId: "user-123" });
  });

  it("returns auth_user_not_found when no user matches", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: { users: [] },
      error: null,
    });

    const result = await findAuthUserIdByEmail("missing@example.com");

    expect(result).toEqual({ ok: false, reason: "auth_user_not_found" });
  });

  it("returns workspace_membership_not_found when auth user has no membership", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ id: "user-123", email: "operator@example.com" }],
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const result = await validateApprovedOperatorEmail("operator@example.com");

    expect(result).toEqual({ ok: false, reason: "workspace_membership_not_found" });
  });

  it("approves operator when auth user and membership exist", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ id: "user-123", email: "operator@example.com" }],
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ workspace_id: "demo-workspace-spa-menu" }],
            error: null,
          }),
        }),
      }),
    });

    const result = await validateApprovedOperatorEmail("operator@example.com");

    expect(result).toEqual({ ok: true, userId: "user-123" });
  });

  it("returns membership_lookup_failed on membership query error", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ id: "user-123", email: "operator@example.com" }],
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "db error" },
          }),
        }),
      }),
    });

    const result = await operatorHasWorkspaceMembership("user-123");

    expect(result).toEqual({ ok: false, reason: "membership_lookup_failed" });
  });
});

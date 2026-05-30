import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignOut = vi.fn();
const mockCreateSupabaseAuthServerClient = vi.fn();
const mockIsSupabaseAuthConfigured = vi.fn();

vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseAuthServerClient: (...args: unknown[]) =>
    mockCreateSupabaseAuthServerClient(...args),
  isSupabaseAuthConfigured: (...args: unknown[]) => mockIsSupabaseAuthConfigured(...args),
}));

import { POST } from "@/app/review-items/logout/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseAuthConfigured.mockReturnValue(true);
  mockCreateSupabaseAuthServerClient.mockResolvedValue({
    auth: {
      signOut: mockSignOut,
    },
  });
  mockSignOut.mockResolvedValue({ error: null });
});

describe("POST /review-items/logout", () => {
  it("signs out the Supabase session and redirects to review login", async () => {
    const request = new Request("https://example.com/review-items/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/review-login");
  });

  it("redirects to review login even when Supabase Auth is not configured", async () => {
    mockIsSupabaseAuthConfigured.mockReturnValue(false);

    const request = new Request("https://example.com/review-items/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://example.com/review-login");
  });
});

import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignOut = vi.fn();
const mockCreateSupabaseAuthRouteHandlerClient = vi.fn();
const mockIsSupabaseAuthConfigured = vi.fn();

vi.mock("@/lib/supabase/auth-route-handler", () => ({
  createSupabaseAuthRouteHandlerClient: (...args: unknown[]) =>
    mockCreateSupabaseAuthRouteHandlerClient(...args),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  isSupabaseAuthConfigured: (...args: unknown[]) => mockIsSupabaseAuthConfigured(...args),
}));

import { POST } from "@/app/review-items/logout/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mockIsSupabaseAuthConfigured.mockReturnValue(true);
  mockSignOut.mockResolvedValue({ error: null });
  mockCreateSupabaseAuthRouteHandlerClient.mockImplementation(async (response: NextResponse) => ({
    auth: {
      signOut: mockSignOut,
    },
    __response: response,
  }));
});

describe("POST /review-items/logout", () => {
  it("signs out on the redirect response and sends user to review login", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const request = new Request("https://example.com/review-items/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/review-login");
    expect(mockCreateSupabaseAuthRouteHandlerClient.mock.calls[0]?.[0]).toBe(response);
  });
});

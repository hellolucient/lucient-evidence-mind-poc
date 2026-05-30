import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendApprovedOperatorLoginLink = vi.fn();
const mockCreateSupabaseAuthRouteHandlerClient = vi.fn();

vi.mock("@/lib/review/send-operator-login-link", () => ({
  sendApprovedOperatorLoginLink: (...args: unknown[]) =>
    mockSendApprovedOperatorLoginLink(...args),
}));

vi.mock("@/lib/supabase/auth-route-handler", () => ({
  createSupabaseAuthRouteHandlerClient: (...args: unknown[]) =>
    mockCreateSupabaseAuthRouteHandlerClient(...args),
}));

import { POST } from "@/app/review-login/send/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  mockCreateSupabaseAuthRouteHandlerClient.mockImplementation(async (response: Response) => ({
    __response: response,
  }));
  mockSendApprovedOperatorLoginLink.mockResolvedValue({
    ok: true,
    message: "Check your email for the internal review queue login link.",
  });
});

describe("POST /review-login/send", () => {
  it("binds PKCE cookies to the success redirect response", async () => {
    const formData = new FormData();
    formData.set("email", "operator@example.com");

    const request = new Request("https://example.com/review-login/send", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(mockCreateSupabaseAuthRouteHandlerClient).toHaveBeenCalledTimes(1);
    expect(mockSendApprovedOperatorLoginLink).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "operator@example.com",
        siteOrigin: "https://example.com",
      })
    );
    expect(mockCreateSupabaseAuthRouteHandlerClient.mock.calls[0]?.[0]).toBe(response);
    expect(response.headers.get("location")).toBe("https://example.com/review-login?sent=1");
  });

  it("redirects with safe error when magic link send fails", async () => {
    mockSendApprovedOperatorLoginLink.mockResolvedValueOnce({
      ok: false,
      message: "Unable to send login link. Confirm the email is approved for operator access.",
    });

    const formData = new FormData();
    formData.set("email", "operator@example.com");

    const request = new Request("https://example.com/review-login/send", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe(
      "https://example.com/review-login?error=login_send_failed"
    );
  });
});

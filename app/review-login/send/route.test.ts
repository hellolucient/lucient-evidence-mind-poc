import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendApprovedOperatorLoginLink = vi.fn();
const mockAuthClient = { auth: {} };
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
  mockCreateSupabaseAuthRouteHandlerClient.mockResolvedValue(mockAuthClient);
  mockSendApprovedOperatorLoginLink.mockResolvedValue({
    ok: true,
    message: "Check your email for the internal review queue login link.",
  });
});

describe("POST /review-login/send", () => {
  it("sends magic link using route handler site origin resolution", async () => {
    const formData = new FormData();
    formData.set("email", "operator@example.com");

    const request = new Request("https://example.com/review-login/send", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(mockCreateSupabaseAuthRouteHandlerClient).toHaveBeenCalledTimes(1);
    expect(mockSendApprovedOperatorLoginLink).toHaveBeenCalledWith({
      email: "operator@example.com",
      siteOrigin: "https://example.com",
      authClient: mockAuthClient,
    });
    expect(response.headers.get("location")).toBe("https://example.com/review-login?sent=1");
  });

  it("uses forwarded host when NEXT_PUBLIC_SITE_URL is unset", async () => {
    vi.unstubAllEnvs();

    const formData = new FormData();
    formData.set("email", "operator@example.com");

    const request = new Request("https://internal.example/review-login/send", {
      method: "POST",
      headers: {
        "x-forwarded-host": "lucient-evidence-mind-poc.vercel.app",
        "x-forwarded-proto": "https",
      },
      body: formData,
    });

    await POST(request);

    expect(mockSendApprovedOperatorLoginLink).toHaveBeenCalledWith(
      expect.objectContaining({
        siteOrigin: "https://lucient-evidence-mind-poc.vercel.app",
      })
    );
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

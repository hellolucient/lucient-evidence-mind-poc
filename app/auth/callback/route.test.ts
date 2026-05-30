import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExchangeCodeForSession = vi.fn();
const mockVerifyOtp = vi.fn();
const mockCreateSupabaseAuthRouteHandlerClient = vi.fn();
const mockIsSupabaseAuthConfigured = vi.fn();
const mockLogAuthCallbackDiagnostic = vi.fn();

vi.mock("@/lib/supabase/auth-route-handler", () => ({
  createSupabaseAuthRouteHandlerClient: (...args: unknown[]) =>
    mockCreateSupabaseAuthRouteHandlerClient(...args),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  isSupabaseAuthConfigured: (...args: unknown[]) => mockIsSupabaseAuthConfigured(...args),
}));

vi.mock("@/lib/supabase/auth-callback-diagnostics", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/supabase/auth-callback-diagnostics")>();
  return {
    ...actual,
    logAuthCallbackDiagnostic: (...args: unknown[]) => mockLogAuthCallbackDiagnostic(...args),
  };
});

import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mockIsSupabaseAuthConfigured.mockReturnValue(true);
  mockExchangeCodeForSession.mockResolvedValue({ error: null });
  mockVerifyOtp.mockResolvedValue({ error: null });
  mockCreateSupabaseAuthRouteHandlerClient.mockImplementation(async (response: NextResponse) => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      verifyOtp: mockVerifyOtp,
    },
    __response: response,
  }));
});

describe("GET /auth/callback", () => {
  it("exchanges code and redirects to /review-items on the same response object", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const request = new Request(
      "https://example.com/auth/callback?code=auth-code-123&next=/review-items"
    );

    const response = await GET(request);

    expect(mockCreateSupabaseAuthRouteHandlerClient).toHaveBeenCalledTimes(1);
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("auth-code-123");
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe("https://example.com/review-items");
    expect(mockCreateSupabaseAuthRouteHandlerClient.mock.calls[0]?.[0]).toBe(response);
    expect(mockLogAuthCallbackDiagnostic).not.toHaveBeenCalled();
  });

  it("redirects safely to review login when code exchange fails and logs diagnostic reason", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "invalid grant", status: 400 },
    });

    const request = new Request("https://example.com/auth/callback?code=bad-code");
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://example.com/review-login?error=auth_callback_failed"
    );
    expect(response.headers.get("location")).not.toContain("bad-code");
    expect(mockLogAuthCallbackDiagnostic).toHaveBeenCalledWith(
      "otp_expired_or_reused",
      expect.objectContaining({
        authMethod: "exchange_code_for_session",
        supabaseErrorMessage: "invalid grant",
      })
    );
  });

  it("redirects safely when callback credentials are missing and logs diagnostic reason", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const request = new Request("https://example.com/auth/callback?next=/review-items");
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://example.com/review-login?error=auth_callback_failed"
    );
    expect(mockCreateSupabaseAuthRouteHandlerClient).not.toHaveBeenCalled();
    expect(mockLogAuthCallbackDiagnostic).toHaveBeenCalledWith(
      "missing_callback_credentials",
      expect.objectContaining({
        hasCode: false,
      })
    );
  });

  it("redirects safely when Supabase returns callback error params", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const request = new Request(
      "https://example.com/auth/callback?error=access_denied&error_code=otp_expired"
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://example.com/review-login?error=auth_callback_failed"
    );
    expect(mockLogAuthCallbackDiagnostic).toHaveBeenCalledWith(
      "supabase_callback_error",
      expect.objectContaining({
        error: "access_denied",
        errorCode: "otp_expired",
      })
    );
  });

  it("supports token_hash verification fallback", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const request = new Request(
      "https://example.com/auth/callback?token_hash=hash-123&type=email&next=/review-items"
    );

    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: "hash-123",
      type: "email",
    });
    expect(response.headers.get("location")).toBe("https://example.com/review-items");
  });
});

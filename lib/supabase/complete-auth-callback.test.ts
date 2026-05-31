import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExchangeCodeForSession = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetSession = vi.fn();
const mockLogAuthCallbackDiagnostic = vi.fn();

vi.mock("@/lib/supabase/auth-callback-diagnostics", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/supabase/auth-callback-diagnostics")>();
  return {
    ...actual,
    logAuthCallbackDiagnostic: (...args: unknown[]) => mockLogAuthCallbackDiagnostic(...args),
  };
});

import { completeAuthCallback } from "@/lib/supabase/complete-auth-callback";

const supabase = {
  auth: {
    exchangeCodeForSession: mockExchangeCodeForSession,
    verifyOtp: mockVerifyOtp,
    getSession: mockGetSession,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExchangeCodeForSession.mockResolvedValue({ error: null });
  mockVerifyOtp.mockResolvedValue({ error: null });
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
});

describe("completeAuthCallback", () => {
  it("exchanges code for session", async () => {
    const result = await completeAuthCallback(supabase, {
      code: "auth-code-123",
      tokenHash: null,
      type: null,
      next: "/review-items",
      error: null,
      errorCode: null,
      errorDescription: null,
    });

    expect(result).toEqual({ ok: true });
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("auth-code-123");
  });

  it("logs pkce failure when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "PKCE code verifier not found in storage", status: 400 },
    });

    const result = await completeAuthCallback(supabase, {
      code: "bad-code",
      tokenHash: null,
      type: null,
      next: null,
      error: null,
      errorCode: null,
      errorDescription: null,
    });

    expect(result).toEqual({ ok: false, reason: "pkce_code_verifier_missing" });
    expect(mockLogAuthCallbackDiagnostic).toHaveBeenCalledWith(
      "pkce_code_verifier_missing",
      expect.objectContaining({
        authMethod: "exchange_code_for_session",
      })
    );
  });

  it("supports token_hash verification fallback", async () => {
    const result = await completeAuthCallback(supabase, {
      code: null,
      tokenHash: "hash-123",
      type: "email",
      next: "/review-items",
      error: null,
      errorCode: null,
      errorDescription: null,
    });

    expect(result).toEqual({ ok: true });
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: "hash-123",
      type: "email",
    });
  });

  it("accepts implicit session already established in the browser client", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const result = await completeAuthCallback(supabase, {
      code: null,
      tokenHash: null,
      type: null,
      next: "/review-items",
      error: null,
      errorCode: null,
      errorDescription: null,
    });

    expect(result).toEqual({ ok: true });
    expect(mockGetSession).toHaveBeenCalled();
  });

  it("redirects safely when callback credentials are missing", async () => {
    const result = await completeAuthCallback(supabase, {
      code: null,
      tokenHash: null,
      type: null,
      next: "/review-items",
      error: null,
      errorCode: null,
      errorDescription: null,
    });

    expect(result).toEqual({ ok: false, reason: "missing_callback_credentials" });
    expect(mockLogAuthCallbackDiagnostic).toHaveBeenCalledWith(
      "missing_callback_credentials",
      expect.objectContaining({
        hasCode: false,
      })
    );
  });

  it("redirects safely when Supabase returns callback error params", async () => {
    const result = await completeAuthCallback(supabase, {
      code: null,
      tokenHash: null,
      type: null,
      next: null,
      error: "access_denied",
      errorCode: "otp_expired",
      errorDescription: null,
    });

    expect(result).toEqual({ ok: false, reason: "supabase_callback_error" });
    expect(mockLogAuthCallbackDiagnostic).toHaveBeenCalledWith(
      "supabase_callback_error",
      expect.objectContaining({
        error: "access_denied",
        errorCode: "otp_expired",
      })
    );
  });
});

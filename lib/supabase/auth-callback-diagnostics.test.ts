import { describe, expect, it, vi } from "vitest";

import {
  classifyAuthCallbackExchangeFailure,
  classifyAuthCallbackVerifyOtpFailure,
  logAuthCallbackDiagnostic,
  reviewLoginSendErrorMessage,
  reviewLoginSendSuccessMessage,
  sanitizeAuthCallbackDiagnosticDetails,
} from "@/lib/supabase/auth-callback-diagnostics";

describe("auth-callback diagnostics", () => {
  it("classifies expired or reused OTP exchange failures", () => {
    expect(classifyAuthCallbackExchangeFailure("Email link is invalid or has expired")).toBe(
      "otp_expired_or_reused"
    );
    expect(classifyAuthCallbackExchangeFailure("PKCE code verifier not found")).toBe(
      "pkce_code_verifier_missing"
    );
    expect(classifyAuthCallbackExchangeFailure("unknown failure")).toBe(
      "exchange_code_for_session_failure"
    );
  });

  it("classifies verify OTP failures", () => {
    expect(classifyAuthCallbackVerifyOtpFailure("Token has expired or is invalid")).toBe(
      "otp_expired_or_reused"
    );
    expect(classifyAuthCallbackVerifyOtpFailure("unexpected verify failure")).toBe(
      "verify_otp_failure"
    );
  });

  it("sanitizes diagnostic details without secrets or codes", () => {
    const sanitized = sanitizeAuthCallbackDiagnosticDetails({
      code: "secret-code",
      tokenHash: "secret-hash",
      user_id: "user-123",
      supabaseErrorMessage: "invalid grant",
    });

    expect(sanitized).toEqual({
      supabaseErrorMessage: "invalid grant",
    });
  });

  it("logs server-side diagnostics without throwing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logAuthCallbackDiagnostic("missing_callback_credentials", {
      hasCode: false,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[auth-callback]",
      expect.objectContaining({
        reason: "missing_callback_credentials",
        hasCode: false,
      })
    );

    errorSpy.mockRestore();
  });

  it("maps login send and callback messages safely", () => {
    expect(reviewLoginSendSuccessMessage("1")).toContain("Check your email");
    expect(reviewLoginSendErrorMessage("login_send_failed")).toContain("Unable to send login link");
    expect(reviewLoginSendErrorMessage("auth_callback_failed")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  AUTH_CALLBACK_FAILED_ERROR,
  buildAuthCallbackFailureRedirect,
  buildAuthCallbackSuccessRedirect,
  hasAuthCallbackCredentials,
  parseAuthCallbackParams,
  reviewLoginErrorMessage,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-callback";

describe("auth-callback helpers", () => {
  it("parses code and next params from callback URL", () => {
    const params = parseAuthCallbackParams(
      new URL("https://example.com/auth/callback?code=abc123&next=/review-items")
    );

    expect(params).toEqual({
      code: "abc123",
      tokenHash: null,
      type: null,
      next: "/review-items",
      error: null,
      errorCode: null,
      errorDescription: null,
    });
  });

  it("accepts token_hash fallback credentials", () => {
    const params = {
      code: null,
      tokenHash: "hash-value",
      type: "email",
      next: "/review-items",
    };

    expect(hasAuthCallbackCredentials(params)).toBe(true);
  });

  it("sanitizes unsafe next paths", () => {
    expect(sanitizeAuthNextPath("/review-items")).toBe("/review-items");
    expect(sanitizeAuthNextPath("https://evil.example")).toBe("/review-items");
    expect(sanitizeAuthNextPath("//evil.example")).toBe("/review-items");
    expect(sanitizeAuthNextPath(null)).toBe("/review-items");
  });

  it("builds safe failure redirect without secrets", () => {
    expect(buildAuthCallbackFailureRedirect("https://example.com")).toBe(
      "https://example.com/review-login?error=auth_callback_failed"
    );
    expect(buildAuthCallbackSuccessRedirect("https://example.com", "/review-items")).toBe(
      "https://example.com/review-items"
    );
  });

  it("maps callback failure to generic login message", () => {
    expect(reviewLoginErrorMessage(AUTH_CALLBACK_FAILED_ERROR)).toContain(
      "Unable to complete sign-in"
    );
    expect(reviewLoginErrorMessage("secret_code_value")).toBeNull();
  });
});

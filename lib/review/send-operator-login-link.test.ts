import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidateApprovedOperatorEmail = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockCreateSupabaseAuthServerClient = vi.fn();
const mockIsSupabaseAuthConfigured = vi.fn();
const mockLogOperatorLoginDiagnostic = vi.fn();

vi.mock("@/lib/review/operator-login-eligibility", () => ({
  validateApprovedOperatorEmail: (...args: unknown[]) =>
    mockValidateApprovedOperatorEmail(...args),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  isSupabaseAuthConfigured: (...args: unknown[]) => mockIsSupabaseAuthConfigured(...args),
  createSupabaseAuthServerClient: (...args: unknown[]) =>
    mockCreateSupabaseAuthServerClient(...args),
}));

vi.mock("@/lib/review/operator-login-diagnostics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/review/operator-login-diagnostics")>();
  return {
    ...actual,
    logOperatorLoginDiagnostic: (...args: unknown[]) => mockLogOperatorLoginDiagnostic(...args),
  };
});

import {
  operatorLoginResponseIsSafe,
  sendApprovedOperatorLoginLink,
} from "@/lib/review/send-operator-login-link";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseAuthConfigured.mockReturnValue(true);
  mockValidateApprovedOperatorEmail.mockResolvedValue({ ok: true, userId: "user-123" });
  mockSignInWithOtp.mockResolvedValue({ error: null });
  mockCreateSupabaseAuthServerClient.mockResolvedValue({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  });
});

describe("sendApprovedOperatorLoginLink", () => {
  it("sends magic link for approved operator email", async () => {
    const result = await sendApprovedOperatorLoginLink({
      email: "operator@example.com",
      siteOrigin: "https://example.com",
    });

    expect(result.ok).toBe(true);
    expect(mockValidateApprovedOperatorEmail).toHaveBeenCalledWith("operator@example.com");
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "operator@example.com",
      options: {
        emailRedirectTo: "https://example.com/auth/callback?next=/review-items",
        shouldCreateUser: false,
      },
    });
    expect(operatorLoginResponseIsSafe(result)).toBe(true);
  });

  it("normalizes uppercase and whitespace before lookup and send", async () => {
    await sendApprovedOperatorLoginLink({
      email: "  Operator@Example.COM ",
      siteOrigin: "https://example.com",
    });

    expect(mockValidateApprovedOperatorEmail).toHaveBeenCalledWith("operator@example.com");
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "operator@example.com" })
    );
  });

  it("rejects auth user without membership using generic safe error", async () => {
    mockValidateApprovedOperatorEmail.mockResolvedValueOnce({
      ok: false,
      reason: "workspace_membership_not_found",
    });

    const result = await sendApprovedOperatorLoginLink({
      email: "operator@example.com",
      siteOrigin: "https://example.com",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Unable to send login link");
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
    expect(mockLogOperatorLoginDiagnostic).toHaveBeenCalledWith(
      "workspace_membership_not_found",
      expect.objectContaining({ email: "operator@example.com" })
    );
    expect(operatorLoginResponseIsSafe(result)).toBe(true);
  });

  it("rejects missing auth user using generic safe error", async () => {
    mockValidateApprovedOperatorEmail.mockResolvedValueOnce({
      ok: false,
      reason: "auth_user_not_found",
    });

    const result = await sendApprovedOperatorLoginLink({
      email: "missing@example.com",
      siteOrigin: "https://example.com",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Unable to send login link");
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
    expect(operatorLoginResponseIsSafe(result)).toBe(true);
  });

  it("logs magic-link failure but returns generic safe error", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: "redirect url not allowed", status: 400 },
    });

    const result = await sendApprovedOperatorLoginLink({
      email: "operator@example.com",
      siteOrigin: "https://example.com",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Unable to send login link");
    expect(mockLogOperatorLoginDiagnostic).toHaveBeenCalledWith(
      "magic_link_send_failure",
      expect.objectContaining({
        supabaseErrorMessage: "redirect url not allowed",
      })
    );
    expect(JSON.stringify(result)).not.toContain("redirect url not allowed");
    expect(operatorLoginResponseIsSafe(result)).toBe(true);
  });
});

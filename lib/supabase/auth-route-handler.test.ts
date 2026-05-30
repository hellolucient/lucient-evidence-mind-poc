import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

const mockCookieSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [{ name: "existing", value: "cookie" }],
    set: (...args: unknown[]) => mockCookieSet(...args),
  })),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  getSupabaseAuthEnvConfig: () => ({
    url: "https://project.supabase.co",
    anonKey: "anon-key",
  }),
}));

import { createSupabaseAuthRouteHandlerClient } from "@/lib/supabase/auth-route-handler";

describe("createSupabaseAuthRouteHandlerClient", () => {
  it("writes auth cookies to the request store and route handler response", async () => {
    mockCookieSet.mockClear();
    let capturedSetAll: ((cookies: { name: string; value: string; options: object }[]) => void) | null =
      null;

    mockCreateServerClient.mockImplementation((_url, _key, options) => {
      capturedSetAll = options.cookies.setAll;
      return {};
    });

    const response = NextResponse.redirect("https://example.com/review-items");
    const setCookieSpy = vi.spyOn(response.cookies, "set");

    await createSupabaseAuthRouteHandlerClient(response);

    expect(capturedSetAll).toBeTruthy();
    capturedSetAll?.([
      {
        name: "sb-session",
        value: "session-value",
        options: { path: "/", httpOnly: true },
      },
    ]);

    expect(mockCookieSet).toHaveBeenCalledWith("sb-session", "session-value", {
      path: "/",
      httpOnly: true,
    });
    expect(setCookieSpy).toHaveBeenCalledWith("sb-session", "session-value", {
      path: "/",
      httpOnly: true,
    });
  });
});

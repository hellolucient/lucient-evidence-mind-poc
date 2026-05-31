import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeMindDigestCronRequest = vi.fn();
const mockBuildMindDigestCronResponse = vi.fn();

vi.mock("@/lib/mind-digest-cron", () => ({
  authorizeMindDigestCronRequest: (...args: unknown[]) =>
    mockAuthorizeMindDigestCronRequest(...args),
  buildMindDigestCronResponse: (...args: unknown[]) =>
    mockBuildMindDigestCronResponse(...args),
}));

import { GET } from "@/app/api/mind-digests/run-due/route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/mind-digests/run-due", () => {
  beforeEach(() => {
    mockBuildMindDigestCronResponse.mockResolvedValue({
      ok: true,
      phase: "30",
      route: "/api/mind-digests/run-due",
      trigger: "manual_authorized",
      workspace_count: 1,
      generated_count: 1,
      skipped_existing_count: 0,
      error_count: 0,
      digest_ids: ["digest-uuid-001"],
      workspace_results: [],
      started_at: "2026-05-31T12:00:00.000Z",
      finished_at: "2026-05-31T12:00:01.000Z",
      cron_secret_configured: true,
    });
  });

  it("returns 401 when cron auth fails", async () => {
    mockAuthorizeMindDigestCronRequest.mockReturnValueOnce({
      authorized: false,
      body: {
        ok: false,
        error: "unauthorized",
        route: "/api/mind-digests/run-due",
      },
    });

    const request = new Request("https://example.com/api/mind-digests/run-due", {
      method: "GET",
    });

    const response = await GET(request as never);

    expect(response.status).toBe(401);
    expect(mockBuildMindDigestCronResponse).not.toHaveBeenCalled();
  });

  it("returns scheduled digest summary when authorized", async () => {
    mockAuthorizeMindDigestCronRequest.mockReturnValueOnce({
      authorized: true,
      trigger: "manual_authorized",
    });

    const request = new Request("https://example.com/api/mind-digests/run-due", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.generated_count).toBe(1);
    expect(mockBuildMindDigestCronResponse).toHaveBeenCalledWith("manual_authorized");
  });
});

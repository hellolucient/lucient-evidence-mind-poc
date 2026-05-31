import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/watch/evidence-mind-digest-scheduler", () => ({
  runDueEvidenceMindDigests: vi.fn(),
  isPrivacySafeRunDueDigestsResponse: vi.fn(() => true),
}));

import { runDueEvidenceMindDigests } from "@/lib/watch/evidence-mind-digest-scheduler";
import {
  authorizeMindDigestCronRequest,
  buildMindDigestCronResponse,
  isPrivacySafeMindDigestCronResponse,
} from "@/lib/mind-digest-cron";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const mockedRunDueEvidenceMindDigests = vi.mocked(runDueEvidenceMindDigests);

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("mind-digest-cron", () => {
  it("returns unauthorized body for missing auth", () => {
    process.env.CRON_SECRET = "secret";

    const result = authorizeMindDigestCronRequest({
      authorization: null,
      userAgent: "curl/8.0",
    });

    expect(result.authorized).toBe(false);
    if (result.authorized) {
      return;
    }

    expect(result.body).toMatchObject({
      ok: false,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/mind-digests/run-due",
      cron_secret_configured: true,
    });
  });

  it("allows authorized manual bearer when CRON_SECRET is set", () => {
    process.env.CRON_SECRET = "test-secret";

    const result = authorizeMindDigestCronRequest({
      authorization: "Bearer test-secret",
      userAgent: "curl/8.0",
    });

    expect(result).toEqual({ authorized: true, trigger: "manual_authorized" });
  });

  it("builds successful cron response with counts and digest ids", async () => {
    mockedRunDueEvidenceMindDigests.mockResolvedValueOnce({
      workspace_results: [
        {
          workspace_id: "demo-workspace-spa-menu",
          outcome: "generated",
          digest_id: "digest-uuid-001",
        },
      ],
      generated_count: 1,
      skipped_existing_count: 0,
      error_count: 0,
      digest_ids: ["digest-uuid-001"],
    });

    const response = await buildMindDigestCronResponse("manual_authorized");

    expect(response).toMatchObject({
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/mind-digests/run-due",
      workspace_count: 1,
      generated_count: 1,
      skipped_existing_count: 0,
      error_count: 0,
      digest_ids: ["digest-uuid-001"],
    });
    expect(response.started_at).toBeTruthy();
    expect(response.finished_at).toBeTruthy();
    expect(isPrivacySafeMindDigestCronResponse(response as unknown as Record<string, unknown>)).toBe(
      true
    );
  });

  it("reports skipped_existing_count from scheduler", async () => {
    mockedRunDueEvidenceMindDigests.mockResolvedValueOnce({
      workspace_results: [
        {
          workspace_id: "demo-workspace-spa-menu",
          outcome: "skipped_existing",
          digest_id: "digest-uuid-existing",
        },
      ],
      generated_count: 0,
      skipped_existing_count: 1,
      error_count: 0,
      digest_ids: ["digest-uuid-existing"],
    });

    const response = await buildMindDigestCronResponse("vercel_cron");

    expect(response.skipped_existing_count).toBe(1);
    expect(response.generated_count).toBe(0);
  });
});

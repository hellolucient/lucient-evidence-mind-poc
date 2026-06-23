import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimsExtractApiResponse = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-extract-api", () => ({
  buildClaimsExtractApiResponse: (...args: unknown[]) => mockBuildClaimsExtractApiResponse(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/claims/extract/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimsExtractApiResponse.mockResolvedValue({
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/claims/extract",
      candidate_claim_count: 4,
      candidate_claims: [],
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/claims/extract", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      reason: "Unauthorized review queue request.",
      body: {
        ok: false,
        error: "unauthorized",
        phase: CURRENT_WATCH_PHASE,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/claims/extract", {
        method: "POST",
        body: JSON.stringify({ source_text: "supports sleep" }),
      })
    );

    expect(response.status).toBe(401);
    expect(mockBuildClaimsExtractApiResponse).not.toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("delegates to claims extract API when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await POST(
      new NextRequest("http://localhost/api/claims/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: "demo-workspace-spa-menu",
          title: "Magnesium Calm Ritual",
          source_type: "spa_menu",
          source_text:
            "Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance.",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(mockBuildClaimsExtractApiResponse).toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});

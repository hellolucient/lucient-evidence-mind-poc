import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildLoadMindExtractionDemoFixtureResponseApiResponse = vi.fn();
const mockSendMindClaimHelloMindsMessage = vi.fn();
const mockFetchHelloMindsConversationHistory = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/mind-extraction-jobs-api", () => ({
  buildLoadMindExtractionDemoFixtureResponseApiResponse: (...args: unknown[]) =>
    mockBuildLoadMindExtractionDemoFixtureResponseApiResponse(...args),
  mindExtractionJobsApiRoute: (jobId: string) => `/api/mind-extraction-jobs/${jobId}`,
}));

vi.mock("@/lib/watch/mind-claim-hellominds-transport", () => ({
  sendMindClaimHelloMindsMessage: (...args: unknown[]) => mockSendMindClaimHelloMindsMessage(...args),
}));

vi.mock("@/lib/watch/external-mind-hellominds-history", () => ({
  fetchHelloMindsConversationHistory: (...args: unknown[]) =>
    mockFetchHelloMindsConversationHistory(...args),
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/mind-extraction-jobs/[id]/load-demo-fixture-response/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildLoadMindExtractionDemoFixtureResponseApiResponse.mockResolvedValue({
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      job: { extraction_job_id: "job-1", status: "response_fetched" },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/mind-extraction-jobs/[id]/load-demo-fixture-response", () => {
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
      new NextRequest("http://localhost/api/mind-extraction-jobs/job-1/load-demo-fixture-response", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "job-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildLoadMindExtractionDemoFixtureResponseApiResponse).not.toHaveBeenCalled();
    expect(mockSendMindClaimHelloMindsMessage).not.toHaveBeenCalled();
    expect(mockFetchHelloMindsConversationHistory).not.toHaveBeenCalled();
  });

  it("delegates to demo fixture API when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await POST(
      new NextRequest("http://localhost/api/mind-extraction-jobs/job-1/load-demo-fixture-response", {
        method: "POST",
        body: JSON.stringify({ operator_email: "operator@example.com" }),
      }),
      { params: Promise.resolve({ id: "job-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockBuildLoadMindExtractionDemoFixtureResponseApiResponse).toHaveBeenCalledWith(
      "job-1",
      { operator_email: "operator@example.com" },
      breakGlassAccess
    );
    expect(mockSendMindClaimHelloMindsMessage).not.toHaveBeenCalled();
    expect(mockFetchHelloMindsConversationHistory).not.toHaveBeenCalled();
  });
});

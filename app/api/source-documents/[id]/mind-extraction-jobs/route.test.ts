import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockGetLatestJob = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) => mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/watch/mind-claim-extraction-job-store", () => ({
  getLatestMindClaimExtractionJobBySourceDocumentId: (...args: unknown[]) => mockGetLatestJob(...args),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/source-documents/[id]/mind-extraction-jobs/route";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/source-documents/[id]/mind-extraction-jobs", () => {
  it("returns latest job (or null) for a source document", async () => {
    mockGetLatestJob.mockResolvedValue({
      job: { extraction_job_id: "job-1", status: "sent", mind_response_text: null, review_status: "approved" },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/source-documents/doc-1/mind-extraction-jobs", { method: "GET" }),
      { params: Promise.resolve({ id: "doc-1" }) }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; job: unknown };
    expect(body.ok).toBe(true);
    expect(body.job).toMatchObject({ extraction_job_id: "job-1", status: "sent" });
  });
});


import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveReviewQueueAccess = vi.fn();
const mockProcessMindWatchtowerNarrativeSubmission = vi.fn();

vi.mock("@/lib/operator-auth", () => ({
  resolveReviewQueueAccess: (...args: unknown[]) => mockResolveReviewQueueAccess(...args),
  isReviewQueueAccessContext: (value: unknown) =>
    Boolean(value && typeof value === "object" && "authorized" in value && value.authorized),
}));

vi.mock("@/lib/review/mind-digests-page", () => ({
  processMindWatchtowerNarrativeSubmission: (...args: unknown[]) =>
    mockProcessMindWatchtowerNarrativeSubmission(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/mind-digests/generate-narrative/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessMindWatchtowerNarrativeSubmission.mockResolvedValue({
    redirectPath: "/mind-digests?digest_id=digest-uuid-001&narrative_ok=1",
    result: { ok: true, narrative: { id: "narrative-uuid-001" } },
  });
});

describe("POST /mind-digests/generate-narrative", () => {
  it("redirects after successful narrative generation", async () => {
    const request = new Request("https://example.com/mind-digests/generate-narrative", {
      method: "POST",
      body: new URLSearchParams({
        digest_id: "digest-uuid-001",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/mind-digests?digest_id=digest-uuid-001&narrative_ok=1"
    );
  });

  it("redirects to mind-digests when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({ authorized: false });

    const request = new Request("https://example.com/mind-digests/generate-narrative", {
      method: "POST",
      body: new URLSearchParams({
        digest_id: "digest-uuid-001",
      }),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
  });
});

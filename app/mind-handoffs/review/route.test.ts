import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveReviewQueueAccess = vi.fn();
const mockProcessMindHandoffReviewSubmission = vi.fn();
const mockGetSupabaseAuthUser = vi.fn();

vi.mock("@/lib/operator-auth", () => ({
  resolveReviewQueueAccess: (...args: unknown[]) => mockResolveReviewQueueAccess(...args),
  isReviewQueueAccessContext: (value: unknown) =>
    Boolean(value && typeof value === "object" && "authorized" in value && value.authorized),
}));

vi.mock("@/lib/review/mind-digests-page", () => ({
  processMindHandoffReviewSubmission: (...args: unknown[]) =>
    mockProcessMindHandoffReviewSubmission(...args),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  getSupabaseAuthUser: (...args: unknown[]) => mockGetSupabaseAuthUser(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/mind-handoffs/review/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockGetSupabaseAuthUser.mockResolvedValue({ email: "operator@example.com" });
  mockProcessMindHandoffReviewSubmission.mockResolvedValue({
    redirectPath: "/mind-digests?digest_id=digest-uuid-001&review_ok=1&review_action=approve",
    result: { ok: true, action: "approve" },
  });
});

describe("POST /mind-handoffs/review", () => {
  it("redirects after successful approval", async () => {
    const request = new Request("https://example.com/mind-handoffs/review", {
      method: "POST",
      body: new URLSearchParams({
        handoff_id: "handoff-uuid-001",
        digest_id: "digest-uuid-001",
        review_action: "approve",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/mind-digests?digest_id=digest-uuid-001&review_ok=1&review_action=approve"
    );
  });

  it("redirects to mind-digests when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({ authorized: false });

    const request = new Request("https://example.com/mind-handoffs/review", {
      method: "POST",
      body: new URLSearchParams({
        handoff_id: "handoff-uuid-001",
        review_action: "approve",
      }),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
  });
});

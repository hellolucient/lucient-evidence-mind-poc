import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClientClaim = vi.fn();
const mockListClientClaims = vi.fn();

vi.mock("@/lib/watch/client-claims-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/client-claims-store")>();
  return {
    ...actual,
    createClientClaim: (...args: unknown[]) => mockCreateClientClaim(...args),
    listClientClaims: (...args: unknown[]) => mockListClientClaims(...args),
  };
});

import {
  buildClientClaimsCreateRedirectPath,
  clientClaimsErrorMessage,
  processClientClaimCreateSubmission,
} from "@/lib/review/client-claims-page";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListClientClaims.mockResolvedValue({ claims: [] });
  mockCreateClientClaim.mockResolvedValue({
    ok: true,
    claim: {
      workspace_id: "demo-workspace-spa-menu",
      client_claim_id: "new-claim-001",
      claim_text: "Supports healthy sleep.",
      claim_source_type: "spa_menu",
      claim_source_label: null,
      source_url: null,
      claim_family: "sleep_support",
      risk_level: "low",
      status: "active",
      created_at: "2026-05-31T12:00:00.000Z",
      updated_at: "2026-05-31T12:00:00.000Z",
    },
  });
});

describe("client-claims-page submission", () => {
  it("redirects with success when claim is created", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");
    formData.set("client_claim_id", "new-claim-001");
    formData.set("claim_text", "Supports healthy sleep.");
    formData.set("status", "active");

    const submission = await processClientClaimCreateSubmission(formData, operatorAccess);

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("create_ok=1");
    expect(mockCreateClientClaim).toHaveBeenCalled();
  });

  it("maps duplicate claim errors to safe messages", () => {
    expect(clientClaimsErrorMessage("duplicate_client_claim_id")).toContain("already exists");
  });

  it("builds safe redirect path without secrets", () => {
    const path = buildClientClaimsCreateRedirectPath({
      returnQuery: "",
      result: {
        ok: false,
        error: "duplicate_client_claim_id",
        message: "A claim with this client_claim_id already exists in the workspace.",
      },
    });

    expect(path).toContain("create_error=duplicate_client_claim_id");
    expect(path).not.toContain("service_role");
  });
});

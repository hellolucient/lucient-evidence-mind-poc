import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsClaimExtractionPersistenceConfigured = vi.fn();
const mockIsWellnessClaimsPersistenceConfigured = vi.fn();
const mockIsClaimResearchPersistenceConfigured = vi.fn();

vi.mock("@/lib/watch/claim-extraction-store", () => ({
  isClaimExtractionPersistenceConfigured: (...args: unknown[]) =>
    mockIsClaimExtractionPersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/wellness-claims-store", () => ({
  isWellnessClaimsPersistenceConfigured: (...args: unknown[]) =>
    mockIsWellnessClaimsPersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/claim-research-store", () => ({
  isClaimResearchPersistenceConfigured: (...args: unknown[]) =>
    mockIsClaimResearchPersistenceConfigured(...args),
}));

import { buildStatementAssessPageData } from "@/lib/review/statement-assess-page";

const operatorAccess = {
  authorized: true as const,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsClaimExtractionPersistenceConfigured.mockReturnValue(true);
  mockIsWellnessClaimsPersistenceConfigured.mockReturnValue(true);
  mockIsClaimResearchPersistenceConfigured.mockReturnValue(true);
});

describe("statement assess page data", () => {
  it("uses the operator workspace and reports configured when stores are ready", async () => {
    const pageData = await buildStatementAssessPageData({}, operatorAccess);

    expect(pageData.defaultWorkspaceId).toBe("demo-workspace-spa-menu");
    expect(pageData.configured).toBe(true);
    expect(pageData.persistenceErrorMessage).toBeNull();
  });

  it("explains when persistence is not configured", async () => {
    mockIsClaimResearchPersistenceConfigured.mockReturnValue(false);

    const pageData = await buildStatementAssessPageData({}, operatorAccess);

    expect(pageData.configured).toBe(false);
    expect(pageData.persistenceErrorMessage).toContain("not fully configured");
  });
});

import { describe, expect, it } from "vitest";

import {
  applyWorkspaceScopeToListFilters,
  canAccessReviewItemWorkspace,
  type ReviewQueueAccessContext,
} from "@/lib/operator-auth";

const operatorAccess: ReviewQueueAccessContext = {
  authorized: true,
  mode: "operator",
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const breakGlassAccess: ReviewQueueAccessContext = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
};

describe("operator-auth helpers", () => {
  it("canAccessReviewItemWorkspace allows operator workspace matches only", () => {
    expect(
      canAccessReviewItemWorkspace(operatorAccess, "demo-workspace-spa-menu")
    ).toBe(true);
    expect(canAccessReviewItemWorkspace(operatorAccess, "other-workspace")).toBe(false);
    expect(canAccessReviewItemWorkspace(breakGlassAccess, "other-workspace")).toBe(true);
  });

  it("applyWorkspaceScopeToListFilters scopes operator lists to memberships", () => {
    expect(applyWorkspaceScopeToListFilters({ status: "open" }, operatorAccess)).toEqual({
      status: "open",
      workspace_ids: ["demo-workspace-spa-menu"],
    });
  });

  it("applyWorkspaceScopeToListFilters blocks cross-workspace filter requests", () => {
    expect(
      applyWorkspaceScopeToListFilters(
        { status: "open", workspace_id: "other-workspace" },
        operatorAccess
      )
    ).toEqual({
      status: "open",
      workspace_id: "other-workspace",
      workspace_ids: ["__no_workspace_access__"],
    });
  });

  it("applyWorkspaceScopeToListFilters leaves break-glass filters unchanged", () => {
    expect(
      applyWorkspaceScopeToListFilters(
        { status: "open", workspace_id: "demo-workspace-spa-menu" },
        breakGlassAccess
      )
    ).toEqual({
      status: "open",
      workspace_id: "demo-workspace-spa-menu",
    });
  });
});

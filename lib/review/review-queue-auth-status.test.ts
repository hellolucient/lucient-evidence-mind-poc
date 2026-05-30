import { describe, expect, it } from "vitest";

import {
  buildReviewQueueAuthPanelData,
  formatReviewQueueWorkspaceScope,
  reviewQueueAuthPanelSafeFields,
  sanitizeOperatorEmail,
} from "@/lib/review/review-queue-auth-status";

const operatorAccess = {
  authorized: true as const,
  mode: "operator" as const,
  userId: "00000000-0000-4000-8000-000000000001",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const breakGlassAccess = {
  authorized: true as const,
  mode: "break_glass" as const,
  workspaceIds: null,
};

describe("buildReviewQueueAuthPanelData", () => {
  it("shows operator session metadata without exposing user id", () => {
    const panel = buildReviewQueueAuthPanelData(operatorAccess, "operator@example.com");

    expect(reviewQueueAuthPanelSafeFields(panel)).toEqual({
      mode: "operator",
      accessLabel: "Supabase operator session",
      operatorEmail: "operator@example.com",
      workspaceScopeLabel: "demo-workspace-spa-menu",
      showLogout: true,
    });
    expect(JSON.stringify(panel)).not.toContain(operatorAccess.userId);
    expect(JSON.stringify(panel)).not.toContain("token");
  });

  it("shows break-glass mode without operator email or logout", () => {
    const panel = buildReviewQueueAuthPanelData(breakGlassAccess, "operator@example.com");

    expect(reviewQueueAuthPanelSafeFields(panel)).toEqual({
      mode: "break_glass",
      accessLabel: "Break-glass internal access active",
      operatorEmail: null,
      workspaceScopeLabel: "All workspaces (break-glass)",
      showLogout: false,
    });
  });

  it("omits invalid operator email values", () => {
    expect(sanitizeOperatorEmail("not-an-email")).toBeNull();
    expect(
      buildReviewQueueAuthPanelData(operatorAccess, "not-an-email").operatorEmail
    ).toBeNull();
  });
});

describe("formatReviewQueueWorkspaceScope", () => {
  it("joins multiple operator workspace ids", () => {
    expect(
      formatReviewQueueWorkspaceScope({
        ...operatorAccess,
        workspaceIds: ["demo-workspace-spa-menu", "other-workspace"],
      })
    ).toBe("demo-workspace-spa-menu, other-workspace");
  });
});

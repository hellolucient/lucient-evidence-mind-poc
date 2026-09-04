import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { AssessLanding } from "./assess-landing";
import { AssessView } from "./assess-view";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

const authStatus: ReviewQueueAuthPanelData = {
  mode: "operator",
  accessLabel: "Supabase operator session",
  operatorEmail: "operator@example.com",
  workspaceScopeLabel: "demo-workspace-spa-menu",
  showLogout: true,
};

describe("statement assess UI", () => {
  it("renders a simple signed-out landing without operator jargon as the primary path", () => {
    const html = renderToStaticMarkup(createElement(AssessLanding, { showLoginLink: true }));

    expect(html).toContain("Check a wellness statement");
    expect(html).toContain("Sign in to check a statement");
    expect(html).toContain("/review-login");
    expect(html).not.toContain("Workspace ID");
    expect(html).not.toContain("GET /api/health");
  });

  it("renders the signed-in check form without requiring workspace or source-type fields", () => {
    const html = renderToStaticMarkup(
      createElement(AssessView, {
        pageData: {
          configured: true,
          defaultWorkspaceId: "demo-workspace-spa-menu",
          persistenceErrorMessage: null,
        },
        authStatus,
      })
    );

    expect(html).toContain("Check a wellness statement");
    expect(html).toContain("Extract claims and assess");
    expect(html).toContain("Use example");
    expect(html).toContain("Statement or source copy");
    expect(html).not.toContain("Workspace ID");
    expect(html).not.toContain("Source type");
    expect(html).toContain("Operator tools");
  });
});

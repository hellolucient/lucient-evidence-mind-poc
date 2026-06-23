import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ClaimsRegistryPageData } from "@/lib/review/claims-registry-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

import { ClaimsRegistryView } from "./claims-registry-view";

const authStatus: ReviewQueueAuthPanelData = {
  mode: "operator",
  accessLabel: "Supabase operator session",
  operatorEmail: "operator@example.com",
  workspaceScopeLabel: "demo-workspace-spa-menu",
  showLogout: true,
};

const pageData: ClaimsRegistryPageData = {
  configured: true,
  defaultWorkspaceId: "demo-workspace-spa-menu",
  filters: { workspace_id: "demo-workspace-spa-menu", limit: 50 },
  claims: [
    {
      claim_id: "claim-001",
      workspace_id: "demo-workspace-spa-menu",
      source_document_id: "doc-001",
      source_candidate_claim_id: "candidate-001",
      claim_text: "supports deep sleep",
      normalized_claim_text: "supports deep sleep",
      claim_type: "sleep",
      claim_family: "sleep_support",
      subject: "Magnesium Calm Ritual",
      predicate: "supports sleep",
      object: "sleep",
      claim_strength: "moderate",
      evidence_sensitivity: "medium",
      source_excerpt: "support deep sleep",
      source_location: "line 1",
      status: "active",
      review_status: "accepted",
      research_status: "not_started",
      created_at: "2026-06-23T10:05:00.000Z",
      updated_at: "2026-06-23T10:05:00.000Z",
      extraction_run_id: "run-001",
    },
  ],
  listError: null,
  listErrorMessage: null,
  researchStatusOptions: ["not_started", "queued", "completed"],
  evidenceSensitivityOptions: ["low", "medium", "high"],
};

describe("claims registry view", () => {
  it("links claim rows to claim detail page", () => {
    const html = renderToStaticMarkup(
      createElement(ClaimsRegistryView, { pageData, authStatus })
    );

    expect(html).toContain('href="/claims/claim-001"');
    expect(html).toContain("supports deep sleep");
  });
});

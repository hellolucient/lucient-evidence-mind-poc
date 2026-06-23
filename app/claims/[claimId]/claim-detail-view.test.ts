import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ClaimDetailPageData } from "@/lib/review/claims-detail-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

import { ClaimDetailView } from "./claim-detail-view";

const authStatus: ReviewQueueAuthPanelData = {
  mode: "operator",
  accessLabel: "Supabase operator session",
  operatorEmail: "operator@example.com",
  workspaceScopeLabel: "demo-workspace-spa-menu",
  showLogout: true,
};

const pageData: ClaimDetailPageData = {
  configured: true,
  claimId: "claim-001",
  claim: {
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
    research_status: "completed",
    created_at: "2026-06-23T10:05:00.000Z",
    updated_at: "2026-06-23T11:00:00.000Z",
  },
  latestResearchRun: {
    research_run_id: "run-001",
    claim_id: "claim-001",
    workspace_id: "demo-workspace-spa-menu",
    status: "completed",
    research_mode: "mock_evidence_v1",
    query_text: "Magnesium Calm Ritual magnesium sleep quality",
    evidence_posture: "mixed",
    evidence_strength: "low",
    risk_level: "medium",
    risk_score: 55,
    summary:
      "Magnesium may have some evidence related to sleep quality in certain populations, but broad spa-treatment claims should be worded cautiously.",
    safer_wording: "May support relaxation and healthy sleep routines.",
    research_notes: "Controlled demo research mode (mock_evidence_v1). Not live PubMed retrieval.",
    citation_count: 1,
    error_message: null,
    created_at: "2026-06-23T11:00:00.000Z",
    updated_at: "2026-06-23T11:00:00.000Z",
    citations: [
      {
        citation_id: "citation-001",
        title: "Magnesium supplementation and sleep quality: a narrative review (demo placeholder)",
        source: "Demo literature summary",
        url: null,
        publication_year: 2021,
        evidence_type: "review",
        relevance: "medium",
        summary: "Reviews suggest magnesium may support sleep in some adults.",
        created_at: "2026-06-23T11:00:00.000Z",
      },
    ],
  },
  researchRuns: [],
  detailError: null,
  detailErrorMessage: null,
};

describe("claim detail view", () => {
  it("displays latest research result and run button", () => {
    const html = renderToStaticMarkup(
      createElement(ClaimDetailView, { pageData, authStatus })
    );

    expect(html).toContain("Latest research result");
    expect(html).toContain("Controlled demo mode");
    expect(html).toContain("mixed");
    expect(html).toContain("May support relaxation and healthy sleep routines.");
    expect(html).toContain("Run evidence research");
    expect(html).toContain("Magnesium supplementation and sleep quality");
  });

  it("shows PubMed live mode badge for pubmed_live_v1 runs", () => {
    const html = renderToStaticMarkup(
      createElement(ClaimDetailView, {
        pageData: {
          ...pageData,
          latestResearchRun: {
            ...pageData.latestResearchRun,
            research_mode: "pubmed_live_v1",
            research_notes: "PubMed live mode (pubmed_live_v1): demo test.",
          },
        },
        authStatus,
      })
    );

    expect(html).toContain("PubMed live mode");
    expect(html).not.toContain("Controlled demo mode</span>PubMed");
  });
});

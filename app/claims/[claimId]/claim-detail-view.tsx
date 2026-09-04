"use client";

import Link from "next/link";
import { useState } from "react";

import type { ClaimDetailPageData } from "@/lib/review/claims-detail-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { PrivacySafeClaimResearchRun } from "@/lib/watch/claim-research-store";

import { CheckStatementNavPrefix } from "../../check-statement-nav";
import { ReviewQueueAuthPanel } from "../../review-items/review-queue-auth-panel";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "1.5rem",
    maxWidth: "1100px",
    margin: "0 auto",
  } as const,
  header: {
    marginBottom: "1rem",
  } as const,
  nav: {
    marginTop: "0.5rem",
    fontSize: "0.875rem",
  } as const,
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    background: "#fff",
  } as const,
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.75rem",
    fontSize: "0.8125rem",
  } as const,
  metaLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "0.6875rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
    marginBottom: "0.15rem",
  } as const,
  metaValue: {
    color: "#0f172a",
    margin: 0,
  } as const,
  sourceText: {
    fontSize: "0.875rem",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap" as const,
    margin: 0,
    color: "#334155",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "0.75rem",
  } as const,
  button: {
    padding: "0.45rem 0.8rem",
    borderRadius: "4px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  } as const,
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  success: {
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  demoBadge: {
    display: "inline-block",
    fontSize: "0.6875rem",
    fontWeight: 600,
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: "4px",
    padding: "0.15rem 0.4rem",
    marginLeft: "0.5rem",
  } as const,
  liveBadge: {
    display: "inline-block",
    fontSize: "0.6875rem",
    fontWeight: 600,
    color: "#065f46",
    background: "#d1fae5",
    border: "1px solid #6ee7b7",
    borderRadius: "4px",
    padding: "0.15rem 0.4rem",
    marginLeft: "0.5rem",
  } as const,
  citationCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "0.75rem",
    marginBottom: "0.5rem",
    background: "#f8fafc",
    fontSize: "0.8125rem",
  } as const,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8125rem",
  } as const,
  th: {
    textAlign: "left" as const,
    borderBottom: "1px solid #e2e8f0",
    padding: "0.5rem",
    color: "#64748b",
  } as const,
  td: {
    borderBottom: "1px solid #f1f5f9",
    padding: "0.5rem",
    verticalAlign: "top" as const,
  } as const,
};

type ClaimDetailViewProps = {
  pageData: ClaimDetailPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function ResearchResultSection({ run }: { run: PrivacySafeClaimResearchRun }) {
  const isDemoMode = run.research_mode === "mock_evidence_v1";
  const isLiveMode = run.research_mode === "pubmed_live_v1";

  return (
    <section style={styles.section}>
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
        Latest research result
        {isLiveMode ? <span style={styles.liveBadge}>PubMed live mode</span> : null}
        {isDemoMode ? <span style={styles.demoBadge}>Controlled demo mode</span> : null}
      </h2>
      <div style={styles.metaGrid}>
        <div>
          <span style={styles.metaLabel}>Evidence posture</span>
          <p style={styles.metaValue}>{run.evidence_posture ?? "—"}</p>
        </div>
        <div>
          <span style={styles.metaLabel}>Evidence strength</span>
          <p style={styles.metaValue}>{run.evidence_strength ?? "—"}</p>
        </div>
        <div>
          <span style={styles.metaLabel}>Risk level</span>
          <p style={styles.metaValue}>
            {run.risk_level ?? "—"}
            {run.risk_score != null ? ` (${run.risk_score})` : ""}
          </p>
        </div>
        <div>
          <span style={styles.metaLabel}>Research mode</span>
          <p style={styles.metaValue}>{run.research_mode}</p>
        </div>
        <div>
          <span style={styles.metaLabel}>Created</span>
          <p style={styles.metaValue}>{formatTimestamp(run.created_at)}</p>
        </div>
      </div>
      {run.summary ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={styles.metaLabel}>Summary</span>
          <p style={{ ...styles.metaValue, lineHeight: 1.5 }}>{run.summary}</p>
        </div>
      ) : null}
      {run.safer_wording ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={styles.metaLabel}>Safer wording</span>
          <p style={{ ...styles.metaValue, lineHeight: 1.5 }}>{run.safer_wording}</p>
        </div>
      ) : null}
      {run.research_notes ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={styles.metaLabel}>Research notes</span>
          <p style={{ ...styles.metaValue, color: "#64748b", lineHeight: 1.5 }}>{run.research_notes}</p>
        </div>
      ) : null}
      {run.citations && run.citations.length > 0 ? (
        <div style={{ marginTop: "0.85rem" }}>
          <span style={styles.metaLabel}>Citations</span>
          {run.citations.map((citation) => (
            <div key={citation.citation_id} style={styles.citationCard}>
              {citation.url ? (
                <strong>
                  <a href={citation.url} target="_blank" rel="noreferrer">
                    {citation.title}
                  </a>
                </strong>
              ) : (
                <strong>{citation.title}</strong>
              )}
              <div style={{ color: "#64748b", marginTop: "0.25rem" }}>
                {citation.source}
                {citation.publication_year ? ` · ${citation.publication_year}` : ""}
                {citation.evidence_type ? ` · ${citation.evidence_type}` : ""}
                {` · relevance: ${citation.relevance}`}
              </div>
              {citation.summary ? <p style={{ margin: "0.35rem 0 0" }}>{citation.summary}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ClaimDetailView({ pageData, authStatus }: ClaimDetailViewProps) {
  const [latestRun, setLatestRun] = useState(pageData.latestResearchRun);
  const [researchStatus, setResearchStatus] = useState(pageData.claim?.research_status ?? null);
  const [isRunning, setIsRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState(pageData.researchRuns);

  const claim = pageData.claim;
  const canRunResearch =
    pageData.configured &&
    claim?.status === "active" &&
    claim?.review_status === "accepted";

  async function handleRunResearch() {
    if (!claim || isRunning) {
      return;
    }

    setIsRunning(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(claim.claim_id)}/research`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        setActionError(body.message ?? body.error ?? "Research run failed.");
        return;
      }

      const run = body.research_run as PrivacySafeClaimResearchRun;
      setLatestRun(run);
      setResearchStatus(body.claim?.research_status ?? "completed");
      setHistory((prev) => [run, ...prev.filter((item) => item.research_run_id !== run.research_run_id)]);
      setActionSuccess("Evidence research completed.");
    } catch {
      setActionError("Unable to run evidence research.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Claim detail</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Registered wellness claim with controlled evidence research.
        </p>
        <nav style={styles.nav}>
          <CheckStatementNavPrefix />
          <Link href="/claims">Claim registry</Link>
          {" · "}
          <Link href="/claims/extract">Claim extraction</Link>
          {" · "}
          <a href="/review-items">Review queue</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {pageData.detailErrorMessage ? <div style={styles.error}>{pageData.detailErrorMessage}</div> : null}
      {actionError ? <div style={styles.error}>{actionError}</div> : null}
      {actionSuccess ? <div style={styles.success}>{actionSuccess}</div> : null}

      {claim ? (
        <>
          <section style={styles.section}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>{claim.claim_text}</h2>
            <div style={styles.metaGrid}>
              <div>
                <span style={styles.metaLabel}>Workspace</span>
                <p style={styles.metaValue}>{claim.workspace_id}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Claim family</span>
                <p style={styles.metaValue}>{claim.claim_family ?? "—"}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Subject</span>
                <p style={styles.metaValue}>{claim.subject ?? "—"}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Predicate</span>
                <p style={styles.metaValue}>{claim.predicate ?? "—"}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Object</span>
                <p style={styles.metaValue}>{claim.object ?? "—"}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Claim strength</span>
                <p style={styles.metaValue}>{claim.claim_strength}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Evidence sensitivity</span>
                <p style={styles.metaValue}>{claim.evidence_sensitivity}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Review status</span>
                <p style={styles.metaValue}>{claim.review_status}</p>
              </div>
              <div>
                <span style={styles.metaLabel}>Research status</span>
                <p style={styles.metaValue}>{researchStatus ?? claim.research_status}</p>
              </div>
            </div>
            {claim.source_excerpt ? (
              <div style={{ marginTop: "0.85rem" }}>
                <span style={styles.metaLabel}>Source excerpt</span>
                <p style={styles.sourceText}>{claim.source_excerpt}</p>
              </div>
            ) : null}
            <div style={{ marginTop: "0.85rem" }}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...(isRunning || !canRunResearch ? styles.buttonDisabled : {}),
                }}
                disabled={isRunning || !canRunResearch}
                onClick={handleRunResearch}
              >
                {isRunning ? "Running research…" : "Run evidence research"}
              </button>
              {!canRunResearch ? (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  Only active, accepted claims can be researched.
                </p>
              ) : null}
            </div>
          </section>

          {latestRun ? <ResearchResultSection run={latestRun} /> : null}

          <section style={styles.section}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Research run history ({history.length})</h2>
            {history.length === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                No research runs yet.
              </p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Mode</th>
                    <th style={styles.th}>Posture</th>
                    <th style={styles.th}>Strength</th>
                    <th style={styles.th}>Risk</th>
                    <th style={styles.th}>Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.research_run_id}>
                      <td style={styles.td}>{formatTimestamp(run.created_at)}</td>
                      <td style={styles.td}>{run.status}</td>
                      <td style={styles.td}>{run.research_mode}</td>
                      <td style={styles.td}>{run.evidence_posture ?? "—"}</td>
                      <td style={styles.td}>{run.evidence_strength ?? "—"}</td>
                      <td style={styles.td}>{run.risk_level ?? "—"}</td>
                      <td style={styles.td}>{run.citation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

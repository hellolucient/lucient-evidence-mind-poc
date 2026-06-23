"use client";

import type { ClaimsRegistryPageData } from "@/lib/review/claims-registry-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

import { ReviewQueueAuthPanel } from "../review-items/review-queue-auth-panel";

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
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  empty: {
    margin: 0,
    color: "#64748b",
    fontSize: "0.875rem",
  } as const,
};

type ClaimsRegistryViewProps = {
  pageData: ClaimsRegistryPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function ClaimsRegistryView({ pageData, authStatus }: ClaimsRegistryViewProps) {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Claim registry</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Registered wellness claims promoted from reviewed extraction candidates.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/client-claims">Client claims</a>
          {" · "}
          <a href="/claims">Claim registry</a>
          {" · "}
          <a href="/claims/extract">Claim extraction</a>
          {" · "}
          <a href="/evidence-briefs">Evidence briefs</a>
          {" · "}
          <a href="/mind-digests">Mind digests</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {pageData.listErrorMessage ? <div style={styles.error}>{pageData.listErrorMessage}</div> : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
          Registered claims ({pageData.claims.length})
        </h2>
        {pageData.claims.length === 0 ? (
          <p style={styles.empty}>
            No registered claims yet. Extract claims from source material first.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Claim text</th>
                <th style={styles.th}>Workspace</th>
                <th style={styles.th}>Family</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Predicate</th>
                <th style={styles.th}>Evidence sensitivity</th>
                <th style={styles.th}>Research status</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {pageData.claims.map((claim) => (
                <tr key={claim.claim_id}>
                  <td style={styles.td}>{claim.claim_text}</td>
                  <td style={styles.td}>{claim.workspace_id}</td>
                  <td style={styles.td}>{claim.claim_family ?? "—"}</td>
                  <td style={styles.td}>{claim.subject ?? "—"}</td>
                  <td style={styles.td}>{claim.predicate ?? "—"}</td>
                  <td style={styles.td}>{claim.evidence_sensitivity}</td>
                  <td style={styles.td}>{claim.research_status}</td>
                  <td style={styles.td}>
                    {claim.extraction_run_id ? (
                      <a
                        href={`/claims/extractions/${encodeURIComponent(claim.extraction_run_id)}`}
                      >
                        Extraction
                      </a>
                    ) : claim.source_document_id ? (
                      "Source doc"
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={styles.td}>{formatTimestamp(claim.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

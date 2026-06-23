"use client";

import { useState } from "react";

import type { ClaimsExtractPageData } from "@/lib/review/claims-extract-page";
import type { PrivacySafeCandidateWellnessClaim } from "@/lib/watch/claim-extraction-store";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

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
  input: {
    width: "100%",
    padding: "0.45rem 0.55rem",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    fontSize: "0.8125rem",
    marginTop: "0.25rem",
  } as const,
  textarea: {
    width: "100%",
    minHeight: "180px",
    padding: "0.55rem 0.65rem",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    fontSize: "0.8125rem",
    marginTop: "0.25rem",
    fontFamily: "inherit",
    lineHeight: 1.5,
  } as const,
  label: {
    display: "block",
    fontSize: "0.75rem",
    color: "#475569",
    marginBottom: "0.65rem",
  } as const,
  button: {
    padding: "0.45rem 0.75rem",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem",
  } as const,
  claimCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.85rem",
    marginBottom: "0.75rem",
    background: "#f8fafc",
  } as const,
  meta: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: "0.35rem",
  } as const,
};

type ClaimsExtractViewProps = {
  pageData: ClaimsExtractPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDirectClaim(value: boolean): string {
  return value ? "Direct" : "Implied";
}

export function ClaimsExtractView({ pageData, authStatus }: ClaimsExtractViewProps) {
  const [workspaceId, setWorkspaceId] = useState(pageData.defaultWorkspaceId);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("spa_menu");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [candidateClaims, setCandidateClaims] = useState<PrivacySafeCandidateWellnessClaim[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setExtractionId(null);
    setCandidateClaims([]);

    try {
      const response = await fetch("/api/claims/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          title,
          source_type: sourceType,
          source_text: sourceText,
          source_url: sourceUrl || null,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        extraction?: { extraction_id: string };
        candidate_claims?: PrivacySafeCandidateWellnessClaim[];
      };

      if (!response.ok || !body.ok) {
        setErrorMessage(body.message ?? body.error ?? "Claim extraction failed.");
        return;
      }

      setExtractionId(body.extraction?.extraction_id ?? null);
      setCandidateClaims(body.candidate_claims ?? []);
    } catch {
      setErrorMessage("Claim extraction request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Claim extraction</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Paste wellness source copy to identify candidate claims from spa menus, product
          descriptions, website copy, and similar material.
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

      {!pageData.configured && pageData.listErrorMessage ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}

      {extractionId ? (
        <div style={styles.success}>
          Extraction complete. Run ID: <code>{extractionId}</code> ·{" "}
          {candidateClaims.length} candidate claim{candidateClaims.length === 1 ? "" : "s"} found.{" "}
          <a href={`/claims/extractions/${encodeURIComponent(extractionId)}`}>
            Review candidates
          </a>
        </div>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Extract claims from source text</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <label style={styles.label}>
              Workspace ID
              <input
                type="text"
                name="workspace_id"
                required
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Source title
              <input
                type="text"
                name="title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Source type
              <select
                name="source_type"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
                style={styles.input}
              >
                {pageData.sourceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Source URL (optional)
              <input
                type="url"
                name="source_url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                style={styles.input}
              />
            </label>
          </div>
          <label style={{ ...styles.label, marginTop: "0.75rem" }}>
            Source text
            <textarea
              name="source_text"
              required
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              style={styles.textarea}
              placeholder="Paste spa menu copy, product description, or website wellness claims here."
            />
          </label>
          <button
            type="submit"
            style={{
              ...styles.button,
              ...(submitting ? styles.buttonDisabled : {}),
            }}
            disabled={submitting}
          >
            {submitting ? "Extracting…" : "Extract claims"}
          </button>
        </form>
      </section>

      {candidateClaims.length > 0 ? (
        <section style={styles.section}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
            Candidate claims ({candidateClaims.length})
          </h2>
          {candidateClaims.map((claim) => (
            <article key={claim.candidate_claim_id} style={styles.claimCard}>
              <strong>{claim.claim_text}</strong>
              <p style={{ margin: "0.35rem 0", fontSize: "0.875rem" }}>
                {claim.source_excerpt}
              </p>
              <div style={styles.meta}>
                Family/type: {claim.claim_family ?? "—"} / {claim.claim_type ?? "—"} · Strength:{" "}
                {claim.claim_strength} · Evidence sensitivity: {claim.evidence_sensitivity} ·{" "}
                {formatDirectClaim(claim.is_direct_claim)} · Needs research:{" "}
                {claim.needs_research ? "yes" : "no"} · Status: {claim.status}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Recent extractions</h2>
        {pageData.recentExtractions.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            No extraction runs yet for this workspace.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Source title</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Candidates</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {pageData.recentExtractions.map((entry) => (
                <tr key={entry.extraction_id}>
                  <td style={styles.td}>
                    <a
                      href={`/claims/extractions/${encodeURIComponent(entry.extraction_id)}`}
                    >
                      {entry.source_title}
                    </a>
                  </td>
                  <td style={styles.td}>{entry.source_type}</td>
                  <td style={styles.td}>{entry.candidate_claim_count}</td>
                  <td style={styles.td}>{entry.status}</td>
                  <td style={styles.td}>{formatTimestamp(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

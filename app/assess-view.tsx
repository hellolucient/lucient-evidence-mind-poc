"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  STATEMENT_ASSESS_EXAMPLE_TEXT,
  STATEMENT_ASSESS_SOURCE_TYPE,
  buildStatementTitle,
} from "@/lib/review/statement-assess";
import type { StatementAssessPageData } from "@/lib/review/statement-assess-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { PrivacySafeCandidateWellnessClaim } from "@/lib/watch/claim-extraction-store";
import type { PrivacySafeClaimResearchRun } from "@/lib/watch/claim-research-store";

import { OperatorToolsFooter } from "./check-statement-nav";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
    color: "#0f172a",
  } as const,
  inner: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "1.5rem 1.25rem 3rem",
  } as const,
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.75rem",
  } as const,
  brand: {
    fontSize: "0.8125rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "#1d4ed8",
    textDecoration: "none",
  } as const,
  signedIn: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.8125rem",
    color: "#475569",
  } as const,
  logoutButton: {
    padding: "0.35rem 0.7rem",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  hero: {
    marginBottom: "1.25rem",
  } as const,
  textarea: {
    width: "100%",
    minHeight: "180px",
    padding: "0.9rem 1rem",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "1rem",
    lineHeight: 1.55,
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  } as const,
  actions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.65rem",
    marginTop: "0.85rem",
    alignItems: "center",
  } as const,
  button: {
    padding: "0.7rem 1.1rem",
    borderRadius: "8px",
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.9375rem",
    fontWeight: 600,
  } as const,
  buttonSecondary: {
    padding: "0.7rem 1.1rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.875rem",
  } as const,
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  } as const,
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  info: {
    color: "#1e40af",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  } as const,
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "1rem 1.1rem",
    marginBottom: "0.85rem",
    background: "#fff",
  } as const,
  meta: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: "0.35rem",
  } as const,
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "0.75rem",
    marginTop: "0.85rem",
  } as const,
  metaLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "0.6875rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
    marginBottom: "0.15rem",
  } as const,
  citation: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.7rem 0.8rem",
    marginTop: "0.5rem",
    background: "#f8fafc",
    fontSize: "0.8125rem",
  } as const,
};

type AssessViewProps = {
  pageData: StatementAssessPageData;
  authStatus: ReviewQueueAuthPanelData;
};

type AssessedClaim = {
  candidate: PrivacySafeCandidateWellnessClaim;
  claimId: string | null;
  status: "pending" | "running" | "done" | "error";
  errorMessage: string | null;
  researchRun: PrivacySafeClaimResearchRun | null;
};

function formatClaimMeta(claim: PrivacySafeCandidateWellnessClaim): string {
  const family = claim.claim_family ?? "unclassified";
  const strength = claim.claim_strength;
  const direct = claim.is_direct_claim ? "direct" : "implied";
  return `${family.replace(/_/g, " ")} · ${strength} · ${direct}`;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AssessView({ pageData, authStatus }: AssessViewProps) {
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assessedClaims, setAssessedClaims] = useState<AssessedClaim[]>([]);

  const canSubmit = pageData.configured && statement.trim().length > 0 && !busy;

  async function assessOne(
    candidate: PrivacySafeCandidateWellnessClaim
  ): Promise<AssessedClaim> {
    const acceptResponse = await fetch(
      `/api/claims/candidates/${encodeURIComponent(candidate.candidate_claim_id)}/accept`,
      { method: "POST", credentials: "include" }
    );
    const acceptBody = await readJson(acceptResponse);
    const claim = acceptBody.claim as { claim_id?: string } | undefined;

    if (!acceptResponse.ok || acceptBody.ok !== true || !claim?.claim_id) {
      return {
        candidate,
        claimId: null,
        status: "error",
        errorMessage:
          (typeof acceptBody.message === "string" && acceptBody.message) ||
          (typeof acceptBody.error === "string" && acceptBody.error) ||
          "Could not register this claim.",
        researchRun: null,
      };
    }

    const researchResponse = await fetch(
      `/api/claims/${encodeURIComponent(claim.claim_id)}/research`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    );
    const researchBody = await readJson(researchResponse);
    const researchRun = researchBody.research_run as PrivacySafeClaimResearchRun | undefined;

    if (!researchResponse.ok || researchBody.ok !== true || !researchRun) {
      return {
        candidate,
        claimId: claim.claim_id,
        status: "error",
        errorMessage:
          (typeof researchBody.message === "string" && researchBody.message) ||
          (typeof researchBody.error === "string" && researchBody.error) ||
          "Claim registered, but assessment failed.",
        researchRun: null,
      };
    }

    return {
      candidate,
      claimId: claim.claim_id,
      status: "done",
      errorMessage: null,
      researchRun,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setAssessedClaims([]);
    setProgress("Extracting claims…");

    try {
      const response = await fetch("/api/claims/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: pageData.defaultWorkspaceId,
          title: buildStatementTitle(statement),
          source_type: STATEMENT_ASSESS_SOURCE_TYPE,
          source_text: statement,
          fallback_to_statement: true,
        }),
      });
      const body = await readJson(response);
      const candidates = Array.isArray(body.candidate_claims)
        ? (body.candidate_claims as PrivacySafeCandidateWellnessClaim[])
        : [];

      if (!response.ok || body.ok !== true) {
        setErrorMessage(
          (typeof body.message === "string" && body.message) ||
            (typeof body.error === "string" && body.error) ||
            "Could not extract claims from that statement."
        );
        return;
      }

      if (candidates.length === 0) {
        setErrorMessage("No claims were found in that statement.");
        return;
      }

      const placeholders: AssessedClaim[] = candidates.map((candidate) => ({
        candidate,
        claimId: null,
        status: "pending",
        errorMessage: null,
        researchRun: null,
      }));
      setAssessedClaims(placeholders);

      const completed: AssessedClaim[] = [];
      for (const [index, candidate] of candidates.entries()) {
        setProgress(`Assessing claim ${index + 1} of ${candidates.length}…`);
        setAssessedClaims((current) =>
          current.map((entry) =>
            entry.candidate.candidate_claim_id === candidate.candidate_claim_id
              ? { ...entry, status: "running" }
              : entry
          )
        );
        const result = await assessOne(candidate);
        completed.push(result);
        setAssessedClaims([...completed, ...placeholders.slice(completed.length)]);
      }
    } catch {
      setErrorMessage("Claim check failed. Try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.inner}>
        <div style={styles.topBar}>
          <Link href="/" style={styles.brand}>
            Lucient Evidence Mind
          </Link>
          <div style={styles.signedIn}>
            {authStatus.operatorEmail ? <span>{authStatus.operatorEmail}</span> : null}
            {authStatus.showLogout ? (
              <form action="/review-items/logout" method="POST">
                <button type="submit" style={styles.logoutButton}>
                  Log out
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <header style={styles.hero}>
          <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.85rem", lineHeight: 1.2 }}>
            Check a wellness statement
          </h1>
          <p style={{ margin: 0, color: "#475569", fontSize: "1.05rem", lineHeight: 1.5 }}>
            Paste a claim, spa menu, or product copy. We extract the claims and run an evidence
            assessment.
          </p>
        </header>

        {pageData.persistenceErrorMessage ? (
          <div style={styles.error}>{pageData.persistenceErrorMessage}</div>
        ) : null}
        {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}
        {progress ? <div style={styles.info}>{progress}</div> : null}

        <form onSubmit={handleSubmit} style={styles.card}>
          <label htmlFor="statement" style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
            Statement or source copy
          </label>
          <textarea
            id="statement"
            name="statement"
            required
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            style={styles.textarea}
            placeholder="Example: Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system and support deep sleep."
          />
          <div style={styles.actions}>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(canSubmit ? {} : styles.buttonDisabled),
              }}
              disabled={!canSubmit}
            >
              {busy ? "Checking…" : "Extract claims and assess"}
            </button>
            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={() => setStatement(STATEMENT_ASSESS_EXAMPLE_TEXT)}
              disabled={busy}
            >
              Use example
            </button>
          </div>
        </form>

        {assessedClaims.length > 0 ? (
          <section aria-live="polite">
            <h2 style={{ fontSize: "1.05rem", margin: "1.4rem 0 0.75rem" }}>
              Results ({assessedClaims.length})
            </h2>
            {assessedClaims.map((entry) => (
              <article key={entry.candidate.candidate_claim_id} style={styles.card}>
                <strong style={{ fontSize: "1rem" }}>{entry.candidate.claim_text}</strong>
                <div style={styles.meta}>{formatClaimMeta(entry.candidate)}</div>
                {entry.status === "running" || entry.status === "pending" ? (
                  <p style={{ ...styles.meta, marginTop: "0.7rem" }}>
                    {entry.status === "running" ? "Assessing…" : "Waiting to assess…"}
                  </p>
                ) : null}
                {entry.errorMessage ? (
                  <p style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: 0 }}>
                    {entry.errorMessage}
                  </p>
                ) : null}
                {entry.researchRun ? (
                  <>
                    <div style={styles.resultGrid}>
                      <div>
                        <span style={styles.metaLabel}>Evidence posture</span>
                        {entry.researchRun.evidence_posture ?? "—"}
                      </div>
                      <div>
                        <span style={styles.metaLabel}>Strength</span>
                        {entry.researchRun.evidence_strength ?? "—"}
                      </div>
                      <div>
                        <span style={styles.metaLabel}>Risk</span>
                        {entry.researchRun.risk_level ?? "—"}
                        {entry.researchRun.risk_score != null
                          ? ` (${entry.researchRun.risk_score})`
                          : ""}
                      </div>
                    </div>
                    {entry.researchRun.summary ? (
                      <p style={{ margin: "0.85rem 0 0", lineHeight: 1.55 }}>
                        {entry.researchRun.summary}
                      </p>
                    ) : null}
                    {entry.researchRun.safer_wording ? (
                      <p style={{ margin: "0.7rem 0 0", lineHeight: 1.55 }}>
                        <span style={styles.metaLabel}>Safer wording</span>
                        {entry.researchRun.safer_wording}
                      </p>
                    ) : null}
                    {entry.researchRun.citations && entry.researchRun.citations.length > 0 ? (
                      <div style={{ marginTop: "0.85rem" }}>
                        <span style={styles.metaLabel}>Citations</span>
                        {entry.researchRun.citations.map((citation) => (
                          <div key={citation.citation_id} style={styles.citation}>
                            {citation.url ? (
                              <a href={citation.url} target="_blank" rel="noreferrer">
                                {citation.title}
                              </a>
                            ) : (
                              <strong>{citation.title}</strong>
                            )}
                            <div style={{ color: "#64748b", marginTop: "0.2rem" }}>
                              {citation.source}
                              {citation.publication_year ? ` · ${citation.publication_year}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {entry.claimId ? (
                      <p style={{ ...styles.meta, marginTop: "0.85rem" }}>
                        <Link href={`/claims/${encodeURIComponent(entry.claimId)}`}>
                          Open full claim record
                        </Link>
                      </p>
                    ) : null}
                  </>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        <p style={{ color: "#64748b", fontSize: "0.8125rem", lineHeight: 1.5, marginTop: "1.25rem" }}>
          Automated assessment is a conservative operator aid. It is not medical advice and does not
          prove that a claim is substantiated.
        </p>

        <OperatorToolsFooter />
      </div>
    </main>
  );
}

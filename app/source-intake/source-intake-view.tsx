"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import type { SourceIntakePageData } from "@/lib/review/source-intake-page";
import { renderSafeMindTextBlock } from "@/lib/review/safe-mind-text";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

import { ReviewQueueAuthPanel } from "../review-items/review-queue-auth-panel";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "1.5rem",
    maxWidth: "1200px",
    margin: "0 auto",
  } as const,
  header: { marginBottom: "1rem" } as const,
  nav: { marginTop: "0.5rem", fontSize: "0.875rem" } as const,
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
    minHeight: "160px",
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
    padding: "0.4rem 0.7rem",
    borderRadius: "4px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.75rem",
    marginRight: "0.35rem",
    marginTop: "0.35rem",
  } as const,
  buttonSecondary: {
    padding: "0.4rem 0.7rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.75rem",
    marginRight: "0.35rem",
    marginTop: "0.35rem",
  } as const,
  buttonDisabled: { opacity: 0.6, cursor: "not-allowed" } as const,
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
  info: {
    color: "#1e40af",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  } as const,
  pre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontSize: "0.8125rem",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "0.75rem",
    marginTop: "0.5rem",
  } as const,
};

type CandidateClaim = {
  candidate_claim_id: string;
  extraction_job_id: string | null;
  claim_text: string;
  exact_source_phrase: string | null;
  claim_family: string | null;
  claim_type: string | null;
  evidence_sensitivity: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  confidence: number | null;
  reason_for_extraction: string | null;
  suggested_review_status: string | null;
  review_status: string;
};

type ExtractionJob = {
  extraction_job_id: string;
  status: string;
  review_status: string;
  mind_response_text: string | null;
  parse_error: string | null;
};

type SourceIntakeViewProps = {
  pageData: SourceIntakePageData;
  authStatus: ReviewQueueAuthPanelData;
  operatorEmail: string | null | undefined;
};

function candidateReviewStatusLabel(reviewStatus: string): string {
  if (reviewStatus === "accepted") {
    return "Accepted into Claim Registry";
  }
  if (reviewStatus === "rejected") {
    return "Rejected";
  }
  return reviewStatus;
}

function isPendingCandidateReview(reviewStatus: string): boolean {
  return reviewStatus === "pending" || reviewStatus === "edited";
}

async function postJson(url: string, body: Record<string, unknown> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return { response, data: (await response.json()) as Record<string, unknown> };
}

export function SourceIntakeView({ pageData, authStatus, operatorEmail }: SourceIntakeViewProps) {
  const [workspaceId, setWorkspaceId] = useState(pageData.defaultWorkspaceId);
  const [title, setTitle] = useState("Magnesium Calm Ritual");
  const [sourceText, setSourceText] = useState(
    "Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance."
  );
  const [sourceDocumentId, setSourceDocumentId] = useState<string | null>(null);
  const [extractionJob, setExtractionJob] = useState<ExtractionJob | null>(null);
  const [candidateClaims, setCandidateClaims] = useState<CandidateClaim[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [lastFetchNoReply, setLastFetchNoReply] = useState(false);

  const isPending = useCallback((key: string) => pending[key] === true, [pending]);
  const runPending = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      if (pending[key]) {
        return;
      }
      setPending((prev) => ({ ...prev, [key]: true }));
      try {
        await fn();
      } finally {
        setPending((prev) => ({ ...prev, [key]: false }));
      }
    },
    [pending]
  );

  function humanJobStatus(status: string | null | undefined): string {
    switch (status) {
      case "pending_approval":
        return "Pending approval";
      case "approved":
        return "Approved";
      case "sent":
        return "Sent — waiting for Mind reply";
      case "waiting_for_reply":
        return "Waiting for Mind reply";
      case "response_fetched":
        return "Response fetched — ready to parse";
      case "parse_failed":
        return "Parse failed";
      case "parsed":
        return "Parsed";
      default:
        return status ?? "—";
    }
  }

  const loadCandidateClaims = useCallback(async (documentId: string, extractionJobId?: string | null) => {
    const response = await fetch(`/api/source-documents/${encodeURIComponent(documentId)}/candidate-claims`, {
      credentials: "include",
    });
    const data = (await response.json()) as {
      ok?: boolean;
      candidate_claims?: CandidateClaim[];
    };
    if (data.ok && data.candidate_claims) {
      const claims = extractionJobId
        ? data.candidate_claims.filter((claim) => claim.extraction_job_id === extractionJobId)
        : data.candidate_claims;
      setCandidateClaims(claims);
    }
  }, []);

  async function handleSaveDocument(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    await runPending("save_document", async () => {
      try {
        const response = await fetch("/api/source-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            workspace_id: workspaceId,
            title,
            source_text: sourceText,
            source_type: "spa_wellness_copy",
            created_by: operatorEmail ?? undefined,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          document?: { source_document_id: string };
        };

        if (!response.ok || !data.ok || !data.document) {
          setErrorMessage(String(data.error ?? "Failed to save source document."));
          return;
        }

        setSourceDocumentId(data.document.source_document_id);
        setExtractionJob(null);
        setCandidateClaims([]);
        setLastFetchNoReply(false);
        setStatusMessage(`Source document saved (${data.document.source_document_id}).`);
      } catch {
        setErrorMessage("Save source document request failed.");
      }
    });
  }

  async function runJobAction(
    action: "create" | "approve" | "send" | "fetch" | "load-demo-fixture" | "parse",
    jobId?: string
  ) {
    setErrorMessage(null);
    setStatusMessage(null);
    setLastFetchNoReply(false);

    const pendingKey = `job_${action}`;
    await runPending(pendingKey, async () => {
      try {
        if (action === "create") {
          if (!sourceDocumentId) {
            setErrorMessage("Save a source document first.");
            return;
          }
          const { response, data } = await postJson(
            `/api/source-documents/${encodeURIComponent(sourceDocumentId)}/mind-extraction-jobs`,
            { created_by: operatorEmail ?? undefined }
          );
          if (!response.ok || !data.ok) {
            setErrorMessage(String(data.error ?? "Failed to create extraction job."));
            return;
          }
          setExtractionJob(data.job as ExtractionJob);
          setCandidateClaims([]);
          setStatusMessage("Mind extraction job created (pending approval).");
          return;
        }

        const id = jobId ?? extractionJob?.extraction_job_id;
        if (!id) {
          setErrorMessage("No extraction job available.");
          return;
        }

        const routes: Record<string, string> = {
          approve: `/api/mind-extraction-jobs/${id}/approve`,
          send: `/api/mind-extraction-jobs/${id}/send`,
          fetch: `/api/mind-extraction-jobs/${id}/fetch-response`,
          "load-demo-fixture": `/api/mind-extraction-jobs/${id}/load-demo-fixture-response`,
          parse: `/api/mind-extraction-jobs/${id}/parse`,
        };

        const { response, data } = await postJson(routes[action], {
          operator_email: operatorEmail ?? undefined,
        });

        if (!response.ok || !data.ok) {
          setErrorMessage(String(data.message ?? data.error ?? `Action ${action} failed.`));
          return;
        }

        const job = (data.job as ExtractionJob | undefined) ?? null;
        if (job) {
          setExtractionJob(job);
        }

        if (action === "fetch") {
          const noReply =
            job?.status === "waiting_for_reply" && !job.mind_response_text?.trim();
          setLastFetchNoReply(noReply);
          setStatusMessage(
            noReply
              ? "No Mind reply yet. Try fetching again shortly."
              : "Fetch completed."
          );
          return;
        }

        if (action === "parse" && sourceDocumentId) {
          await loadCandidateClaims(sourceDocumentId, job?.extraction_job_id ?? extractionJob?.extraction_job_id ?? null);
        }

        setStatusMessage(
          action === "send"
            ? "Send completed (dry-run when EXTERNAL_MIND_LIVE_SEND=false)."
            : action === "load-demo-fixture"
              ? "Non-live fixture response loaded. This is not a live Mind response."
              : `Extraction job ${action} completed.`
        );
      } catch {
        setErrorMessage("Mind extraction workflow request failed.");
      }
    });
  }

  async function handleCandidateAction(
    candidateClaimId: string,
    action: "accept" | "reject" | "undo" | "edit",
    editedText?: string
  ) {
    setErrorMessage(null);

    const pendingKey = `candidate_${action}_${candidateClaimId}`;
    await runPending(pendingKey, async () => {
      try {
        if (action === "edit" && editedText !== undefined) {
          const response = await fetch(`/api/candidate-claims/${encodeURIComponent(candidateClaimId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              operator_edited_claim_text: editedText,
              review_status: "edited",
            }),
          });
          const data = (await response.json()) as { ok?: boolean; error?: string };
          if (!response.ok || !data.ok) {
            setErrorMessage(String(data.error ?? "Edit failed."));
            return;
          }
        } else {
          const { response, data } = await postJson(
            `/api/candidate-claims/${encodeURIComponent(candidateClaimId)}/${action}`,
            { operator_email: operatorEmail ?? undefined }
          );
          if (!response.ok || !data.ok) {
            setErrorMessage(String(data.message ?? data.error ?? `${action} failed.`));
            return;
          }
        }

        if (sourceDocumentId) {
          await loadCandidateClaims(sourceDocumentId, extractionJob?.extraction_job_id ?? null);
        }
        setStatusMessage(`Candidate claim ${action} completed.`);
      } catch {
        setErrorMessage("Candidate claim action failed.");
      }
    });
  }

  async function handleOpenDocument(documentId: string) {
    setErrorMessage(null);
    setStatusMessage(null);
    setLastFetchNoReply(false);

    await runPending(`open_${documentId}`, async () => {
      try {
        const docResponse = await fetch(`/api/source-documents/${encodeURIComponent(documentId)}`, {
          credentials: "include",
        });
        const docData = (await docResponse.json()) as {
          ok?: boolean;
          document?: { source_document_id: string; workspace_id: string; title: string | null; source_text: string; source_type: string };
          error?: string;
        };

        if (!docResponse.ok || !docData.ok || !docData.document) {
          setErrorMessage(String(docData.error ?? "Unable to open source document."));
          return;
        }

        setWorkspaceId(docData.document.workspace_id);
        setTitle(docData.document.title ?? "");
        setSourceText(docData.document.source_text);
        setSourceDocumentId(docData.document.source_document_id);

        const jobResponse = await fetch(
          `/api/source-documents/${encodeURIComponent(documentId)}/mind-extraction-jobs`,
          { credentials: "include" }
        );
        const jobData = (await jobResponse.json()) as { ok?: boolean; job?: ExtractionJob | null };
        const latestJob = jobData.ok ? (jobData.job ?? null) : null;
        setExtractionJob(latestJob);

        await loadCandidateClaims(documentId, latestJob?.extraction_job_id ?? null);
        setStatusMessage("Source document opened.");
      } catch {
        setErrorMessage("Open source document request failed.");
      }
    });
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Source intake — Mind claim extraction</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Phase 45 Mind-centered claim intelligence. Operator approval required before external Mind send.
          Live send remains gated by EXTERNAL_MIND_LIVE_SEND=false (dry-run default).
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/source-intake">Source intake</a>
          {" · "}
          <Link href="/claims/extract">Rule-based extraction (44A)</Link>
          {" · "}
          <a href="/client-claims">Client claims</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      <div style={styles.info}>
        No auto-send, retry, batch send, or scheduled polling. Each Mind step is explicit operator action.
      </div>

      {!pageData.configured && pageData.listErrorMessage ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}
      {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>1. Paste and save source copy</h2>
        <form onSubmit={handleSaveDocument}>
          <label style={styles.label}>
            Workspace ID
            <input
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              style={styles.input}
              required
            />
          </label>
          <label style={styles.label}>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            Source text
            <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} style={styles.textarea} required />
          </label>
          <button
            type="submit"
            style={{ ...styles.button, ...(isPending("save_document") ? styles.buttonDisabled : {}) }}
            disabled={isPending("save_document")}
          >
            {isPending("save_document") ? "Saving…" : "Save source document"}
          </button>
        </form>
        {sourceDocumentId ? (
          <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.75rem" }}>
            Document ID: <code>{sourceDocumentId}</code>
          </p>
        ) : null}
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>2. Mind extraction job workflow</h2>
        <button
          type="button"
          style={{ ...styles.button, ...(isPending("job_create") ? styles.buttonDisabled : {}) }}
          disabled={isPending("job_create") || !sourceDocumentId}
          onClick={() => runJobAction("create")}
        >
          {isPending("job_create") ? "Creating…" : "Create Mind extraction job"}
        </button>
        <button
          type="button"
          style={{ ...styles.buttonSecondary, ...(isPending("job_approve") ? styles.buttonDisabled : {}) }}
          disabled={isPending("job_approve") || !extractionJob}
          onClick={() => runJobAction("approve")}
        >
          {isPending("job_approve") ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          style={{ ...styles.buttonSecondary, ...(isPending("job_send") ? styles.buttonDisabled : {}) }}
          disabled={isPending("job_send") || !extractionJob}
          onClick={() => runJobAction("send")}
        >
          {isPending("job_send") ? "Sending…" : "Send (dry-run safe)"}
        </button>
        <button
          type="button"
          style={{ ...styles.buttonSecondary, ...(isPending("job_fetch") ? styles.buttonDisabled : {}) }}
          disabled={isPending("job_fetch") || !extractionJob}
          onClick={() => runJobAction("fetch")}
        >
          {isPending("job_fetch") ? "Fetching…" : "Fetch Mind response"}
        </button>
        <button
          type="button"
          style={{ ...styles.buttonSecondary, ...(isPending("job_load-demo-fixture") ? styles.buttonDisabled : {}) }}
          disabled={
            isPending("job_load-demo-fixture") ||
            !extractionJob ||
            !["sent", "waiting_for_reply", "response_fetched"].includes(extractionJob.status)
          }
          onClick={() => runJobAction("load-demo-fixture")}
        >
          {isPending("job_load-demo-fixture") ? "Loading…" : "Load non-live extraction fixture"}
        </button>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
          This loads a non-live fixture response for operator validation. It is not a live Mind response.
        </p>
        <button
          type="button"
          style={{ ...styles.buttonSecondary, ...(isPending("job_parse") ? styles.buttonDisabled : {}) }}
          disabled={isPending("job_parse") || !extractionJob || !extractionJob.mind_response_text?.trim()}
          onClick={() => runJobAction("parse")}
        >
          {isPending("job_parse") ? "Parsing…" : "Parse response"}
        </button>
        {!extractionJob?.mind_response_text?.trim() ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
            {lastFetchNoReply
              ? "No Mind reply yet. Try fetching again shortly."
              : "Fetch a Mind response before parsing."}
          </p>
        ) : null}

        {extractionJob ? (
          <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "#475569" }}>
            <div>
              <strong>{humanJobStatus(extractionJob.status)}</strong>
            </div>
            <div>
              Job: <code>{extractionJob.extraction_job_id}</code> · status: {extractionJob.status} · review:{" "}
              {extractionJob.review_status}
            </div>
            {extractionJob.parse_error ? (
              <div style={styles.error}>Parse error: {renderSafeMindTextBlock(extractionJob.parse_error)}</div>
            ) : null}
            {extractionJob.mind_response_text ? (
              <pre style={styles.pre}>{renderSafeMindTextBlock(extractionJob.mind_response_text)}</pre>
            ) : null}
          </div>
        ) : null}
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
          3. Candidate claims ({candidateClaims.length})
        </h2>
        {candidateClaims.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            Parse a Mind extraction response to populate candidate claims.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Claim</th>
                <th style={styles.th}>Source phrase</th>
                <th style={styles.th}>Family / type</th>
                <th style={styles.th}>Risk / sensitivity</th>
                <th style={styles.th}>Confidence</th>
                <th style={styles.th}>Suggested</th>
                <th style={styles.th}>Review</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidateClaims.map((claim) => (
                <tr key={claim.candidate_claim_id}>
                  <td style={styles.td}>{claim.claim_text}</td>
                  <td style={styles.td}>{claim.exact_source_phrase ?? "—"}</td>
                  <td style={styles.td}>
                    {claim.claim_family ?? "—"} / {claim.claim_type ?? "—"}
                  </td>
                  <td style={styles.td}>
                    E:{claim.evidence_sensitivity ?? "—"} R:{claim.risk_level ?? "—"} Reg:
                    {claim.regulatory_sensitivity ?? "—"}
                  </td>
                  <td style={styles.td}>{claim.confidence ?? "—"}</td>
                  <td style={styles.td}>{claim.suggested_review_status ?? "—"}</td>
                  <td style={styles.td}>{candidateReviewStatusLabel(claim.review_status)}</td>
                  <td style={styles.td}>
                    {isPendingCandidateReview(claim.review_status) ? (
                      <>
                        <button
                          type="button"
                          style={styles.buttonSecondary}
                          disabled={isPending(`candidate_accept_${claim.candidate_claim_id}`)}
                          onClick={() => handleCandidateAction(claim.candidate_claim_id, "accept")}
                        >
                          {isPending(`candidate_accept_${claim.candidate_claim_id}`) ? "Accepting…" : "Accept"}
                        </button>
                        <button
                          type="button"
                          style={styles.buttonSecondary}
                          disabled={isPending(`candidate_reject_${claim.candidate_claim_id}`)}
                          onClick={() => handleCandidateAction(claim.candidate_claim_id, "reject")}
                        >
                          {isPending(`candidate_reject_${claim.candidate_claim_id}`) ? "Rejecting…" : "Reject"}
                        </button>
                      </>
                    ) : claim.review_status === "accepted" || claim.review_status === "rejected" ? (
                      <button
                        type="button"
                        style={styles.buttonSecondary}
                        disabled={isPending(`candidate_undo_${claim.candidate_claim_id}`)}
                        onClick={() => handleCandidateAction(claim.candidate_claim_id, "undo")}
                      >
                        {isPending(`candidate_undo_${claim.candidate_claim_id}`) ? "Undoing…" : "Undo"}
                      </button>
                    ) : (
                      <span style={{ color: "#64748b" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Recent source documents</h2>
        {pageData.recentDocuments.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>No documents yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.recentDocuments.map((doc) => (
                <tr key={doc.source_document_id}>
                  <td style={styles.td}>{doc.title ?? "(untitled)"}</td>
                  <td style={styles.td}>{doc.source_type}</td>
                  <td style={styles.td}>{new Date(doc.created_at).toLocaleString()}</td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={{ ...styles.buttonSecondary, ...(isPending(`open_${doc.source_document_id}`) ? styles.buttonDisabled : {}) }}
                      disabled={isPending(`open_${doc.source_document_id}`)}
                      onClick={() => handleOpenDocument(doc.source_document_id)}
                    >
                      {isPending(`open_${doc.source_document_id}`) ? "Opening…" : "Open"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

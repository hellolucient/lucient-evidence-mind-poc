"use client";

import { useState } from "react";

import type { ClaimsExtractionReviewPageData } from "@/lib/review/claims-extraction-review-page";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { PrivacySafeCandidateWellnessClaim } from "@/lib/watch/claim-extraction-store";

import { ReviewQueueAuthPanel } from "../../../review-items/review-queue-auth-panel";

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
  claimCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.85rem",
    marginBottom: "0.75rem",
    background: "#f8fafc",
  } as const,
  claimCardAccepted: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
  } as const,
  claimCardRejected: {
    background: "#fef2f2",
    borderColor: "#fecaca",
  } as const,
  meta: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: "0.35rem",
  } as const,
  sourceText: {
    fontSize: "0.875rem",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap" as const,
    margin: 0,
    color: "#334155",
  } as const,
  buttonRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.65rem",
    flexWrap: "wrap" as const,
  } as const,
  button: {
    padding: "0.4rem 0.7rem",
    borderRadius: "4px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  buttonSecondary: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
  } as const,
  buttonDanger: {
    border: "1px solid #dc2626",
    background: "#dc2626",
    color: "#fff",
  } as const,
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  } as const,
  input: {
    width: "100%",
    padding: "0.4rem 0.55rem",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    fontSize: "0.8125rem",
    marginTop: "0.25rem",
  } as const,
  label: {
    display: "block",
    fontSize: "0.75rem",
    color: "#475569",
    marginBottom: "0.5rem",
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
  statusBadge: {
    display: "inline-block",
    fontSize: "0.6875rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
    padding: "0.15rem 0.45rem",
    borderRadius: "4px",
    marginLeft: "0.35rem",
  } as const,
};

type ClaimsExtractionReviewViewProps = {
  pageData: ClaimsExtractionReviewPageData;
  authStatus: ReviewQueueAuthPanelData;
};

type EditDraft = {
  claim_text: string;
  claim_type: string;
  claim_family: string;
  subject: string;
  predicate: string;
  object: string;
  claim_strength: string;
  evidence_sensitivity: string;
  is_direct_claim: boolean;
  needs_research: boolean;
};

function formatDirectClaim(value: boolean): string {
  return value ? "Direct" : "Implied";
}

function statusBadgeStyle(status: string): React.CSSProperties {
  if (status === "accepted") {
    return { ...styles.statusBadge, background: "#dcfce7", color: "#166534" };
  }

  if (status === "rejected") {
    return { ...styles.statusBadge, background: "#fee2e2", color: "#b91c1c" };
  }

  return { ...styles.statusBadge, background: "#e2e8f0", color: "#475569" };
}

function claimCardStyle(status: string): React.CSSProperties {
  if (status === "accepted") {
    return { ...styles.claimCard, ...styles.claimCardAccepted };
  }

  if (status === "rejected") {
    return { ...styles.claimCard, ...styles.claimCardRejected };
  }

  return styles.claimCard;
}

function toEditDraft(claim: PrivacySafeCandidateWellnessClaim): EditDraft {
  return {
    claim_text: claim.claim_text,
    claim_type: claim.claim_type ?? "",
    claim_family: claim.claim_family ?? "",
    subject: claim.subject ?? "",
    predicate: claim.predicate ?? "",
    object: claim.object ?? "",
    claim_strength: claim.claim_strength,
    evidence_sensitivity: claim.evidence_sensitivity,
    is_direct_claim: claim.is_direct_claim,
    needs_research: claim.needs_research,
  };
}

export function ClaimsExtractionReviewView({
  pageData,
  authStatus,
}: ClaimsExtractionReviewViewProps) {
  const [candidates, setCandidates] = useState(pageData.candidateClaims);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function updateCandidate(updated: PrivacySafeCandidateWellnessClaim) {
    setCandidates((current) =>
      current.map((claim) =>
        claim.candidate_claim_id === updated.candidate_claim_id ? updated : claim
      )
    );
  }

  async function handleAccept(candidateClaimId: string) {
    setBusyId(candidateClaimId);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(
        `/api/claims/candidates/${encodeURIComponent(candidateClaimId)}/accept`,
        { method: "POST", credentials: "include" }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        candidate?: PrivacySafeCandidateWellnessClaim;
        claim?: { claim_id: string; claim_text: string };
        already_accepted?: boolean;
      };

      if (!response.ok || !body.ok || !body.candidate) {
        setActionError(body.message ?? body.error ?? "Accept failed.");
        return;
      }

      updateCandidate(body.candidate);
      setActionMessage(
        body.already_accepted
          ? `Claim already registered: "${body.claim?.claim_text ?? body.candidate.claim_text}".`
          : `Registered claim: "${body.claim?.claim_text ?? body.candidate.claim_text}".`
      );
    } catch {
      setActionError("Accept request failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(candidateClaimId: string) {
    setBusyId(candidateClaimId);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(
        `/api/claims/candidates/${encodeURIComponent(candidateClaimId)}/reject`,
        { method: "POST", credentials: "include" }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        candidate?: PrivacySafeCandidateWellnessClaim;
      };

      if (!response.ok || !body.ok || !body.candidate) {
        setActionError(body.message ?? body.error ?? "Reject failed.");
        return;
      }

      updateCandidate(body.candidate);
      setActionMessage(`Rejected candidate: "${body.candidate.claim_text}".`);
    } catch {
      setActionError("Reject request failed.");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(claim: PrivacySafeCandidateWellnessClaim) {
    setEditingId(claim.candidate_claim_id);
    setEditDraft(toEditDraft(claim));
    setActionError(null);
    setActionMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(candidateClaimId: string) {
    if (!editDraft) {
      return;
    }

    setBusyId(candidateClaimId);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(
        `/api/claims/candidates/${encodeURIComponent(candidateClaimId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            claim_text: editDraft.claim_text,
            claim_type: editDraft.claim_type || null,
            claim_family: editDraft.claim_family || null,
            subject: editDraft.subject || null,
            predicate: editDraft.predicate || null,
            object: editDraft.object || null,
            claim_strength: editDraft.claim_strength,
            evidence_sensitivity: editDraft.evidence_sensitivity,
            is_direct_claim: editDraft.is_direct_claim,
            needs_research: editDraft.needs_research,
          }),
        }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        candidate?: PrivacySafeCandidateWellnessClaim;
      };

      if (!response.ok || !body.ok || !body.candidate) {
        setActionError(body.message ?? body.error ?? "Edit failed.");
        return;
      }

      updateCandidate(body.candidate);
      setEditingId(null);
      setEditDraft(null);
      setActionMessage(`Updated candidate: "${body.candidate.claim_text}".`);
    } catch {
      setActionError("Edit request failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Extraction review</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Review candidate claims from extraction run{" "}
          <code>{pageData.extractionId}</code>.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/claims">Claim registry</a>
          {" · "}
          <a href="/claims/extract">Claim extraction</a>
          {" · "}
          <a href="/evidence-briefs">Evidence briefs</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {pageData.detailErrorMessage ? (
        <div style={styles.error}>{pageData.detailErrorMessage}</div>
      ) : null}
      {actionError ? <div style={styles.error}>{actionError}</div> : null}
      {actionMessage ? <div style={styles.success}>{actionMessage}</div> : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Extraction summary</h2>
        <div style={styles.meta}>
          Source title: {pageData.sourceTitle ?? "—"} · Source type:{" "}
          {pageData.sourceType ?? "—"} · Status: {pageData.extractionStatus ?? "—"} ·
          Candidates: {pageData.candidateCount}
        </div>
      </section>

      {pageData.sourceText ? (
        <section style={styles.section}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Source text</h2>
          <p style={styles.sourceText}>{pageData.sourceText}</p>
        </section>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>
          Candidate claims ({candidates.length})
        </h2>
        {candidates.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            No candidate claims in this extraction run.
          </p>
        ) : (
          candidates.map((claim) => {
            const isEditing = editingId === claim.candidate_claim_id;
            const isBusy = busyId === claim.candidate_claim_id;
            const isReviewable = claim.status === "candidate";

            return (
              <article
                key={claim.candidate_claim_id}
                style={claimCardStyle(claim.status)}
              >
                {isEditing && editDraft ? (
                  <>
                    <label style={styles.label}>
                      Claim text
                      <input
                        type="text"
                        value={editDraft.claim_text}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, claim_text: event.target.value })
                        }
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.label}>
                      Claim family
                      <input
                        type="text"
                        value={editDraft.claim_family}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, claim_family: event.target.value })
                        }
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.label}>
                      Claim type
                      <input
                        type="text"
                        value={editDraft.claim_type}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, claim_type: event.target.value })
                        }
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.label}>
                      Subject
                      <input
                        type="text"
                        value={editDraft.subject}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, subject: event.target.value })
                        }
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.label}>
                      Predicate
                      <input
                        type="text"
                        value={editDraft.predicate}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, predicate: event.target.value })
                        }
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.label}>
                      Object
                      <input
                        type="text"
                        value={editDraft.object}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, object: event.target.value })
                        }
                        style={styles.input}
                      />
                    </label>
                    <div style={styles.buttonRow}>
                      <button
                        type="button"
                        style={{
                          ...styles.button,
                          ...(isBusy ? styles.buttonDisabled : {}),
                        }}
                        disabled={isBusy}
                        onClick={() => saveEdit(claim.candidate_claim_id)}
                      >
                        Save edits
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.button, ...styles.buttonSecondary }}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>
                      {claim.claim_text}
                      <span style={statusBadgeStyle(claim.status)}>{claim.status}</span>
                    </strong>
                    <p style={{ margin: "0.35rem 0", fontSize: "0.875rem" }}>
                      {claim.source_excerpt}
                    </p>
                    <div style={styles.meta}>
                      Family/type: {claim.claim_family ?? "—"} / {claim.claim_type ?? "—"} ·
                      Subject: {claim.subject ?? "—"} · Predicate: {claim.predicate ?? "—"} ·
                      Object: {claim.object ?? "—"} · Strength: {claim.claim_strength} ·
                      Evidence sensitivity: {claim.evidence_sensitivity} ·{" "}
                      {formatDirectClaim(claim.is_direct_claim)} · Needs research:{" "}
                      {claim.needs_research ? "yes" : "no"}
                    </div>
                    {isReviewable ? (
                      <div style={styles.buttonRow}>
                        <button
                          type="button"
                          style={{
                            ...styles.button,
                            ...(isBusy ? styles.buttonDisabled : {}),
                          }}
                          disabled={isBusy}
                          onClick={() => handleAccept(claim.candidate_claim_id)}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.button,
                            ...styles.buttonDanger,
                            ...(isBusy ? styles.buttonDisabled : {}),
                          }}
                          disabled={isBusy}
                          onClick={() => handleReject(claim.candidate_claim_id)}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.button,
                            ...styles.buttonSecondary,
                            ...(isBusy ? styles.buttonDisabled : {}),
                          }}
                          disabled={isBusy}
                          onClick={() => startEdit(claim)}
                        >
                          Edit candidate
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { renderSafeMindTextBlock, toMindDisplayPlainText } from "@/lib/review/safe-mind-text";
import { mindJobControlsState } from "@/lib/review/mind-job-controls";

const styles = {
  panel: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.85rem",
    marginTop: "0.75rem",
    background: "#f8fafc",
  } as const,
  button: {
    padding: "0.35rem 0.6rem",
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
    padding: "0.35rem 0.6rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.75rem",
    marginRight: "0.35rem",
    marginTop: "0.35rem",
  } as const,
  buttonDisabled: { opacity: 0.6, cursor: "not-allowed" } as const,
  statusPill: {
    display: "inline-block",
    padding: "0.35rem 0.6rem",
    borderRadius: "999px",
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    fontSize: "0.75rem",
    marginRight: "0.35rem",
    marginTop: "0.35rem",
  } as const,
  meta: { fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" } as const,
  pre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontSize: "0.8125rem",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "0.65rem",
    marginTop: "0.5rem",
  } as const,
  evidenceList: {
    margin: "0.5rem 0 0",
    paddingLeft: "1.1rem",
    color: "#334155",
    fontSize: "0.8125rem",
  } as const,
  evidenceItem: {
    marginBottom: "0.5rem",
  } as const,
  error: { color: "#b91c1c", fontSize: "0.8125rem", marginTop: "0.35rem" } as const,
};

function withDisabledButtonStyle(
  base: (typeof styles)["button"] | (typeof styles)["buttonSecondary"],
  disabled: boolean
) {
  return disabled ? { ...base, ...styles.buttonDisabled } : base;
}

type RiskBrief = {
  risk_brief_id: string;
  search_capability_statement: string | null;
  searches_performed: unknown[];
  evidence_found: unknown[];
  evidence_not_found: unknown[];
  urls?: unknown;
  pmids?: unknown;
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  safer_wording: string | null;
  operator_recommendation: string | null;
  key_evidence_risk_insight: string | null;
  limitations: string | null;
  cost_report: Record<string, unknown> | null;
  created_at: string;
};

type MindRiskBriefPanelProps = {
  claimUuid: string;
  claimText: string;
  operatorEmail?: string | null;
};

async function postJson(url: string, body: Record<string, unknown> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return { response, data: (await response.json()) as Record<string, unknown> };
}

type EvidenceFoundEntry = {
  title?: unknown;
  url?: unknown;
  pmid?: unknown;
  doi?: unknown;
  journal?: unknown;
  year?: unknown;
  authors?: unknown;
  evidence_category?: unknown;
  relevance_to_claim?: unknown;
  summary?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") {
    return null;
  }
  return trimmed;
}

function looksLikeUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function MindRiskBriefPanel({ claimUuid, claimText, operatorEmail }: MindRiskBriefPanelProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobParsedAt, setJobParsedAt] = useState<string | null>(null);
  const [mindResponseText, setMindResponseText] = useState<string | null>(null);
  const [externalThreadId, setExternalThreadId] = useState<string | null>(null);
  const [externalMessageId, setExternalMessageId] = useState<string | null>(null);
  const [lastFetchNoReply, setLastFetchNoReply] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<RiskBrief[]>([]);
  const [auditEvents, setAuditEvents] = useState<Array<{ event_type: string; event_summary: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const latestBrief = briefs[0] ?? null;

  const evidenceFound = useMemo(() => {
    if (!latestBrief) {
      return [];
    }
    const raw = Array.isArray(latestBrief.evidence_found) ? latestBrief.evidence_found : [];
    return raw
      .filter((item): item is EvidenceFoundEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
      .map((item) => {
        const title = asNonEmptyString(item.title);
        const url = asNonEmptyString(item.url);
        const pmid = asNonEmptyString(item.pmid);
        const doi = asNonEmptyString(item.doi);
        const journal = asNonEmptyString(item.journal);
        const year = asNonEmptyString(item.year);
        const authors = asNonEmptyString(item.authors);
        const evidenceCategory = asNonEmptyString(item.evidence_category);
        const relevance = asNonEmptyString(item.relevance_to_claim);
        const summary = asNonEmptyString(item.summary);

        const resolvedUrl =
          url && looksLikeUrl(url) ? url : pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null;

        return {
          title: title ?? "Untitled study",
          url: resolvedUrl,
          pmid,
          doi,
          journal,
          year,
          authors,
          evidenceCategory,
          relevance,
          summary,
        };
      })
      .filter((item) => item.title || item.url || item.pmid || item.summary);
  }, [latestBrief]);

  const fallbackUrls = useMemo(() => {
    if (!latestBrief) {
      return [];
    }
    const rawUrls = Array.isArray(latestBrief.urls) ? (latestBrief.urls as unknown[]) : [];
    const cleaned = rawUrls
      .map((value) => asNonEmptyString(value))
      .filter((value): value is string => Boolean(value))
      .filter((value) => looksLikeUrl(value));

    const alreadyShown = new Set(evidenceFound.map((item) => item.url).filter(Boolean) as string[]);
    return cleaned.filter((url) => !alreadyShown.has(url));
  }, [evidenceFound, latestBrief]);

  function isPending(key: string) {
    return pending[key] === true;
  }

  async function runPending(key: string, fn: () => Promise<void>) {
    if (pending[key]) {
      return;
    }
    setPending((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setPending((prev) => ({ ...prev, [key]: false }));
    }
  }

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

  async function refreshBriefs() {
    const response = await fetch(`/api/client-claims/${encodeURIComponent(claimUuid)}/mind-risk-briefs`, {
      credentials: "include",
    });
    const data = (await response.json()) as {
      ok?: boolean;
      risk_briefs?: RiskBrief[];
      audit_events?: Array<{ event_type: string; event_summary: string; created_at: string }>;
    };
    if (data.ok) {
      setBriefs(data.risk_briefs ?? []);
      setAuditEvents(data.audit_events ?? []);
    }
  }

  useEffect(() => {
    void refreshBriefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimUuid]);

  async function runAction(
    action: "create" | "approve" | "send" | "fetch" | "load-demo-fixture" | "parse"
  ) {
    setError(null);
    setStatusMessage(null);
    setLastFetchNoReply(false);

    await runPending(`job_${action}`, async () => {
      try {
        if (action === "create") {
          const { response, data } = await postJson(
            `/api/client-claims/${encodeURIComponent(claimUuid)}/mind-risk-brief-jobs`,
            { created_by: operatorEmail ?? undefined }
          );
          if (!response.ok || !data.ok) {
            setError(String(data.error ?? "Failed to create risk brief job."));
            return;
          }
          const job = data.job as {
            risk_brief_job_id: string;
            status: string;
            mind_response_text?: string | null;
            external_thread_id?: string | null;
            external_message_id?: string | null;
            parsed_at?: string | null;
          };
          setJobId(job.risk_brief_job_id);
          setJobStatus(job.status);
          setExternalThreadId(job.external_thread_id ?? null);
          setExternalMessageId(job.external_message_id ?? null);
          setJobParsedAt(typeof job.parsed_at === "string" ? job.parsed_at : null);
          setMindResponseText(job.mind_response_text ?? null);
          return;
        }

        if (!jobId) {
          setError("Create a risk brief job first.");
          return;
        }

        const actionRoutes: Record<typeof action, string> = {
          approve: "approve",
          send: "send",
          fetch: "fetch-response",
          "load-demo-fixture": "load-demo-fixture-response",
          parse: "parse",
        };
        const route = `/api/mind-risk-brief-jobs/${encodeURIComponent(jobId)}/${actionRoutes[action]}`;
        const { response, data } = await postJson(route, { operator_email: operatorEmail ?? undefined });
        if (!response.ok || !data.ok) {
          setError(String(data.message ?? data.error ?? `${action} failed.`));
          return;
        }

        if (data.job) {
          const job = data.job as {
            status: string;
            mind_response_text?: string | null;
            external_thread_id?: string | null;
            external_message_id?: string | null;
            parsed_at?: string | null;
          };
          setJobStatus(job.status);
          setExternalThreadId(job.external_thread_id ?? null);
          setExternalMessageId(job.external_message_id ?? null);
          setJobParsedAt(typeof job.parsed_at === "string" ? job.parsed_at : null);
          setMindResponseText(job.mind_response_text ?? null);
          if (action === "fetch") {
            const noReply = job.status === "waiting_for_reply" && !job.mind_response_text?.trim();
            setLastFetchNoReply(noReply);
            setStatusMessage(
              noReply ? "No Mind reply yet. Try fetching again shortly." : "Fetch completed."
            );
          }
        }

        if (action === "parse") {
          await refreshBriefs();
          const idempotent = data.idempotent === true;
          setStatusMessage(
            typeof data.message === "string"
              ? data.message
              : idempotent
                ? "This risk brief job has already been parsed."
                : "Parse completed."
          );
          return;
        }

        if (action === "load-demo-fixture") {
          setStatusMessage("Non-live fixture response loaded. This is not a live Mind response.");
          return;
        }
      } catch {
        setError("Risk brief workflow request failed.");
      }
    });
  }

  const controls = mindJobControlsState(
    jobId
      ? {
          status: jobStatus ?? "",
          mind_response_text: mindResponseText,
          parsed_at: jobParsedAt,
          external_thread_id: externalThreadId,
          external_message_id: externalMessageId,
        }
      : null
  );
  const createJobDisabled = isPending("job_create");
  const approveJobDisabled = isPending("job_approve") || !jobId;
  const sendJobDisabled = isPending("job_send") || !jobId;
  const fetchJobDisabled = isPending("job_fetch") || !controls.can_fetch;
  const loadFixtureDisabled = isPending("job_load-demo-fixture") || !controls.can_load_fixture;
  const parseJobDisabled = isPending("job_parse") || !controls.can_parse;
  const refreshBriefsDisabled = isPending("refresh_briefs");
  const showParseStatusPill = !controls.can_parse && controls.parse_label === "Already parsed";

  return (
    <div style={styles.panel}>
      <strong>Mind Claim Risk Brief</strong>
      <div style={styles.meta}>Claim: {claimText}</div>
      <div style={styles.meta}>
        Operator-gated HelloMinds workflow. EXTERNAL_MIND_LIVE_SEND=false remains dry-run default.
      </div>

      <button
        type="button"
        style={withDisabledButtonStyle(styles.button, createJobDisabled)}
        disabled={createJobDisabled}
        onClick={() => runAction("create")}
      >
        {isPending("job_create") ? "Creating…" : "Create risk brief job"}
      </button>
      <button
        type="button"
        style={withDisabledButtonStyle(styles.buttonSecondary, approveJobDisabled)}
        disabled={approveJobDisabled}
        onClick={() => runAction("approve")}
      >
        {isPending("job_approve") ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        style={withDisabledButtonStyle(styles.buttonSecondary, sendJobDisabled)}
        disabled={sendJobDisabled}
        onClick={() => runAction("send")}
      >
        {isPending("job_send") ? "Sending…" : "Send (dry-run safe)"}
      </button>
      <button
        type="button"
        style={withDisabledButtonStyle(styles.buttonSecondary, fetchJobDisabled)}
        disabled={fetchJobDisabled}
        onClick={() => runAction("fetch")}
      >
        {isPending("job_fetch") ? "Fetching…" : "Fetch response"}
      </button>
      {!controls.can_fetch && controls.fetch_helper ? (
        <div style={styles.meta}>{controls.fetch_helper}</div>
      ) : null}
      <button
        type="button"
        style={withDisabledButtonStyle(styles.buttonSecondary, loadFixtureDisabled)}
        disabled={loadFixtureDisabled}
        onClick={() => runAction("load-demo-fixture")}
      >
        {isPending("job_load-demo-fixture") ? "Loading…" : "Load non-live risk brief fixture"}
      </button>
      {!controls.can_load_fixture && controls.fixture_helper ? (
        <div style={styles.meta}>{controls.fixture_helper}</div>
      ) : null}
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
        This loads a non-live fixture response for operator validation. It is not a live Mind response.
      </p>
      {showParseStatusPill ? (
        <span style={styles.statusPill} aria-label="Parse status">
          {controls.parse_label}
        </span>
      ) : (
        <button
          type="button"
          style={withDisabledButtonStyle(styles.buttonSecondary, parseJobDisabled)}
          disabled={parseJobDisabled}
          onClick={() => runAction("parse")}
        >
          {isPending("job_parse") ? "Parsing…" : controls.parse_label}
        </button>
      )}
      {controls.parse_helper ? (
        <div style={styles.meta}>
          {lastFetchNoReply ? "No Mind reply yet. Try fetching again shortly." : controls.parse_helper}
        </div>
      ) : null}
      <button
        type="button"
        style={withDisabledButtonStyle(styles.buttonSecondary, refreshBriefsDisabled)}
        disabled={refreshBriefsDisabled}
        onClick={() => runPending("refresh_briefs", refreshBriefs)}
      >
        {isPending("refresh_briefs") ? "Refreshing…" : "Refresh briefs"}
      </button>

      {jobId ? (
        <div style={styles.meta}>
          <div>
            <strong>{humanJobStatus(jobStatus)}</strong>
          </div>
          <div>
            Job: <code>{jobId}</code> · status: {jobStatus ?? "—"}
          </div>
          {jobStatus === "parsed" ? (
            <div style={{ marginTop: "0.35rem" }}>This response has already been parsed.</div>
          ) : null}
        </div>
      ) : null}

      {statusMessage ? <div style={{ ...styles.meta, color: "#334155" }}>{statusMessage}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {latestBrief ? (
        <div style={{ marginTop: "0.75rem" }}>
          <div style={styles.meta}>
            Latest brief · posture: {latestBrief.evidence_posture ?? "—"} · risk:{" "}
            {latestBrief.risk_level ?? "—"} · recommendation:{" "}
            {latestBrief.operator_recommendation ?? "—"}
          </div>
          <div style={styles.meta}>
            Refresh briefs reloads stored results. It does not trigger a new Mind search.
          </div>
          {latestBrief.search_capability_statement ? (
            <p style={{ fontSize: "0.8125rem", margin: "0.5rem 0 0" }}>
              {renderSafeMindTextBlock(latestBrief.search_capability_statement)}
            </p>
          ) : null}
          {evidenceFound.length > 0 ? (
            <div style={{ marginTop: "0.65rem" }}>
              <div style={{ ...styles.meta, color: "#334155" }}>
                <strong>Evidence found</strong> ({evidenceFound.length})
              </div>
              <ul style={styles.evidenceList}>
                {evidenceFound.map((entry, index) => (
                  <li key={`${entry.pmid ?? entry.url ?? entry.title}-${index}`} style={styles.evidenceItem}>
                    <div>
                      {entry.url ? (
                        <a href={entry.url} target="_blank" rel="noreferrer">
                          {entry.title}
                        </a>
                      ) : (
                        <span>{entry.title}</span>
                      )}
                    </div>
                    <div style={{ color: "#64748b", marginTop: "0.15rem" }}>
                      {[entry.authors, entry.journal, entry.year]
                        .filter(Boolean)
                        .join(" · ")}
                      {entry.pmid ? ` · PMID: ${entry.pmid}` : ""}
                      {entry.doi ? ` · DOI: ${entry.doi}` : ""}
                      {entry.evidenceCategory ? ` · ${entry.evidenceCategory}` : ""}
                      {entry.relevance ? ` · relevance: ${entry.relevance}` : ""}
                    </div>
                    {entry.summary ? (
                      <div style={{ marginTop: "0.25rem" }}>{renderSafeMindTextBlock(entry.summary)}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {fallbackUrls.length > 0 ? (
            <div style={{ marginTop: "0.65rem" }}>
              <div style={{ ...styles.meta, color: "#334155" }}>
                <strong>Source links</strong> ({fallbackUrls.length})
              </div>
              <ul style={styles.evidenceList}>
                {fallbackUrls.map((url) => (
                  <li key={url} style={styles.evidenceItem}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {latestBrief.key_evidence_risk_insight ? (
            <pre style={styles.pre}>
              {renderSafeMindTextBlock(latestBrief.key_evidence_risk_insight)}
            </pre>
          ) : null}
          {latestBrief.safer_wording ? (
            <p style={{ fontSize: "0.8125rem" }}>
              Safer wording: {renderSafeMindTextBlock(latestBrief.safer_wording)}
            </p>
          ) : null}
          {latestBrief.limitations ? (
            <p style={{ fontSize: "0.8125rem" }}>
              Limitations: {renderSafeMindTextBlock(latestBrief.limitations)}
            </p>
          ) : null}
        </div>
      ) : null}

      {mindResponseText ? (
        <details
          style={{ marginTop: "0.75rem" }}
          {...(controls.raw_response_default_open ? { open: true } : {})}
        >
          <summary style={{ cursor: "pointer", color: "#334155", fontSize: "0.8125rem" }}>
            Raw Mind response
          </summary>
          <pre style={styles.pre}>{toMindDisplayPlainText(mindResponseText)}</pre>
        </details>
      ) : null}

      {auditEvents.length > 0 ? (
        <ul style={{ ...styles.meta, paddingLeft: "1.1rem", marginTop: "0.5rem" }}>
          {auditEvents.slice(0, 5).map((event, index) => (
            <li key={`${event.event_type}-${index}`}>
              {event.event_type}: {event.event_summary} ({new Date(event.created_at).toLocaleString()})
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

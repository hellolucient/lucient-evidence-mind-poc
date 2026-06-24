"use client";

import { useState } from "react";

import { renderSafeMindTextBlock } from "@/lib/review/safe-mind-text";

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
  error: { color: "#b91c1c", fontSize: "0.8125rem", marginTop: "0.35rem" } as const,
};

type RiskBrief = {
  risk_brief_id: string;
  search_capability_statement: string | null;
  searches_performed: unknown[];
  evidence_found: unknown[];
  evidence_not_found: unknown[];
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

export function MindRiskBriefPanel({ claimUuid, claimText, operatorEmail }: MindRiskBriefPanelProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [hasLiveExternalIds, setHasLiveExternalIds] = useState(false);
  const [hasResponseText, setHasResponseText] = useState(false);
  const [lastFetchNoReply, setLastFetchNoReply] = useState(false);
  const [briefs, setBriefs] = useState<RiskBrief[]>([]);
  const [auditEvents, setAuditEvents] = useState<Array<{ event_type: string; event_summary: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

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

  async function runAction(
    action: "create" | "approve" | "send" | "fetch" | "load-demo-fixture" | "parse"
  ) {
    setError(null);
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
          };
          setJobId(job.risk_brief_job_id);
          setJobStatus(job.status);
          setHasLiveExternalIds(Boolean(job.external_thread_id || job.external_message_id));
          setHasResponseText(Boolean(job.mind_response_text?.trim()));
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
          };
          setJobStatus(job.status);
          setHasLiveExternalIds(Boolean(job.external_thread_id || job.external_message_id));
          setHasResponseText(Boolean(job.mind_response_text?.trim()));
          if (action === "fetch") {
            const noReply = job.status === "waiting_for_reply" && !job.mind_response_text?.trim();
            setLastFetchNoReply(noReply);
          }
        }

        if (action === "parse") {
          await refreshBriefs();
        }
      } catch {
        setError("Risk brief workflow request failed.");
      }
    });
  }

  const latestBrief = briefs[0] ?? null;
  const fetchEligible =
    Boolean(jobId) &&
    (jobStatus === "sent" || jobStatus === "waiting_for_reply") &&
    hasLiveExternalIds;

  function fetchHelper(): string | null {
    if (!jobId) {
      return null;
    }
    if (jobStatus === "parsed") {
      return "This response has already been parsed.";
    }
    if (jobStatus === "response_fetched") {
      return "Response already fetched. Parse is available if response text exists.";
    }
    if (jobStatus === "parse_failed") {
      return "Response already fetched. Retry Parse after fixing the parse issue.";
    }
    if (jobStatus === "approved") {
      return "Send this job before fetching a Mind response.";
    }
    if (jobStatus === "pending_approval") {
      return "Approve and send this job before fetching.";
    }
    if (jobStatus === "sent" || jobStatus === "waiting_for_reply") {
      if (!hasLiveExternalIds) {
        return "No live Mind identifiers are attached to this job.";
      }
      return null;
    }
    if (!hasLiveExternalIds) {
      return "This is not a live Mind response. Fetch is only for live-sent jobs.";
    }
    return "Fetch is only available for live-sent jobs.";
  }

  return (
    <div style={styles.panel}>
      <strong>Mind Claim Risk Brief</strong>
      <div style={styles.meta}>Claim: {claimText}</div>
      <div style={styles.meta}>
        Operator-gated HelloMinds workflow. EXTERNAL_MIND_LIVE_SEND=false remains dry-run default.
      </div>

      <button type="button" style={styles.button} disabled={isPending("job_create")} onClick={() => runAction("create")}>
        {isPending("job_create") ? "Creating…" : "Create risk brief job"}
      </button>
      <button
        type="button"
        style={styles.buttonSecondary}
        disabled={isPending("job_approve") || !jobId}
        onClick={() => runAction("approve")}
      >
        {isPending("job_approve") ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        style={styles.buttonSecondary}
        disabled={isPending("job_send") || !jobId}
        onClick={() => runAction("send")}
      >
        {isPending("job_send") ? "Sending…" : "Send (dry-run safe)"}
      </button>
      <button
        type="button"
        style={styles.buttonSecondary}
        disabled={isPending("job_fetch") || !fetchEligible}
        onClick={() => runAction("fetch")}
      >
        {isPending("job_fetch") ? "Fetching…" : "Fetch response"}
      </button>
      {!fetchEligible && fetchHelper() ? (
        <div style={styles.meta}>{fetchHelper()}</div>
      ) : null}
      <button
        type="button"
        style={styles.buttonSecondary}
        disabled={
          isPending("job_load-demo-fixture") ||
          !jobId ||
          !["sent", "waiting_for_reply", "response_fetched"].includes(jobStatus ?? "")
        }
        onClick={() => runAction("load-demo-fixture")}
      >
        {isPending("job_load-demo-fixture") ? "Loading…" : "Load non-live risk brief fixture"}
      </button>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
        This loads a non-live fixture response for operator validation. It is not a live Mind response.
      </p>
      <button
        type="button"
        style={styles.buttonSecondary}
        disabled={isPending("job_parse") || !jobId || !hasResponseText}
        onClick={() => runAction("parse")}
      >
        {isPending("job_parse") ? "Parsing…" : "Parse"}
      </button>
      {!hasResponseText ? (
        <div style={styles.meta}>
          {lastFetchNoReply ? "No Mind reply yet. Try fetching again shortly." : "Fetch a Mind response before parsing."}
        </div>
      ) : null}
      <button type="button" style={styles.buttonSecondary} disabled={isPending("refresh_briefs")} onClick={() => runPending("refresh_briefs", refreshBriefs)}>
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
        </div>
      ) : null}

      {error ? <div style={styles.error}>{error}</div> : null}

      {latestBrief ? (
        <div style={{ marginTop: "0.75rem" }}>
          <div style={styles.meta}>
            Latest brief · posture: {latestBrief.evidence_posture ?? "—"} · risk:{" "}
            {latestBrief.risk_level ?? "—"} · recommendation:{" "}
            {latestBrief.operator_recommendation ?? "—"}
          </div>
          {latestBrief.search_capability_statement ? (
            <p style={{ fontSize: "0.8125rem", margin: "0.5rem 0 0" }}>
              {renderSafeMindTextBlock(latestBrief.search_capability_statement)}
            </p>
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

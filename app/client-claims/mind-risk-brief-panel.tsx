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
  const [briefs, setBriefs] = useState<RiskBrief[]>([]);
  const [auditEvents, setAuditEvents] = useState<Array<{ event_type: string; event_summary: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function runAction(action: "create" | "approve" | "send" | "fetch" | "parse") {
    setBusy(true);
    setError(null);

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
        const job = data.job as { risk_brief_job_id: string; status: string };
        setJobId(job.risk_brief_job_id);
        setJobStatus(job.status);
        return;
      }

      if (!jobId) {
        setError("Create a risk brief job first.");
        return;
      }

      const route = `/api/mind-risk-brief-jobs/${encodeURIComponent(jobId)}/${action === "fetch" ? "fetch-response" : action}`;
      const { response, data } = await postJson(route, { operator_email: operatorEmail ?? undefined });
      if (!response.ok || !data.ok) {
        setError(String(data.message ?? data.error ?? `${action} failed.`));
        return;
      }

      if (data.job) {
        const job = data.job as { status: string };
        setJobStatus(job.status);
      }

      if (action === "parse") {
        await refreshBriefs();
      }
    } catch {
      setError("Risk brief workflow request failed.");
    } finally {
      setBusy(false);
    }
  }

  const latestBrief = briefs[0] ?? null;

  return (
    <div style={styles.panel}>
      <strong>Mind Claim Risk Brief</strong>
      <div style={styles.meta}>Claim: {claimText}</div>
      <div style={styles.meta}>
        Operator-gated HelloMinds workflow. EXTERNAL_MIND_LIVE_SEND=false remains dry-run default.
      </div>

      <button type="button" style={styles.button} disabled={busy} onClick={() => runAction("create")}>
        Create risk brief job
      </button>
      <button type="button" style={styles.buttonSecondary} disabled={busy || !jobId} onClick={() => runAction("approve")}>
        Approve
      </button>
      <button type="button" style={styles.buttonSecondary} disabled={busy || !jobId} onClick={() => runAction("send")}>
        Send
      </button>
      <button type="button" style={styles.buttonSecondary} disabled={busy || !jobId} onClick={() => runAction("fetch")}>
        Fetch response
      </button>
      <button type="button" style={styles.buttonSecondary} disabled={busy || !jobId} onClick={() => runAction("parse")}>
        Parse
      </button>
      <button type="button" style={styles.buttonSecondary} disabled={busy} onClick={() => refreshBriefs()}>
        Refresh briefs
      </button>

      {jobId ? (
        <div style={styles.meta}>
          Job: <code>{jobId}</code> · status: {jobStatus ?? "—"}
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

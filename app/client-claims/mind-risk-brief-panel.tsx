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
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8125rem",
    marginTop: "0.5rem",
  } as const,
  th: {
    textAlign: "left" as const,
    borderBottom: "1px solid #e2e8f0",
    padding: "0.45rem",
    color: "#64748b",
    verticalAlign: "top" as const,
  } as const,
  td: {
    borderBottom: "1px solid #f1f5f9",
    padding: "0.45rem",
    verticalAlign: "top" as const,
  } as const,
  pill: {
    display: "inline-block",
    padding: "0.1rem 0.4rem",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: "0.6875rem",
    marginRight: "0.25rem",
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
  contract_version?: string | null;
  source_context?: string | null;
  search_capability_statement: string | null;
  searches_performed: unknown[];
  evidence_found: unknown[];
  evidence_not_found: unknown[];
  verification_summary?: unknown;
  urls?: unknown;
  pmids?: unknown;
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  regulatory_sensitivity?: string | null;
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
  verification_status?: unknown;
  verification_note?: unknown;
  evidence_category?: unknown;
  relevance_to_claim?: unknown;
  delivery_route?: unknown;
  intervention_match?: unknown;
  outcome_type?: unknown;
  summary?: unknown;
};

type SearchPerformedEntry = {
  source?: unknown;
  query?: unknown;
  date_performed?: unknown;
  result_count?: unknown;
  results_summary?: unknown;
  search_url_or_endpoint?: unknown;
};

type EvidenceNotFoundEntry = {
  gap?: unknown;
  importance?: unknown;
  searches_supporting_gap?: unknown;
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

function toDoiUrl(doi: string | null): string | null {
  if (!doi) {
    return null;
  }
  const trimmed = doi.trim();
  if (!trimmed) {
    return null;
  }
  if (looksLikeUrl(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.replace(/^doi:\s*/i, "");
  return `https://doi.org/${encodeURIComponent(normalized)}`;
}

function toPubmedUrl(pmid: string | null): string | undefined {
  if (!pmid) {
    return undefined;
  }
  const trimmed = pmid.trim();
  return trimmed ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(trimmed)}/` : undefined;
}

export function MindRiskBriefPanel({ claimUuid, claimText, operatorEmail }: MindRiskBriefPanelProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobParsedAt, setJobParsedAt] = useState<string | null>(null);
  const [mindResponseText, setMindResponseText] = useState<string | null>(null);
  const [externalThreadId, setExternalThreadId] = useState<string | null>(null);
  const [externalMessageId, setExternalMessageId] = useState<string | null>(null);
  const [jobPromptVersion, setJobPromptVersion] = useState<string | null>(null);
  const [jobOutputContractVersion, setJobOutputContractVersion] = useState<string | null>(null);
  const [jobCreatedAt, setJobCreatedAt] = useState<string | null>(null);
  const [outboundPromptText, setOutboundPromptText] = useState<string | null>(null);
  const [lastFetchNoReply, setLastFetchNoReply] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<RiskBrief[]>([]);
  const [auditEvents, setAuditEvents] = useState<Array<{ event_type: string; event_summary: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const latestBrief = briefs[0] ?? null;
  const isDryRunSend =
    jobStatus === "sent" &&
    !externalThreadId &&
    !externalMessageId &&
    Boolean(outboundPromptText?.trim());

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
        const verificationStatus = asNonEmptyString(item.verification_status);
        const verificationNote = asNonEmptyString(item.verification_note);
        const evidenceCategory = asNonEmptyString(item.evidence_category);
        const relevance = asNonEmptyString(item.relevance_to_claim);
        const deliveryRoute = asNonEmptyString(item.delivery_route);
        const interventionMatch = asNonEmptyString(item.intervention_match);
        const outcomeType = asNonEmptyString(item.outcome_type);
        const summary = asNonEmptyString(item.summary);

        const resolvedUrl = url && looksLikeUrl(url) ? url : toPubmedUrl(pmid);
        const doiUrl = toDoiUrl(doi);

        return {
          title: title ?? "Untitled study",
          url: resolvedUrl,
          pmid,
          doi,
          doiUrl,
          journal,
          year,
          authors,
          verificationStatus,
          verificationNote,
          evidenceCategory,
          relevance,
          deliveryRoute,
          interventionMatch,
          outcomeType,
          summary,
        };
      })
      .filter((item) => item.title || item.url || item.pmid || item.summary);
  }, [latestBrief]);

  const searchesPerformed = useMemo(() => {
    if (!latestBrief) {
      return [];
    }
    const raw = Array.isArray(latestBrief.searches_performed) ? latestBrief.searches_performed : [];
    return raw
      .filter((item): item is SearchPerformedEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
      .map((item) => {
        const source = asNonEmptyString(item.source);
        const query = asNonEmptyString(item.query);
        const datePerformed = asNonEmptyString(item.date_performed);
        const resultsSummary = asNonEmptyString(item.results_summary);
        const searchUrl = asNonEmptyString(item.search_url_or_endpoint);

        const resultCount =
          typeof item.result_count === "number"
            ? item.result_count
            : typeof item.result_count === "string"
              ? Number(item.result_count)
              : null;

        return {
          source: source ?? "—",
          query: query ?? "—",
          datePerformed: datePerformed ?? "—",
          resultCount: Number.isFinite(resultCount as number) ? (resultCount as number) : null,
          resultsSummary: resultsSummary ?? "—",
          searchUrl: searchUrl && looksLikeUrl(searchUrl) ? searchUrl : null,
          searchUrlText: searchUrl ?? null,
        };
      });
  }, [latestBrief]);

  const evidenceGaps = useMemo(() => {
    if (!latestBrief) {
      return [];
    }
    const raw = Array.isArray(latestBrief.evidence_not_found) ? latestBrief.evidence_not_found : [];
    return raw
      .filter((item): item is EvidenceNotFoundEntry => Boolean(item && typeof item === "object" && !Array.isArray(item)))
      .map((item) => {
        const gap = asNonEmptyString(item.gap);
        const importance = asNonEmptyString(item.importance);
        const searchesSupportingGap = Array.isArray(item.searches_supporting_gap)
          ? (item.searches_supporting_gap as unknown[])
              .map((value) => asNonEmptyString(value))
              .filter((value): value is string => Boolean(value))
          : [];

        return {
          gap: gap ?? "—",
          importance: importance ?? "—",
          searchesSupportingGap,
        };
      });
  }, [latestBrief]);

  const verificationSummary = useMemo(() => {
    if (!latestBrief || !latestBrief.verification_summary || typeof latestBrief.verification_summary !== "object") {
      return null;
    }
    const record = latestBrief.verification_summary as Record<string, unknown>;
    const method = asNonEmptyString(record.verification_method);
    const toNum = (value: unknown) => (typeof value === "number" ? value : typeof value === "string" ? Number(value) : null);
    return {
      totalPubmed: toNum(record.total_pubmed_items_returned),
      verifiedPubmed: toNum(record.verified_pubmed_items),
      unverified: toNum(record.unverified_items),
      nonPubmed: toNum(record.non_pubmed_items),
      method,
    };
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
    if (isDryRunSend) {
      return "Dry-run complete — outbound prompt stored. No message sent to HelloMinds.";
    }

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
      latest_job?: {
        risk_brief_job_id: string;
        status: string;
        prompt_version: string;
        output_contract_version: string;
        created_at: string;
        outbound_prompt_text?: string | null;
        mind_response_text?: string | null;
        external_thread_id?: string | null;
        external_message_id?: string | null;
        parsed_at?: string | null;
      } | null;
      latest_job_error?: string | null;
      risk_briefs?: RiskBrief[];
      audit_events?: Array<{ event_type: string; event_summary: string; created_at: string }>;
    };

    if (!data.ok) {
      setError("Unable to load stored briefs.");
      return;
    }

    setBriefs(data.risk_briefs ?? []);
    setAuditEvents(data.audit_events ?? []);

    if (data.latest_job) {
      setJobId(data.latest_job.risk_brief_job_id);
      setJobStatus(data.latest_job.status);
      setJobPromptVersion(data.latest_job.prompt_version);
      setJobOutputContractVersion(data.latest_job.output_contract_version);
      setJobCreatedAt(data.latest_job.created_at);
      setOutboundPromptText(data.latest_job.outbound_prompt_text ?? null);
      setMindResponseText(data.latest_job.mind_response_text ?? null);
      setExternalThreadId(data.latest_job.external_thread_id ?? null);
      setExternalMessageId(data.latest_job.external_message_id ?? null);
      setJobParsedAt(typeof data.latest_job.parsed_at === "string" ? data.latest_job.parsed_at : null);
    } else if (data.latest_job_error === "risk_brief_job_not_found") {
      // No job yet; keep state empty so Create is the first action.
      setJobId(null);
      setJobStatus(null);
      setJobPromptVersion(null);
      setJobOutputContractVersion(null);
      setJobCreatedAt(null);
      setOutboundPromptText(null);
      setMindResponseText(null);
      setExternalThreadId(null);
      setExternalMessageId(null);
      setJobParsedAt(null);
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
            prompt_version?: string | null;
            output_contract_version?: string | null;
            outbound_prompt_text?: string | null;
            mind_response_text?: string | null;
            external_thread_id?: string | null;
            external_message_id?: string | null;
            parsed_at?: string | null;
            created_at?: string | null;
          };
          setJobId(job.risk_brief_job_id);
          setJobStatus(job.status);
          setJobPromptVersion(typeof job.prompt_version === "string" ? job.prompt_version : null);
          setJobOutputContractVersion(
            typeof job.output_contract_version === "string" ? job.output_contract_version : null
          );
          setOutboundPromptText(job.outbound_prompt_text ?? null);
          setExternalThreadId(job.external_thread_id ?? null);
          setExternalMessageId(job.external_message_id ?? null);
          setJobParsedAt(typeof job.parsed_at === "string" ? job.parsed_at : null);
          setJobCreatedAt(typeof job.created_at === "string" ? job.created_at : null);
          setMindResponseText(job.mind_response_text ?? null);
          await refreshBriefs();
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
            prompt_version?: string | null;
            output_contract_version?: string | null;
            outbound_prompt_text?: string | null;
            mind_response_text?: string | null;
            external_thread_id?: string | null;
            external_message_id?: string | null;
            parsed_at?: string | null;
            created_at?: string | null;
          };
          setJobStatus(job.status);
          setJobPromptVersion(typeof job.prompt_version === "string" ? job.prompt_version : jobPromptVersion);
          setJobOutputContractVersion(
            typeof job.output_contract_version === "string"
              ? job.output_contract_version
              : jobOutputContractVersion
          );
          setOutboundPromptText(
            typeof job.outbound_prompt_text === "string" ? job.outbound_prompt_text : outboundPromptText
          );
          setExternalThreadId(job.external_thread_id ?? null);
          setExternalMessageId(job.external_message_id ?? null);
          setJobParsedAt(typeof job.parsed_at === "string" ? job.parsed_at : null);
          setJobCreatedAt(typeof job.created_at === "string" ? job.created_at : jobCreatedAt);
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
          await refreshBriefs();
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
  const approveJobDisabled = isPending("job_approve") || !jobId || jobStatus !== "pending_approval";
  const sendJobDisabled = isPending("job_send") || !jobId || jobStatus !== "approved";
  const fetchJobDisabled = isPending("job_fetch") || !controls.can_fetch;
  const loadFixtureDisabled = isPending("job_load-demo-fixture") || !controls.can_load_fixture;
  const parseJobDisabled = isPending("job_parse") || !controls.can_parse;
  const refreshBriefsDisabled = isPending("refresh_briefs");
  const showParseStatusPill = !controls.can_parse && controls.parse_label === "Already parsed";

  return (
    <div style={styles.panel}>
      <strong>External Mind Research (Evidence Risk Brief)</strong>
      <div style={styles.meta}>Claim: {claimText}</div>
      <div style={styles.meta}>
        Operator-gated HelloMinds workflow. Uses v2 live-research contract where available. EXTERNAL_MIND_LIVE_SEND=false remains dry-run default.
      </div>

      <button
        type="button"
        style={withDisabledButtonStyle(styles.button, createJobDisabled)}
        disabled={createJobDisabled}
        onClick={() => runAction("create")}
      >
        {isPending("job_create") ? "Creating…" : "Create External Mind research job"}
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
        {isPending("job_send") ? "Sending…" : "Send to External Mind (dry-run safe)"}
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
          {jobCreatedAt ? <div>Created: {new Date(jobCreatedAt).toLocaleString()}</div> : null}
          {jobPromptVersion || jobOutputContractVersion ? (
            <div style={{ marginTop: "0.15rem" }}>
              {jobPromptVersion ? <span style={styles.pill}>prompt: {jobPromptVersion}</span> : null}
              {jobOutputContractVersion ? (
                <span style={styles.pill}>contract: {jobOutputContractVersion}</span>
              ) : null}
            </div>
          ) : null}
          {isDryRunSend ? (
            <div style={{ marginTop: "0.35rem" }}>
              <div>
                <strong>Live send</strong>: disabled
              </div>
              <div>
                <strong>Outbound prompt</strong>: stored
              </div>
              <div>
                <strong>Next step</strong>: copy prompt manually into external Mind, or enable{" "}
                <code>EXTERNAL_MIND_LIVE_SEND=true</code> for live send.
              </div>
            </div>
          ) : null}
          {jobStatus === "parsed" ? (
            <div style={{ marginTop: "0.35rem" }}>This response has already been parsed.</div>
          ) : null}
        </div>
      ) : null}

      {statusMessage ? <div style={{ ...styles.meta, color: "#334155" }}>{statusMessage}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {outboundPromptText ? (
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", color: "#334155", fontSize: "0.8125rem" }}>
            View outbound prompt
          </summary>
          <pre style={styles.pre}>{toMindDisplayPlainText(outboundPromptText)}</pre>
        </details>
      ) : null}

      {latestBrief ? (
        <div style={{ marginTop: "0.75rem" }}>
          <div style={styles.meta}>
            Latest brief
            {latestBrief.contract_version ? (
              <span style={styles.pill}>contract: {latestBrief.contract_version}</span>
            ) : null}
            · posture: {latestBrief.evidence_posture ?? "—"} · strength:{" "}
            {latestBrief.evidence_strength ?? "—"} · risk: {latestBrief.risk_level ?? "—"} · regulatory:{" "}
            {latestBrief.regulatory_sensitivity ?? "—"} · recommendation: {latestBrief.operator_recommendation ?? "—"}
          </div>
          <div style={styles.meta}>
            Refresh briefs reloads stored results. It does not trigger a new Mind search.
          </div>
          {latestBrief.search_capability_statement ? (
            <p style={{ fontSize: "0.8125rem", margin: "0.5rem 0 0" }}>
              {renderSafeMindTextBlock(latestBrief.search_capability_statement)}
            </p>
          ) : null}

          {verificationSummary ? (
            <div style={{ marginTop: "0.65rem" }}>
              <div style={{ ...styles.meta, color: "#334155" }}>
                <strong>Verification summary</strong>
              </div>
              <div style={{ ...styles.meta, color: "#334155" }}>
                {verificationSummary.totalPubmed != null ? `PubMed items: ${verificationSummary.totalPubmed}` : "PubMed items: —"}
                {verificationSummary.verifiedPubmed != null ? ` · verified: ${verificationSummary.verifiedPubmed}` : ""}
                {verificationSummary.unverified != null ? ` · unverified: ${verificationSummary.unverified}` : ""}
                {verificationSummary.nonPubmed != null ? ` · non-PubMed: ${verificationSummary.nonPubmed}` : ""}
              </div>
              {verificationSummary.method ? (
                <div style={styles.meta}>Method: {renderSafeMindTextBlock(verificationSummary.method)}</div>
              ) : null}
            </div>
          ) : null}

          {searchesPerformed.length > 0 ? (
            <div style={{ marginTop: "0.65rem" }}>
              <div style={{ ...styles.meta, color: "#334155" }}>
                <strong>Searches performed</strong> ({searchesPerformed.length})
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Query</th>
                    <th style={styles.th}>Result count</th>
                    <th style={styles.th}>Summary</th>
                    <th style={styles.th}>Search URL</th>
                  </tr>
                </thead>
                <tbody>
                  {searchesPerformed.map((search, index) => (
                    <tr key={`${search.source}-${search.query}-${index}`}>
                      <td style={styles.td}>{search.source}</td>
                      <td style={styles.td}>
                        <div>{search.query}</div>
                        <div style={{ ...styles.meta, marginTop: "0.15rem" }}>Date: {search.datePerformed}</div>
                      </td>
                      <td style={styles.td}>{search.resultCount ?? "—"}</td>
                      <td style={styles.td}>
                        <div>{renderSafeMindTextBlock(search.resultsSummary)}</div>
                      </td>
                      <td style={styles.td}>
                        {search.searchUrl ? (
                          <a href={search.searchUrl} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : search.searchUrlText ? (
                          <span style={{ color: "#64748b" }}>{search.searchUrlText}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                      {entry.pmid ? (
                        <>
                          {" "}
                          · PMID:{" "}
                          <a href={toPubmedUrl(entry.pmid)} target="_blank" rel="noreferrer">
                            {entry.pmid}
                          </a>
                        </>
                      ) : (
                        ""
                      )}
                      {entry.doi ? (
                        <>
                          {" "}
                          · DOI:{" "}
                          {entry.doiUrl ? (
                            <a href={entry.doiUrl} target="_blank" rel="noreferrer">
                              {entry.doi}
                            </a>
                          ) : (
                            entry.doi
                          )}
                        </>
                      ) : (
                        ""
                      )}
                      {entry.evidenceCategory ? ` · ${entry.evidenceCategory}` : ""}
                      {entry.relevance ? ` · relevance: ${entry.relevance}` : ""}
                      {entry.deliveryRoute ? ` · delivery: ${entry.deliveryRoute}` : ""}
                      {entry.interventionMatch ? ` · intervention: ${entry.interventionMatch}` : ""}
                      {entry.outcomeType ? ` · outcome: ${entry.outcomeType}` : ""}
                      {entry.verificationStatus ? ` · verification: ${entry.verificationStatus}` : ""}
                    </div>
                    {entry.verificationNote ? (
                      <div style={{ marginTop: "0.25rem", color: "#475569" }}>
                        {renderSafeMindTextBlock(entry.verificationNote)}
                      </div>
                    ) : null}
                    {entry.summary ? (
                      <div style={{ marginTop: "0.25rem" }}>{renderSafeMindTextBlock(entry.summary)}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {evidenceGaps.length > 0 ? (
            <div style={{ marginTop: "0.65rem" }}>
              <div style={{ ...styles.meta, color: "#334155" }}>
                <strong>Evidence gaps</strong> ({evidenceGaps.length})
              </div>
              <ul style={styles.evidenceList}>
                {evidenceGaps.map((gap, index) => (
                  <li key={`${gap.gap}-${index}`} style={styles.evidenceItem}>
                    <div>{renderSafeMindTextBlock(gap.gap)}</div>
                    <div style={{ color: "#64748b", marginTop: "0.15rem" }}>
                      Importance: {renderSafeMindTextBlock(gap.importance)}
                    </div>
                    {gap.searchesSupportingGap.length > 0 ? (
                      <div style={{ ...styles.meta, marginTop: "0.15rem" }}>
                        Supporting searches: {gap.searchesSupportingGap.join("; ")}
                      </div>
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

import type { MindLoopDetailItem } from "@/lib/review/mind-loop-api";
import type { MindLoopDetailPageData } from "@/lib/review/mind-loop-detail-page";
import {
  formatMindLoopTaskCostDisplay,
  formatMindLoopTimestamp,
  resolveMindLoopApprovalBadgeTone,
  resolveMindLoopDeliveryBadgeTone,
  resolveMindLoopMindResponseBadgeTone,
  resolveMindLoopSendBadgeTone,
  type MindLoopStatusBadgeTone,
  type MindLoopTimelineStatus,
} from "@/lib/review/mind-loop-ui";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import Link from "next/link";

import { ReviewQueueAuthPanel } from "../../review-items/review-queue-auth-panel";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "1rem 1.25rem",
    maxWidth: "960px",
    margin: "0 auto",
  } as const,
  header: {
    marginBottom: "1.25rem",
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
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "0.75rem 1rem",
  } as const,
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
  } as const,
  fieldLabel: {
    fontSize: "0.72rem",
    color: "#64748b",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  } as const,
  fieldValue: {
    fontSize: "0.875rem",
    color: "#0f172a",
    lineHeight: 1.4,
  } as const,
  badgeBase: {
    display: "inline-block",
    padding: "0.18rem 0.55rem",
    borderRadius: "999px",
    fontSize: "0.72rem",
    fontWeight: 600,
    border: "1px solid transparent",
    whiteSpace: "nowrap" as const,
  } as const,
  attentionPanelClear: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    padding: "0.85rem 1rem",
  } as const,
  attentionPanelNeeds: {
    background: "#fffbeb",
    border: "1px solid #fcd34d",
    borderRadius: "8px",
    padding: "0.85rem 1rem",
  } as const,
  attentionTitle: {
    fontSize: "0.9375rem",
    fontWeight: 600,
    margin: "0 0 0.35rem",
    color: "#0f172a",
  } as const,
  attentionHint: {
    fontSize: "0.8125rem",
    color: "#475569",
    margin: "0.25rem 0 0",
    lineHeight: 1.45,
  } as const,
  attentionExtra: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: "0.5rem",
  } as const,
  excerpt: {
    fontSize: "0.875rem",
    color: "#334155",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap" as const,
    margin: 0,
  } as const,
  timelineList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  } as const,
  timelineItem: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.65rem 0",
    borderBottom: "1px solid #f1f5f9",
  } as const,
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    marginTop: "0.35rem",
    flexShrink: 0,
  } as const,
  timelineLabel: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#0f172a",
  } as const,
  timelineMeta: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: "0.15rem",
  } as const,
  timelineDescription: {
    fontSize: "0.8125rem",
    color: "#475569",
    marginTop: "0.2rem",
    lineHeight: 1.4,
  } as const,
  costLine: {
    fontSize: "0.8125rem",
    color: "#334155",
    margin: "0.15rem 0",
  } as const,
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.875rem",
  } as const,
  note: {
    fontSize: "0.8125rem",
    color: "#64748b",
    marginBottom: "0.75rem",
  } as const,
};

const BADGE_TONE_STYLES: Record<MindLoopStatusBadgeTone, { background: string; color: string; border: string }> =
  {
    neutral: { background: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
    success: { background: "#dcfce7", color: "#166534", border: "#86efac" },
    warning: { background: "#fef3c7", color: "#92400e", border: "#fcd34d" },
    danger: { background: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
    info: { background: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  };

const TIMELINE_STATUS_COLORS: Record<MindLoopTimelineStatus, string> = {
  complete: "#22c55e",
  pending: "#f59e0b",
  unavailable: "#cbd5e1",
};

const TIMELINE_STATUS_LABELS: Record<MindLoopTimelineStatus, string> = {
  complete: "Complete",
  pending: "Pending",
  unavailable: "Unavailable",
};

type MindLoopDetailProps = {
  pageData: MindLoopDetailPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function StatusBadge({ label, tone }: { label: string; tone: MindLoopStatusBadgeTone }) {
  const toneStyle = BADGE_TONE_STYLES[tone];
  return (
    <span
      style={{
        ...styles.badgeBase,
        background: toneStyle.background,
        color: toneStyle.color,
        borderColor: toneStyle.border,
      }}
    >
      {label}
    </span>
  );
}

function OverviewSection({ item }: { item: MindLoopDetailItem }) {
  const digestHref = `/mind-digests?digest_id=${encodeURIComponent(item.digest_id)}`;

  return (
    <section style={styles.section} aria-label="Loop overview">
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Loop overview</h2>
      <div style={styles.grid}>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Digest period</span>
          <span style={styles.fieldValue}>{item.digest_period_label}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Workspace</span>
          <span style={styles.fieldValue}>
            <code style={{ fontSize: "0.8125rem" }}>{item.workspace_id}</code>
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Digest ID</span>
          <span style={styles.fieldValue}>
            <code style={{ fontSize: "0.8125rem" }} title={item.digest_id}>
              {item.digest_id_short}
            </code>
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Handoff ID</span>
          <span style={styles.fieldValue}>
            {item.handoff_id_short ? (
              <code style={{ fontSize: "0.8125rem" }} title={item.handoff_id ?? undefined}>
                {item.handoff_id_short}
              </code>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Destination</span>
          <span style={styles.fieldValue}>{item.handoff_destination_label ?? "—"}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Risk posture</span>
          <span style={styles.fieldValue}>{item.risk_posture}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Review items</span>
          <span style={styles.fieldValue}>{item.review_items_count}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Evidence briefs</span>
          <span style={styles.fieldValue}>{item.evidence_briefs_count}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Approval</span>
          <span style={styles.fieldValue}>
            <StatusBadge
              label={item.approval_status_label}
              tone={resolveMindLoopApprovalBadgeTone(item.approval_status)}
            />
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Send</span>
          <span style={styles.fieldValue}>
            <StatusBadge
              label={item.send_status_label}
              tone={resolveMindLoopSendBadgeTone(item.send_status)}
            />
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Delivery</span>
          <span style={styles.fieldValue}>
            <StatusBadge
              label={item.delivery_status_label}
              tone={resolveMindLoopDeliveryBadgeTone(item.delivery_status, item.send_status)}
            />
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Mind response</span>
          <span style={styles.fieldValue}>
            <StatusBadge
              label={item.mind_response_status_label}
              tone={resolveMindLoopMindResponseBadgeTone({
                receiptStatus: item.delivery_status,
                mindReplyState: item.mind_reply_state,
              })}
            />
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Loop stage</span>
          <span style={styles.fieldValue}>{item.loop_stage_label}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Needs attention</span>
          <span style={styles.fieldValue}>
            <StatusBadge
              label={item.needs_attention ? "Needs attention" : "Clear"}
              tone={item.needs_attention ? "warning" : "success"}
            />
          </span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Last updated</span>
          <span style={styles.fieldValue}>{formatMindLoopTimestamp(item.last_updated_at)}</span>
        </div>
        {item.retrieval_timestamp ? (
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Retrieved</span>
            <span style={styles.fieldValue}>
              {formatMindLoopTimestamp(item.retrieval_timestamp)}
            </span>
          </div>
        ) : null}
      </div>
      <p style={{ ...styles.note, marginTop: "0.85rem", marginBottom: 0 }}>
        <a href={digestHref} style={styles.link}>
          Open digest page →
        </a>
      </p>
    </section>
  );
}

function AttentionSection({ item }: { item: MindLoopDetailItem }) {
  const panelStyle = item.needs_attention
    ? styles.attentionPanelNeeds
    : styles.attentionPanelClear;

  return (
    <section style={styles.section} aria-label="Attention">
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Attention</h2>
      <div style={panelStyle}>
        {item.needs_attention ? (
          <>
            {item.attention.primary_label ? (
              <p style={styles.attentionTitle}>{item.attention.primary_label}</p>
            ) : null}
            {item.attention.primary_helper_text ? (
              <p style={styles.attentionHint}>{item.attention.primary_helper_text}</p>
            ) : null}
            {item.attention.operator_hint ? (
              <p style={{ ...styles.attentionHint, fontWeight: 500 }}>
                Operator hint: {item.attention.operator_hint}
              </p>
            ) : null}
            {item.attention.additional_labels.length > 0 ? (
              <p style={styles.attentionExtra}>
                Additional reasons: {item.attention.additional_labels.join(" · ")}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p style={styles.attentionTitle}>No operator action required</p>
            {item.attention.primary_reason ? (
              <p style={styles.attentionHint}>
                Primary reason: {item.attention.primary_reason.replaceAll("_", " ")}
              </p>
            ) : null}
            {item.attention.operator_hint ? (
              <p style={styles.attentionHint}>{item.attention.operator_hint}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function TimelineSection({ item }: { item: MindLoopDetailItem }) {
  return (
    <section style={styles.section} aria-label="Loop timeline">
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Loop timeline</h2>
      <ul style={styles.timelineList}>
        {item.timeline.map((entry) => (
          <li key={entry.stage} style={styles.timelineItem}>
            <span
              style={{
                ...styles.timelineDot,
                background: TIMELINE_STATUS_COLORS[entry.status],
              }}
              aria-hidden
            />
            <div>
              <div style={styles.timelineLabel}>{entry.label}</div>
              <div style={styles.timelineMeta}>
                {TIMELINE_STATUS_LABELS[entry.status]}
                {entry.timestamp ? ` · ${formatMindLoopTimestamp(entry.timestamp)}` : ""}
              </div>
              <div style={styles.timelineDescription}>{entry.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MindReplySection({ item }: { item: MindLoopDetailItem }) {
  return (
    <section style={styles.section} aria-label="Mind reply">
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Mind reply</h2>
      <div style={styles.grid}>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Mind response status</span>
          <span style={styles.fieldValue}>
            <StatusBadge
              label={item.mind_response_status_label}
              tone={resolveMindLoopMindResponseBadgeTone({
                receiptStatus: item.delivery_status,
                mindReplyState: item.mind_reply_state,
              })}
            />
          </span>
        </div>
        <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
          <span style={styles.fieldLabel}>Latest action recommendation</span>
          <span style={styles.fieldValue}>{item.latest_action ?? "—"}</span>
        </div>
      </div>
      {item.latest_mind_reply_excerpt ? (
        <div style={{ marginTop: "0.85rem" }}>
          <span style={styles.fieldLabel}>Latest Mind reply excerpt</span>
          <p style={styles.excerpt}>{item.latest_mind_reply_excerpt}</p>
        </div>
      ) : (
        <p style={{ ...styles.note, marginTop: "0.85rem", marginBottom: 0 }}>
          No Mind reply excerpt stored yet.
        </p>
      )}
    </section>
  );
}

function CostSection({ item }: { item: MindLoopDetailItem }) {
  const taskCostLabel = formatMindLoopTaskCostDisplay({
    task_cost: item.task_cost,
    task_cost_status: item.task_cost_status,
  });

  return (
    <section style={styles.section} aria-label="Task cost">
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Task cost</h2>
      <div style={styles.grid}>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Total credits</span>
          <span style={styles.fieldValue}>{taskCostLabel}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Cost status</span>
          <span style={styles.fieldValue}>{item.task_cost_status}</span>
        </div>
        {item.task_cost?.remaining_balance ? (
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Remaining balance</span>
            <span style={styles.fieldValue}>{item.task_cost.remaining_balance}</span>
          </div>
        ) : null}
      </div>
      {item.task_cost?.major_cost_lines && item.task_cost.major_cost_lines.length > 0 ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={styles.fieldLabel}>Major cost lines</span>
          {item.task_cost.major_cost_lines.map((line) => (
            <p key={line} style={styles.costLine}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
      {item.task_cost_status === "malformed" ? (
        <p style={{ ...styles.note, marginTop: "0.75rem", marginBottom: 0 }}>
          Cost report could not be parsed safely from stored excerpt.
        </p>
      ) : null}
      {item.task_cost_status === "unavailable" ? (
        <p style={{ ...styles.note, marginTop: "0.75rem", marginBottom: 0 }}>
          No task cost summary available.
        </p>
      ) : null}
    </section>
  );
}

/**
 * Phase 43B — read-only Mind Loop operator detail view.
 *
 * SAFETY: Display-only. Must not trigger send, auto-send, retry, or live HelloMinds fetch.
 * EXTERNAL_MIND_LIVE_SEND is not required.
 */
export function MindLoopDetail({ pageData, authStatus }: MindLoopDetailProps) {
  const dashboardHref = "/operator/mind-loop";

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: "1.5rem" }}>
          Mind Loop Detail
        </h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem", maxWidth: "52rem" }}>
          Read-only drill-down for one evidence-to-Mind loop — digest, handoff, delivery, Mind
          response, and task cost. This page never sends or retries handoffs.
        </p>
        <nav style={styles.nav}>
          <Link href={dashboardHref} style={styles.link}>
            ← Back to Mind Loop Dashboard
          </Link>
          {" · "}
          <a href="/mind-digests">Mind digests</a>
          {" · "}
          <a href="/review-items">Review queue</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {!pageData.configured ? (
        <div style={styles.error}>
          Mind loop detail storage is not configured. Set Supabase URL and service role key.
        </div>
      ) : null}

      {pageData.notFound ? (
        <div style={styles.error}>
          Digest not found or not accessible.{" "}
          <Link href={dashboardHref} style={styles.link}>
            Return to dashboard
          </Link>
        </div>
      ) : null}

      {pageData.detailError && pageData.configured && !pageData.notFound ? (
        <div style={styles.error}>Detail error: {pageData.detailError}</div>
      ) : null}

      {pageData.item ? (
        <>
          <OverviewSection item={pageData.item} />
          <AttentionSection item={pageData.item} />
          <TimelineSection item={pageData.item} />
          <MindReplySection item={pageData.item} />
          <CostSection item={pageData.item} />
        </>
      ) : null}
    </main>
  );
}

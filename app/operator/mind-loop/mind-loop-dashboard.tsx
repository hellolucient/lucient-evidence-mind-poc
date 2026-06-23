import type { MindLoopListItem } from "@/lib/review/mind-loop-api";
import type { MindLoopPageData } from "@/lib/review/mind-loop-page";
import {
  formatMindLoopTaskCostDisplay,
  formatMindLoopTimestamp,
  resolveMindLoopApprovalBadgeTone,
  resolveMindLoopDeliveryBadgeTone,
  resolveMindLoopMindResponseBadgeTone,
  resolveMindLoopSendBadgeTone,
  type MindLoopStatusBadgeTone,
  type MindLoopSummaryTiles,
} from "@/lib/review/mind-loop-ui";
import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

import { ReviewQueueAuthPanel } from "../../review-items/review-queue-auth-panel";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "1rem 1.25rem",
    maxWidth: "1320px",
    margin: "0 auto",
  } as const,
  header: {
    marginBottom: "1.25rem",
  } as const,
  nav: {
    marginTop: "0.5rem",
    fontSize: "0.875rem",
  } as const,
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1rem",
  } as const,
  summaryTile: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.75rem 0.9rem",
    background: "#fff",
  } as const,
  summaryValue: {
    fontSize: "1.35rem",
    fontWeight: 600,
    color: "#0f172a",
    lineHeight: 1.2,
  } as const,
  summaryLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: "0.2rem",
  } as const,
  filterSection: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.85rem 1rem",
    marginBottom: "1rem",
    background: "#f8fafc",
  } as const,
  filterRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem",
    alignItems: "flex-end",
  } as const,
  filterField: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    minWidth: "140px",
    flex: "1 1 140px",
  } as const,
  filterLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: 500,
  } as const,
  filterInput: {
    padding: "0.4rem 0.55rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    fontSize: "0.8125rem",
    background: "#fff",
  } as const,
  filterButton: {
    padding: "0.45rem 0.85rem",
    borderRadius: "4px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
    whiteSpace: "nowrap" as const,
  } as const,
  filterReset: {
    padding: "0.45rem 0.85rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.8125rem",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  } as const,
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    background: "#fff",
  } as const,
  tableWrap: {
    overflowX: "auto" as const,
    WebkitOverflowScrolling: "touch" as const,
  } as const,
  table: {
    width: "100%",
    minWidth: "960px",
    borderCollapse: "collapse" as const,
    fontSize: "0.8125rem",
  } as const,
  th: {
    textAlign: "left" as const,
    borderBottom: "2px solid #e2e8f0",
    padding: "0.55rem 0.5rem",
    color: "#475569",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    background: "#f8fafc",
    position: "sticky" as const,
    top: 0,
  } as const,
  td: {
    borderBottom: "1px solid #f1f5f9",
    padding: "0.6rem 0.5rem",
    verticalAlign: "top" as const,
  } as const,
  note: {
    fontSize: "0.8125rem",
    color: "#64748b",
    marginBottom: "0.75rem",
  } as const,
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  emptyState: {
    border: "1px dashed #cbd5e1",
    borderRadius: "8px",
    padding: "1.25rem",
    color: "#64748b",
    fontSize: "0.875rem",
    background: "#f8fafc",
  } as const,
  badgeBase: {
    display: "inline-block",
    padding: "0.18rem 0.55rem",
    borderRadius: "999px",
    fontSize: "0.72rem",
    fontWeight: 600,
    border: "1px solid transparent",
    whiteSpace: "nowrap" as const,
    letterSpacing: "0.01em",
  } as const,
  stageHint: {
    fontSize: "0.72rem",
    color: "#64748b",
    marginTop: "0.3rem",
    maxWidth: "200px",
    lineHeight: 1.35,
  } as const,
  actionText: {
    fontSize: "0.8125rem",
    color: "#334155",
    maxWidth: "200px",
    whiteSpace: "normal" as const,
    lineHeight: 1.4,
  } as const,
  digestLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.75rem",
    fontWeight: 500,
  } as const,
  periodPrimary: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: "0.8125rem",
  } as const,
  timestampPrimary: {
    fontSize: "0.8125rem",
    color: "#334155",
  } as const,
  timestampSecondary: {
    fontSize: "0.72rem",
    color: "#94a3b8",
    marginTop: "0.15rem",
  } as const,
  attentionRow: {
    background: "#fffbeb",
  } as const,
  completeRow: {
    background: "#f8fafc",
  } as const,
  attentionCell: {
    maxWidth: "220px",
    whiteSpace: "normal" as const,
    lineHeight: 1.4,
  } as const,
  attentionPrimary: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#0f172a",
  } as const,
  attentionHint: {
    fontSize: "0.75rem",
    color: "#475569",
    marginTop: "0.25rem",
  } as const,
  attentionExtra: {
    fontSize: "0.72rem",
    color: "#64748b",
    marginTop: "0.25rem",
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

type MindLoopDashboardProps = {
  pageData: MindLoopPageData;
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

function SummaryTiles({ summary }: { summary: MindLoopSummaryTiles }) {
  const tiles = [
    { label: "Digests shown", value: summary.total_digests },
    { label: "Complete loops", value: summary.complete_loops },
    { label: "Needs attention", value: summary.needs_attention },
    { label: "Pending approval", value: summary.pending_approval },
    { label: "Awaiting delivery", value: summary.awaiting_delivery_verification },
    { label: "Awaiting Mind response", value: summary.awaiting_mind_response },
  ];

  return (
    <div style={styles.summaryGrid}>
      {tiles.map((tile) => (
        <div key={tile.label} style={styles.summaryTile}>
          <div style={styles.summaryValue}>{tile.value}</div>
          <div style={styles.summaryLabel}>{tile.label}</div>
        </div>
      ))}
    </div>
  );
}

function FilterBar({ pageData }: { pageData: MindLoopPageData }) {
  const filters = pageData.filters;

  return (
    <section style={styles.filterSection} aria-label="Mind loop filters">
      <form method="get" action="/operator/mind-loop">
        <div style={styles.filterRow}>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>Workspace</span>
            <input
              type="text"
              name="workspace_id"
              defaultValue={filters.workspace_id ?? ""}
              placeholder="All workspaces"
              style={styles.filterInput}
            />
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>Destination</span>
            <select
              name="destination"
              defaultValue={filters.destination ?? "hellominds"}
              style={styles.filterInput}
            >
              <option value="hellominds">HelloMinds</option>
              <option value="test_sink">Test sink</option>
            </select>
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>Attention</span>
            <select
              name="attention"
              defaultValue={filters.attention ?? "all"}
              style={styles.filterInput}
            >
              <option value="all">All</option>
              <option value="needs_attention">Needs attention</option>
              <option value="no_attention">No attention needed</option>
            </select>
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>Loop status</span>
            <select
              name="loop_status"
              defaultValue={filters.loop_status ?? ""}
              style={styles.filterInput}
            >
              <option value="">All</option>
              <option value="needs_attention">Needs attention</option>
              <option value="sent">Sent</option>
              <option value="retrieved">Retrieved</option>
            </select>
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>Limit</span>
            <input
              type="number"
              name="limit"
              min={1}
              max={100}
              defaultValue={filters.limit ?? 20}
              style={styles.filterInput}
            />
          </label>
          <button type="submit" style={styles.filterButton}>
            Apply filters
          </button>
          <a href="/operator/mind-loop" style={styles.filterReset}>
            Reset
          </a>
        </div>
      </form>
    </section>
  );
}

function MindLoopTableRow({ item }: { item: MindLoopListItem }) {
  const digestHref = `/mind-digests?digest_id=${encodeURIComponent(item.digest_id)}`;
  const rowStyle = item.needs_attention ? styles.attentionRow : styles.completeRow;
  const taskCostLabel = formatMindLoopTaskCostDisplay({
    task_cost: item.task_cost,
    task_cost_status: item.task_cost_status,
  });
  const attentionTone: MindLoopStatusBadgeTone = item.needs_attention ? "warning" : "success";
  const attentionBadgeLabel = item.needs_attention ? "Needs attention" : "Clear";

  return (
    <tr style={rowStyle}>
      <td style={styles.td}>
        <div style={styles.periodPrimary}>{item.digest_period_label}</div>
        <a href={digestHref} style={styles.digestLink}>
          Open digest →
        </a>
        <div style={styles.stageHint}>{item.loop_stage_label}</div>
      </td>
      <td style={{ ...styles.td, ...styles.attentionCell }}>
        <StatusBadge label={attentionBadgeLabel} tone={attentionTone} />
        {item.attention.primary_label ? (
          <div style={styles.attentionPrimary}>{item.attention.primary_label}</div>
        ) : null}
        {item.attention.operator_hint ? (
          <div style={styles.attentionHint}>{item.attention.operator_hint}</div>
        ) : null}
        {item.attention.additional_labels.length > 0 ? (
          <div style={styles.attentionExtra}>
            Also: {item.attention.additional_labels.join(" · ")}
          </div>
        ) : null}
        <a href={digestHref} style={{ ...styles.digestLink, display: "inline-block", marginTop: "0.35rem" }}>
          Review on digest page →
        </a>
      </td>
      <td style={styles.td}>
        <code style={{ fontSize: "0.75rem" }}>{item.workspace_id}</code>
      </td>
      <td style={styles.td}>{item.risk_posture}</td>
      <td style={styles.td}>{item.review_items_count}</td>
      <td style={styles.td}>{item.evidence_briefs_count}</td>
      <td style={styles.td}>{item.handoff_destination_label ?? "—"}</td>
      <td style={styles.td}>
        <StatusBadge
          label={item.approval_status_label}
          tone={resolveMindLoopApprovalBadgeTone(item.approval_status)}
        />
      </td>
      <td style={styles.td}>
        <StatusBadge
          label={item.send_status_label}
          tone={resolveMindLoopSendBadgeTone(item.send_status)}
        />
      </td>
      <td style={styles.td}>
        <StatusBadge
          label={item.delivery_status_label}
          tone={resolveMindLoopDeliveryBadgeTone(item.delivery_status, item.send_status)}
        />
      </td>
      <td style={styles.td}>
        <StatusBadge
          label={item.mind_response_status_label}
          tone={resolveMindLoopMindResponseBadgeTone({
            receiptStatus: item.delivery_status,
            mindReplyState: item.mind_reply_state,
          })}
        />
      </td>
      <td style={styles.td}>
        <div style={styles.actionText}>{item.latest_action ?? "—"}</div>
      </td>
      <td style={styles.td}>
        <span title={item.task_cost_status === "malformed" ? "Cost report could not be parsed safely" : undefined}>
          {taskCostLabel}
        </span>
      </td>
      <td style={styles.td}>
        <div style={styles.timestampPrimary}>{formatMindLoopTimestamp(item.last_updated_at)}</div>
        {item.retrieval_timestamp ? (
          <div style={styles.timestampSecondary}>
            Retrieved {formatMindLoopTimestamp(item.retrieval_timestamp)}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function EmptyStateMessage({ pageData }: { pageData: MindLoopPageData }) {
  if (!pageData.configured) {
    return null;
  }

  if (pageData.totalBeforeFilter === 0) {
    return (
      <div style={styles.emptyState}>
        <strong>No digests found.</strong> Generate a Mind digest first, then return here to track
        the evidence-to-Mind loop.
      </div>
    );
  }

  if ((pageData.loopStatus || pageData.attention !== "all") && pageData.items.length === 0) {
    return (
      <div style={styles.emptyState}>
        <strong>No rows match the current filter.</strong> Try clearing attention or loop status
        filters, or widening workspace/destination filters.
      </div>
    );
  }

  return null;
}

/**
 * Phase 42B/43A — read-only Mind Loop operator dashboard view.
 *
 * SAFETY: Display-only. Must not trigger send, auto-send, retry, or live HelloMinds fetch.
 * EXTERNAL_MIND_LIVE_SEND is not required.
 */
export function MindLoopDashboard({ pageData, authStatus }: MindLoopDashboardProps) {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: "1.5rem" }}>
          Mind Loop Dashboard
        </h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem", maxWidth: "52rem" }}>
          At-a-glance operator view of the evidence-to-Mind loop — digest, handoff approval, send,
          delivery receipt, Mind response, and task cost. Attention reasons highlight what needs
          operator review next. All data is read from durable records; this page never sends or
          retries handoffs.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/mind-digests">Mind digests</a>
          {" · "}
          <a href="/operator/mind-loop">Mind loop dashboard</a>
          {" · "}
          <a href="/evidence-briefs">Evidence briefs</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {!pageData.configured ? (
        <div style={styles.error}>
          Mind loop dashboard storage is not configured. Set Supabase URL and service role key.
        </div>
      ) : null}

      {pageData.listError && pageData.configured ? (
        <div style={styles.error}>List error: {pageData.listError}</div>
      ) : null}

      {pageData.configured ? (
        <>
          <SummaryTiles summary={pageData.summary} />
          <FilterBar pageData={pageData} />
        </>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Mind loop records</h2>
        <p style={styles.note}>
          Destination: <strong>{pageData.destination}</strong>
          {pageData.loopStatus ? (
            <>
              {" "}
              · Loop: <strong>{pageData.loopStatus.replaceAll("_", " ")}</strong>
            </>
          ) : null}
          {pageData.attention !== "all" ? (
            <>
              {" "}
              · Attention: <strong>{pageData.attention.replaceAll("_", " ")}</strong>
            </>
          ) : null}
          {pageData.items.length !== pageData.totalBeforeFilter ? (
            <>
              {" "}
              · Showing {pageData.items.length} of {pageData.totalBeforeFilter}
            </>
          ) : null}
        </p>

        <EmptyStateMessage pageData={pageData} />

        {pageData.items.length > 0 ? (
          <div style={styles.tableWrap}>
            <table style={{ ...styles.table, minWidth: "1100px" }}>
              <thead>
                <tr>
                  <th style={styles.th}>Digest period</th>
                  <th style={styles.th}>Attention</th>
                  <th style={styles.th}>Workspace</th>
                  <th style={styles.th}>Risk</th>
                  <th style={styles.th}>Reviews</th>
                  <th style={styles.th}>Briefs</th>
                  <th style={styles.th}>Destination</th>
                  <th style={styles.th}>Approval</th>
                  <th style={styles.th}>Send</th>
                  <th style={styles.th}>Delivery</th>
                  <th style={styles.th}>Mind response</th>
                  <th style={styles.th}>Latest action</th>
                  <th style={styles.th}>Task cost</th>
                  <th style={styles.th}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {pageData.items.map((item) => (
                  <MindLoopTableRow key={item.digest_id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}

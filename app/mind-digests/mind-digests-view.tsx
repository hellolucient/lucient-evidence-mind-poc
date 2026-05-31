import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { MindDigestsPageData } from "@/lib/review/mind-digests-page";

import { ReviewQueueAuthPanel } from "../review-items/review-queue-auth-panel";

const GENERATE_DEMO_PATH = "/mind-digests/generate-demo";

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
  button: {
    padding: "0.45rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
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
  detailLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginBottom: "0.15rem",
  } as const,
  detailValue: {
    marginBottom: "0.75rem",
    fontSize: "0.875rem",
  } as const,
  selectedRow: {
    background: "#eff6ff",
  } as const,
  note: {
    fontSize: "0.8125rem",
    color: "#64748b",
    marginBottom: "0.75rem",
  } as const,
};

type MindDigestsViewProps = {
  pageData: MindDigestsPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }

  return `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
}

export function MindDigestsView({ pageData, authStatus }: MindDigestsViewProps) {
  const selectedDigestId = pageData.selectedDigest?.id ?? null;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Mind digests</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Internal watchtower summaries built from stored evidence alerts, review items, briefs, and
          mapped claims. Phase 29 does not call an external Animoca Mind or schedule automatic
          generation.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/client-claims">Client claims</a>
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

      {pageData.generateFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.generateFlash.duplicate_skipped
            ? "An active digest already exists for this period — showing existing digest."
            : "Demo Mind digest generated."}
        </div>
      ) : null}

      {pageData.generateFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.generateFlash.message}</div>
      ) : null}

      {pageData.listErrorMessage && pageData.configured ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Generate demo digest</h2>
        <p style={styles.note}>
          Creates a template digest for workspace {pageData.defaultWorkspaceId} covering the last 7
          days, summarizing existing evidence briefs, review items, alerts, and mappings where
          available.
        </p>
        <form action={GENERATE_DEMO_PATH} method="post">
          <input type="hidden" name="workspace_id" value={pageData.defaultWorkspaceId} />
          <button type="submit" style={styles.button}>
            Generate demo digest
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Digests</h2>
        {pageData.digests.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            No Mind digests yet.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Highest risk</th>
                <th style={styles.th}>Affected claims</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {pageData.digests.map((digest) => (
                <tr
                  key={digest.id}
                  style={digest.id === selectedDigestId ? styles.selectedRow : undefined}
                >
                  <td style={styles.td}>
                    <a href={`/mind-digests?digest_id=${encodeURIComponent(digest.id)}`}>
                      {digest.digest_title}
                    </a>
                  </td>
                  <td style={styles.td}>
                    {formatPeriod(digest.period_start, digest.period_end)}
                  </td>
                  <td style={styles.td}>{digest.status}</td>
                  <td style={styles.td}>{digest.highest_risk_implication}</td>
                  <td style={styles.td}>{digest.affected_client_claims_count}</td>
                  <td style={styles.td}>{formatTimestamp(digest.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pageData.detailErrorMessage ? (
        <div style={styles.error}>{pageData.detailErrorMessage}</div>
      ) : null}

      {pageData.selectedDigest ? (
        <section style={styles.section}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Digest detail</h2>
          <div style={styles.detailLabel}>Summary</div>
          <div style={styles.detailValue}>{pageData.selectedDigest.digest_summary}</div>

          <div style={styles.detailLabel}>Recommended focus</div>
          <div style={styles.detailValue}>{pageData.selectedDigest.recommended_focus}</div>

          <div style={styles.detailLabel}>Watch activity</div>
          <div style={styles.detailValue}>
            Watchlists checked: {pageData.selectedDigest.watchlists_checked_count} · New alerts:{" "}
            {pageData.selectedDigest.new_alerts_count} · Review items:{" "}
            {pageData.selectedDigest.review_items_count} · Briefs:{" "}
            {pageData.selectedDigest.briefs_count}
          </div>

          <div style={styles.detailLabel}>Affected scope</div>
          <div style={styles.detailValue}>
            Claim families: {pageData.selectedDigest.affected_claim_families_count} · Client claims:{" "}
            {pageData.selectedDigest.affected_client_claims_count}
          </div>

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1rem" }}>Digest item snapshots</h3>
          {pageData.selectedDigestItems.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
              No item snapshots were recorded for this digest.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Claim family</th>
                  <th style={styles.th}>Client claim</th>
                  <th style={styles.th}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {pageData.selectedDigestItems.map((item) => (
                  <tr key={`${item.digest_id}:${item.item_type}:${item.title_snapshot}:${item.item_ref_id ?? ""}`}>
                    <td style={styles.td}>{item.item_type}</td>
                    <td style={styles.td}>{item.title_snapshot}</td>
                    <td style={styles.td}>{item.claim_family ?? "—"}</td>
                    <td style={styles.td}>{item.client_claim_id ?? "—"}</td>
                    <td style={styles.td}>{item.risk_implication ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </main>
  );
}

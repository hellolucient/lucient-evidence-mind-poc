import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { ClientClaimsPageData } from "@/lib/review/client-claims-page";

import { ReviewQueueAuthPanel } from "../review-items/review-queue-auth-panel";

const CLIENT_CLAIMS_CREATE_PATH = "/client-claims/create";
const CLIENT_CLAIMS_STATUS_PATH = "/client-claims/update-status";

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
  input: {
    width: "100%",
    padding: "0.45rem 0.55rem",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    fontSize: "0.8125rem",
    marginTop: "0.25rem",
  } as const,
  label: {
    display: "block",
    fontSize: "0.75rem",
    color: "#475569",
    marginBottom: "0.65rem",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem",
  } as const,
};

type ClientClaimsViewProps = {
  pageData: ClientClaimsPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function ClientClaimsView({ pageData, authStatus }: ClientClaimsViewProps) {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Client claims registry</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Durable workspace-scoped wellness and marketing claims monitored by Evidence Mind.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/client-claims">Client claims</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {!pageData.configured && pageData.listErrorMessage ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      {pageData.createFlash?.kind === "success" ? (
        <div style={styles.success}>Client claim created.</div>
      ) : null}

      {pageData.createFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.createFlash.message}</div>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Add client claim</h2>
        <form action={CLIENT_CLAIMS_CREATE_PATH} method="POST">
          <input type="hidden" name="return_query" value="" />
          <div style={styles.grid}>
            <label style={styles.label}>
              Workspace ID
              <input
                type="text"
                name="workspace_id"
                required
                defaultValue={pageData.defaultWorkspaceId}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Client claim ID
              <input type="text" name="client_claim_id" required style={styles.input} />
            </label>
            <label style={styles.label}>
              Claim source type
              <select name="claim_source_type" style={styles.input} defaultValue="">
                <option value="">—</option>
                {pageData.sourceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Claim source label
              <input type="text" name="claim_source_label" style={styles.input} />
            </label>
            <label style={styles.label}>
              Source URL
              <input type="url" name="source_url" style={styles.input} />
            </label>
            <label style={styles.label}>
              Claim family
              <input type="text" name="claim_family" style={styles.input} />
            </label>
            <label style={styles.label}>
              Risk level
              <select name="risk_level" style={styles.input} defaultValue="">
                <option value="">—</option>
                {pageData.riskLevelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Status
              <select name="status" style={styles.input} defaultValue="active" required>
                {pageData.statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ ...styles.label, marginTop: "0.75rem" }}>
            Claim text
            <textarea name="claim_text" required rows={3} style={styles.input} />
          </label>
          <button type="submit" style={styles.button}>
            Create claim
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Registered claims</h2>
        {pageData.listErrorMessage && pageData.configured ? (
          <div style={styles.error}>{pageData.listErrorMessage}</div>
        ) : null}
        {pageData.claims.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No client claims found for the current scope.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Workspace</th>
                <th style={styles.th}>Client claim ID</th>
                <th style={styles.th}>Claim text</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Family</th>
                <th style={styles.th}>Risk</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {pageData.claims.map((claim) => (
                <tr key={`${claim.workspace_id}:${claim.client_claim_id}`}>
                  <td style={styles.td}>{claim.workspace_id}</td>
                  <td style={styles.td}>{claim.client_claim_id}</td>
                  <td style={styles.td}>{claim.claim_text}</td>
                  <td style={styles.td}>
                    {claim.claim_source_type ?? "—"}
                    {claim.claim_source_label ? ` · ${claim.claim_source_label}` : ""}
                  </td>
                  <td style={styles.td}>{claim.claim_family ?? "—"}</td>
                  <td style={styles.td}>{claim.risk_level ?? "—"}</td>
                  <td style={styles.td}>
                    <form action={CLIENT_CLAIMS_STATUS_PATH} method="POST">
                      <input type="hidden" name="workspace_id" value={claim.workspace_id} />
                      <input type="hidden" name="client_claim_id" value={claim.client_claim_id} />
                      <input type="hidden" name="return_query" value="" />
                      <select
                        name="status"
                        defaultValue={claim.status}
                        style={{ ...styles.input, minWidth: "120px" }}
                      >
                        {pageData.statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <button type="submit" style={{ ...styles.button, marginTop: "0.35rem" }}>
                        Update
                      </button>
                    </form>
                  </td>
                  <td style={styles.td}>{formatTimestamp(claim.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

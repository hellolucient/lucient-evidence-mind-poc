import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { EvidenceBriefsPageData } from "@/lib/review/evidence-briefs-page";

import { ReviewQueueAuthPanel } from "../review-items/review-queue-auth-panel";

const GENERATE_DEMO_PATH = "/evidence-briefs/generate-demo";

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
};

type EvidenceBriefsViewProps = {
  pageData: EvidenceBriefsPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function claimFamilyDisplayName(
  claimFamily: string,
  profiles: EvidenceBriefsPageData["claimFamilyProfiles"]
): string {
  const profile = profiles.find((entry) => entry.claim_family === claimFamily);
  return profile?.display_name ?? claimFamily;
}

export function EvidenceBriefsView({ pageData, authStatus }: EvidenceBriefsViewProps) {
  const selectedBriefId = pageData.selectedBrief?.id ?? null;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Evidence change briefs</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Internal briefs generated when evidence changes affect mapped claim families and client
          claims.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/client-claims">Client claims</a>
          {" · "}
          <a href="/evidence-briefs">Evidence briefs</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {!pageData.configured && pageData.listErrorMessage ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      {pageData.generateFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.generateFlash.duplicate_skipped
            ? "An active brief already exists for this claim family — showing existing brief."
            : "Demo magnesium brief generated."}
        </div>
      ) : null}

      {pageData.generateFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.generateFlash.message}</div>
      ) : null}

      {pageData.listErrorMessage && pageData.configured ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Generate demo brief</h2>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "#64748b" }}>
          Creates a template brief for claim family magnesium_cortisol_stress using durable Phase 27
          mappings in workspace {pageData.defaultWorkspaceId}.
        </p>
        <form action={GENERATE_DEMO_PATH} method="post">
          <input type="hidden" name="workspace_id" value={pageData.defaultWorkspaceId} />
          <button type="submit" style={styles.button}>
            Generate demo magnesium brief
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Briefs</h2>
        {pageData.briefs.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            No evidence change briefs yet.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Claim family</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Risk</th>
                <th style={styles.th}>Affected claims</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {pageData.briefs.map((brief) => (
                <tr
                  key={brief.id}
                  style={brief.id === selectedBriefId ? styles.selectedRow : undefined}
                >
                  <td style={styles.td}>
                    <a href={`/evidence-briefs?brief_id=${encodeURIComponent(brief.id)}`}>
                      {brief.brief_title}
                    </a>
                  </td>
                  <td style={styles.td}>
                    {claimFamilyDisplayName(brief.claim_family, pageData.claimFamilyProfiles)}
                  </td>
                  <td style={styles.td}>{brief.status}</td>
                  <td style={styles.td}>{brief.risk_implication}</td>
                  <td style={styles.td}>{brief.affected_client_claims_count}</td>
                  <td style={styles.td}>{formatTimestamp(brief.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pageData.detailErrorMessage ? (
        <div style={styles.error}>{pageData.detailErrorMessage}</div>
      ) : null}

      {pageData.selectedBrief ? (
        <section style={styles.section}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Brief detail</h2>
          <div style={styles.detailLabel}>Summary</div>
          <div style={styles.detailValue}>{pageData.selectedBrief.brief_summary}</div>

          <div style={styles.detailLabel}>What changed</div>
          <div style={styles.detailValue}>{pageData.selectedBrief.what_changed}</div>

          <div style={styles.detailLabel}>Why it matters</div>
          <div style={styles.detailValue}>{pageData.selectedBrief.why_it_matters}</div>

          <div style={styles.detailLabel}>Evidence signal</div>
          <div style={styles.detailValue}>{pageData.selectedBrief.evidence_signal}</div>

          <div style={styles.detailLabel}>Risk implication</div>
          <div style={styles.detailValue}>{pageData.selectedBrief.risk_implication}</div>

          <div style={styles.detailLabel}>Recommended action</div>
          <div style={styles.detailValue}>{pageData.selectedBrief.recommended_action}</div>

          {pageData.selectedBrief.safer_wording ? (
            <>
              <div style={styles.detailLabel}>Safer wording</div>
              <div style={styles.detailValue}>{pageData.selectedBrief.safer_wording}</div>
            </>
          ) : null}

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1rem" }}>Affected client claim snapshots</h3>
          {pageData.selectedBriefClaims.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
              No affected client claims were mapped at generation time.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Client claim ID</th>
                  <th style={styles.th}>Claim text (snapshot)</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Mapping confidence</th>
                </tr>
              </thead>
              <tbody>
                {pageData.selectedBriefClaims.map((claim) => (
                  <tr key={`${claim.brief_id}:${claim.client_claim_id}`}>
                    <td style={styles.td}>{claim.client_claim_id}</td>
                    <td style={styles.td}>{claim.claim_text_snapshot}</td>
                    <td style={styles.td}>
                      {claim.claim_source_type ?? "—"}
                      {claim.claim_source_label ? ` (${claim.claim_source_label})` : ""}
                    </td>
                    <td style={styles.td}>{claim.mapping_confidence ?? "—"}</td>
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

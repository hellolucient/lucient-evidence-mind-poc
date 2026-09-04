import Link from "next/link";

import { OperatorToolsFooter } from "./check-statement-nav";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
    color: "#0f172a",
  } as const,
  inner: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "2rem 1.25rem 3rem",
  } as const,
  brand: {
    fontSize: "0.8125rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "#1d4ed8",
    textDecoration: "none",
  } as const,
  button: {
    display: "inline-block",
    marginTop: "1.25rem",
    padding: "0.7rem 1.15rem",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
  } as const,
  steps: {
    display: "grid",
    gap: "0.75rem",
    margin: "1.5rem 0 0",
    padding: 0,
    listStyle: "none",
  } as const,
  step: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "0.9rem 1rem",
  } as const,
  stepLabel: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: "0.2rem",
  } as const,
};

type AssessLandingProps = {
  showLoginLink: boolean;
};

export function AssessLanding({ showLoginLink }: AssessLandingProps) {
  return (
    <main style={styles.page}>
      <div style={styles.inner}>
        <Link href="/" style={styles.brand}>
          Lucient Evidence Mind
        </Link>
        <h1 style={{ margin: "1.25rem 0 0.5rem", fontSize: "2rem", lineHeight: 1.2 }}>
          Check a wellness statement
        </h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "1.05rem", lineHeight: 1.55 }}>
          Paste a claim or source copy. Lucient extracts the claims and runs an evidence assessment
          — without sending you through the operator console first.
        </p>
        <ol style={styles.steps}>
          <li style={styles.step}>
            <span style={styles.stepLabel}>1. Write or paste</span>
            A single claim, spa menu, product description, or website copy.
          </li>
          <li style={styles.step}>
            <span style={styles.stepLabel}>2. Extract claims</span>
            Known wellness claims are pulled out. If none match, the whole statement is assessed.
          </li>
          <li style={styles.step}>
            <span style={styles.stepLabel}>3. See the assessment</span>
            Evidence posture, risk, safer wording, and citations for each claim.
          </li>
        </ol>
        {showLoginLink ? (
          <>
            <Link href="/review-login" style={styles.button}>
              Sign in to check a statement
            </Link>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.85rem" }}>
              Approved operators only. This is still an internal POC, not a public client portal.
            </p>
          </>
        ) : (
          <p style={{ color: "#64748b", marginTop: "1.25rem" }}>
            Operator login is not configured in this environment. Contact your administrator for
            access.
          </p>
        )}
        <OperatorToolsFooter />
      </div>
    </main>
  );
}

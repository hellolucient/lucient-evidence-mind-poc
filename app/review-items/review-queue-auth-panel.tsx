import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";

const REVIEW_ITEMS_LOGOUT_PATH = "/review-items/logout";

type ReviewQueueAuthPanelProps = {
  authStatus: ReviewQueueAuthPanelData;
};

const styles = {
  panel: {
    border: "1px solid #dbeafe",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    background: "#f8fbff",
    fontSize: "0.8125rem",
    lineHeight: 1.5,
  } as const,
  row: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem 1.25rem",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  } as const,
  meta: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
  } as const,
  label: {
    color: "#64748b",
    fontSize: "0.6875rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } as const,
  value: {
    color: "#0f172a",
  } as const,
  logoutButton: {
    padding: "0.4rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
};

export function ReviewQueueAuthPanel({ authStatus }: ReviewQueueAuthPanelProps) {
  return (
    <section style={styles.panel} aria-label="Review queue access status">
      <div style={styles.row}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.5rem" }}>
          <div style={styles.meta}>
            <span style={styles.label}>Access mode</span>
            <span style={styles.value}>{authStatus.accessLabel}</span>
          </div>

          {authStatus.operatorEmail ? (
            <div style={styles.meta}>
              <span style={styles.label}>Operator</span>
              <span style={styles.value}>{authStatus.operatorEmail}</span>
            </div>
          ) : null}

          <div style={styles.meta}>
            <span style={styles.label}>Workspace scope</span>
            <span style={styles.value}>{authStatus.workspaceScopeLabel}</span>
          </div>
        </div>

        {authStatus.showLogout ? (
          <form action={REVIEW_ITEMS_LOGOUT_PATH} method="POST">
            <button type="submit" style={styles.logoutButton}>
              Log out
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

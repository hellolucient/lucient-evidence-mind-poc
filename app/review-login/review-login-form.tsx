const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "2rem",
    maxWidth: "480px",
    margin: "0 auto",
  } as const,
  input: {
    width: "100%",
    padding: "0.55rem 0.65rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.9375rem",
    marginTop: "0.35rem",
  } as const,
  button: {
    marginTop: "0.85rem",
    padding: "0.55rem 0.9rem",
    borderRadius: "4px",
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.9375rem",
  } as const,
  messageOk: {
    marginTop: "1rem",
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
  } as const,
  messageError: {
    marginTop: "1rem",
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
  } as const,
};

type ReviewLoginFormProps = {
  authError?: string | null;
  sendErrorMessage?: string | null;
  sendSuccessMessage?: string | null;
};

export function ReviewLoginForm({
  authError = null,
  sendErrorMessage = null,
  sendSuccessMessage = null,
}: ReviewLoginFormProps) {
  return (
    <main style={styles.page}>
      <h1 style={{ marginTop: 0 }}>Internal review queue login</h1>
      <p style={{ color: "#444" }}>
        Approved operators only. Enter your email to receive a magic link.
      </p>

      {authError ? <div style={styles.messageError}>{authError}</div> : null}
      {sendErrorMessage ? <div style={styles.messageError}>{sendErrorMessage}</div> : null}
      {sendSuccessMessage ? <div style={styles.messageOk}>{sendSuccessMessage}</div> : null}

      <form action="/review-login/send" method="post">
        <label style={{ display: "block", fontSize: "0.875rem" }}>
          Operator email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            style={styles.input}
            placeholder="operator@example.com"
          />
        </label>
        <button type="submit" style={styles.button}>
          Send magic link
        </button>
      </form>

      <p style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "#666" }}>
        Break-glass token access to <code>/review-items</code> remains available for internal
        admins when configured.
      </p>
    </main>
  );
}

export function ReviewItemsAccessBlocked() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "640px" }}>
      <h1 style={{ marginTop: 0 }}>Review queue access restricted</h1>
      <p>
        This internal review queue requires a valid server-configured access token.
      </p>
      <p style={{ color: "#444" }}>
        Open <code>/review-items?access_token=&lt;token&gt;</code> with the value from{" "}
        <code>INTERNAL_REVIEW_ACCESS_TOKEN</code>.
      </p>
    </main>
  );
}

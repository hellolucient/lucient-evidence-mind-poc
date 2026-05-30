type ReviewItemsAccessBlockedProps = {
  showLoginLink?: boolean;
};

export function ReviewItemsAccessBlocked({
  showLoginLink = false,
}: ReviewItemsAccessBlockedProps) {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "640px" }}>
      <h1 style={{ marginTop: 0 }}>Review queue access restricted</h1>
      <p>This internal review queue requires operator authentication.</p>
      {showLoginLink ? (
        <p style={{ color: "#444" }}>
          Approved operators can sign in at <a href="/review-login">/review-login</a>.
        </p>
      ) : null}
      <p style={{ color: "#444" }}>
        Break-glass access remains available via{" "}
        <code>/review-items?access_token=&lt;token&gt;</code> when{" "}
        <code>INTERNAL_REVIEW_ACCESS_TOKEN</code> is configured.
      </p>
    </main>
  );
}

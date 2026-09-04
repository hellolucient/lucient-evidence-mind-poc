import Link from "next/link";

const footerStyle = {
  marginTop: "2.5rem",
  paddingTop: "1.25rem",
  borderTop: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: "0.8125rem",
} as const;

const footerNavStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "0.35rem 0.85rem",
  marginTop: "0.65rem",
};

export function CheckStatementNavPrefix() {
  return (
    <>
      <Link href="/">Check a statement</Link>
      {" · "}
    </>
  );
}

export function OperatorToolsFooter() {
  return (
    <details style={footerStyle}>
      <summary style={{ cursor: "pointer", fontWeight: 600, color: "#475569" }}>
        Operator tools
      </summary>
      <p style={{ margin: "0.65rem 0 0", lineHeight: 1.5 }}>
        The watchtower, review queue, and Mind loop stay available for operators. Everyday claim
        checking starts on the home page.
      </p>
      <nav style={footerNavStyle} aria-label="Operator tools">
        <a href="/review-items">Review queue</a>
        <Link href="/claims">Claim registry</Link>
        <Link href="/claims/extract">Claim extraction</Link>
        <a href="/client-claims">Client claims</a>
        <a href="/source-intake">Source intake</a>
        <a href="/evidence-briefs">Evidence briefs</a>
        <a href="/mind-digests">Mind digests</a>
        <Link href="/operator/mind-loop">Mind loop</Link>
      </nav>
    </details>
  );
}

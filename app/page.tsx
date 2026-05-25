export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Lucient Evidence Mind POC</h1>
      <p>Minimal HTTPS API for Animoca Mind → EIE integration testing.</p>
      <ul>
        <li>
          <code>GET /api/health</code> — health check
        </li>
        <li>
          <code>POST /api/query</code> — evidence brief (requires Bearer API key)
        </li>
        <li>
          <code>POST /api/watch/check</code> — manual live watchlist check (requires Bearer API key)
        </li>
      </ul>
    </main>
  );
}

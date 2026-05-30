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
        <li>
          <code>GET /api/watch/run-due</code> — scheduled runner health check
        </li>
        <li>
          <code>POST /api/watch/run-due</code> — manual scheduled watchlist run (requires Bearer API key)
        </li>
        <li>
          <code>GET /api/watch/cron</code> — production Vercel Cron watchlist run (daily 21:00 UTC / 4:00 AM Bangkok)
        </li>
        <li>
          <code>GET /api/watch/runs</code> — latest watch run history (requires cron auth)
        </li>
        <li>
          <a href="/review-items">/review-items</a> — internal review queue console (Phase 19)
        </li>
      </ul>
    </main>
  );
}

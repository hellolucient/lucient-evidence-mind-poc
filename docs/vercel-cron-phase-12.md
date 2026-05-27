# Phase 12 — Vercel Cron scheduled watchlist monitoring

Phase 12 turns the Phase 11 durable watchlist runner into a production scheduled path via Vercel Cron, while keeping the manual `/api/watch/run-due` endpoint unchanged.

## Cron route

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/watch/cron` | Vercel Cron user-agent **or** `Authorization: Bearer CRON_SECRET` |

Scheduled execution uses:

- `force: false`
- `dryRun: false`
- `source: "vercel_cron"`

The route is a thin wrapper around the shared `buildRunDueResponse()` service in `lib/watch-run-due.ts`.

## Vercel Cron schedule

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/watch/cron",
      "schedule": "0 21 * * *"
    }
  ]
}
```

Vercel cron schedules are **UTC**. Production runs daily at:

| UTC | Local (Bangkok, UTC+7) |
|-----|-------------------------|
| `21:00` | **04:00** next calendar day |

Expression: `0 21 * * *` — 21:00 UTC every day, which is **4:00 AM Bangkok time**.

Per-topic `frequency` and `next_check_utc` still govern whether a watch is actually checked on each cron invocation (`force: false`).

**Schedule changes require redeploy.** Vercel reads `vercel.json` at deploy time; confirm under Project → Settings → Cron Jobs after each deploy.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CRON_SECRET` | Production (for manual smoke tests) | Bearer token for authorized manual cron calls |
| `NEXT_PUBLIC_SUPABASE_URL` | For durable persistence | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For durable persistence | Server-only service role key |

Vercel Cron itself is authorized by user-agent (`vercel-cron/1.0`) and does not require `CRON_SECRET`.

## Production smoke tests

Unauthorized (expect `401`):

```bash
curl -i https://lucient-evidence-mind-poc.vercel.app/api/watch/cron
```

Authorized manual run (expect `200` with Phase 12 payload):

```bash
curl -i \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://lucient-evidence-mind-poc.vercel.app/api/watch/cron
```

Simulate Vercel Cron locally or in CI:

```bash
curl -i \
  -H "User-Agent: vercel-cron/1.0" \
  http://localhost:3000/api/watch/cron
```

## Successful response shape

```json
{
  "ok": true,
  "phase": "12",
  "route": "/api/watch/cron",
  "trigger": "manual_authorized",
  "source": "vercel_cron",
  "durable": true,
  "store": "supabase",
  "adapter": "SupabaseWatchlistStore",
  "force": false,
  "dry_run": false,
  "checked_count": 0,
  "skipped_count": 1,
  "alerts_count": 0,
  "errors_count": 0,
  "started_at": "2026-05-27T02:00:00.000Z",
  "finished_at": "2026-05-27T02:00:01.234Z",
  "cron_secret_configured": true
}
```

`trigger` is `"vercel_cron"` when invoked by Vercel Cron, or `"manual_authorized"` when invoked with a valid Bearer secret.

## Unauthorized response shape

```json
{
  "ok": false,
  "error": "unauthorized",
  "phase": "12",
  "route": "/api/watch/cron",
  "cron_secret_configured": true,
  "message": "Unauthorized cron request."
}
```

If `CRON_SECRET` is missing and a manual Bearer call is attempted:

```json
{
  "ok": false,
  "error": "unauthorized",
  "phase": "12",
  "route": "/api/watch/cron",
  "cron_secret_configured": false,
  "message": "CRON_SECRET is not configured for manual cron authorization."
}
```

## Operator checklist

1. Generate a secret locally: `openssl rand -hex 32`
2. Add `CRON_SECRET` in Vercel → Settings → Environment Variables → Production
3. Redeploy production so env vars and `vercel.json` cron config take effect
4. Confirm Vercel detected the cron job from `vercel.json` (Project → Settings → Cron Jobs)
5. Run smoke tests:
   - Unauthorized call → `401`
   - Authorized call → `200`, `phase: 12`, `durable: true`, `store: supabase`
   - Repeat authorized call → no duplicate alert when PMIDs already known
   - When `next_check_utc` is in the future → watches skipped (`force: false`)

## Limitations

- Production cron is daily at 21:00 UTC (4:00 AM Bangkok); per-topic `frequency` still governs `next_check_utc` skip logic.
- `/api/watch/run-due` remains the manual/debug path protected by `EIE_TOOL_API_KEY`.
- Duplicate-alert suppression and durable state depend on Supabase being configured in production.

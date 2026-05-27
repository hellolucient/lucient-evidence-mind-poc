# Phase 13 — Durable watch run logging

Phase 13 adds an auditable operational history for every watchlist execution in Supabase `public.watch_runs`.

## Purpose

Phase 12 proved autonomous scheduled monitoring via Vercel Cron. Phase 13 records **each run** — timing, trigger, counts, store adapter, and outcome — so Evidence Mind behaves more like an evidence watchtower with durable run history.

## Supabase table: `public.watch_runs`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` PK | Run record ID (`watch_run_id` in API responses) |
| `started_at` | `timestamptz` | Run start |
| `finished_at` | `timestamptz` | Run finish |
| `trigger` | `text` | e.g. `vercel_cron`, `manual_authorized`, `manual_api` |
| `source` | `text` | e.g. `vercel_cron`, `run_due` |
| `phase` | `text` | Response phase (`13`) |
| `durable` | `boolean` | Whether watchlist store was durable |
| `store` | `text` | e.g. `supabase`, `in_memory` |
| `adapter` | `text` | e.g. `SupabaseWatchlistStore` |
| `force` | `boolean` | Force flag used |
| `dry_run` | `boolean` | Dry run flag used |
| `checked_count` | `integer` | Watches executed |
| `skipped_count` | `integer` | Watches skipped (e.g. `next_check_utc`) |
| `alerts_count` | `integer` | Material alerts emitted |
| `errors_count` | `integer` | Topic-level errors |
| `status` | `text` | `success` \| `error` |
| `error_message` | `text` nullable | Safe error summary (no secrets) |
| `response_summary` | `jsonb` nullable | Compact run summary |
| `created_at` | `timestamptz` | Insert time |

Indexes: `started_at DESC`, `status`, `trigger`.

## Migration

**You must run the migration manually** in Supabase unless you use Supabase CLI migrations locally.

SQL file:

`supabase/migrations/20260527130000_create_watch_runs.sql`

Supabase Dashboard → SQL Editor → paste and run that file.

## What gets logged

| Route | Logged? | Trigger | Notes |
|-------|---------|---------|-------|
| `GET /api/watch/cron` | Yes (authorized only) | `vercel_cron` or `manual_authorized` | Always `force=false`, `dry_run=false` |
| `POST /api/watch/run-due` | Yes | `manual_api` | Skipped when `dry_run=true` |
| `POST /api/watch/run-due` (`debug_only`) | No | — | Unchanged Phase 11 debug |
| Unauthorized `GET /api/watch/cron` | No | — | Returns `401` before run/logging |

Logging failures do **not** fail the watch run. Responses include `watch_run_logged: false` when insert fails.

## API diagnostics (Phase 13)

Successful `/api/watch/cron` response adds:

```json
{
  "phase": "13",
  "watch_run_logged": true,
  "watch_run_id": "uuid-here"
}
```

All Phase 12 fields remain (`trigger`, counts, `durable`, `store`, `adapter`, etc.).

`POST /api/watch/run-due` (non-dry-run) also returns optional `watch_run_logged` and `watch_run_id`.

## Read recent runs

Protected endpoint (same auth as cron):

```bash
curl -s \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://lucient-evidence-mind-poc.vercel.app/api/watch/runs?limit=10"
```

## Manual verification SQL

After an authorized cron run:

```sql
SELECT
  id,
  started_at,
  finished_at,
  trigger,
  source,
  status,
  checked_count,
  skipped_count,
  alerts_count,
  errors_count,
  store,
  adapter,
  force,
  dry_run
FROM public.watch_runs
ORDER BY started_at DESC
LIMIT 10;
```

## Environment variables

No new Vercel env vars. Uses existing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Key files

| File | Role |
|------|------|
| `lib/watch/watch-run-logger.ts` | Insert/list run records |
| `lib/watch-cron.ts` | Cron run + logging orchestration |
| `app/api/watch/cron/route.ts` | Cron HTTP handler |
| `app/api/watch/run-due/route.ts` | Manual run + logging |
| `app/api/watch/runs/route.ts` | Protected run history read |
| `supabase/migrations/20260527130000_create_watch_runs.sql` | Table + indexes |

## Limitations

- Run logging requires Supabase credentials and the `watch_runs` table migration.
- `dry_run=true` never writes a row.
- Logging insert errors are swallowed safely; the watch run still completes.
- No client workspace mapping or alert delivery — operational audit trail only.

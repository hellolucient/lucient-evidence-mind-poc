# Phase 11 — Supabase watchlist store adapter

Phase 11 adds durable watchlist persistence via Supabase while preserving the Phase 10.5 `WatchlistStore` interface.

## Purpose

Phase 10.5 proved the store adapter pattern with in-memory state. Phase 11 activates **Supabase-backed persistence** when credentials are configured, so:

- Baseline PMIDs survive serverless cold starts
- `next_check_utc` scheduling is durable
- `last_alert` and `last_heartbeat` are auditable across deploys

## Environment variables

| Variable | Required for Supabase | Exposure |
|----------|----------------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public URL (safe for client; used server-side here) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server-only** — never expose to browser or API responses |

Set both in Vercel project settings for production. If either is missing, the app falls back to `InMemoryWatchlistStore`.

## Table used

**Schema:** `public.watchlist_topics`

Fields mapped from `WatchTopicState`:

- Identity: `watch_topic_id`, `claim_family`, `label`, `active`, `frequency`
- Schedule: `last_checked_utc`, `next_check_utc`
- Baseline: `known_pmids`, `baseline_evidence_grade`, `baseline_policy`
- Query: `query_mode`, `raw_query`, `structured_query`, `query_hash`, `query_version`
- Outcomes: `last_alert`, `last_heartbeat` (JSONB)
- Audit: `created_at`, `updated_at`

## Adapter selection

`resolveWatchlistStore()` in `engine/watchlist/store-selector.ts`:

1. If Supabase env vars are missing → in-memory + `fallback_reason`
2. If env vars present → probe `watchlist_topics` with service role
3. If probe succeeds → `SupabaseWatchlistStore`
4. If probe fails → in-memory + `fallback_reason` (no crash)

Selection is cached for the serverless instance lifetime.

## Fallback behavior

On Supabase failure the endpoint still returns valid JSON. `persistence_status.fallback_reason` and `env_debug.fallback_reason` explain why in-memory was used.

Debug check:

```bash
curl -X POST https://<deployment>/api/watch/run-due \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"debug_only":true}'
```

Expected when Supabase is active:

```json
{
  "status": "post_ok",
  "phase": "11",
  "persistence_status": {
    "durable": true,
    "store": "supabase",
    "adapter": "SupabaseWatchlistStore",
    "state_survives_cold_start": true,
    "suitable_for_production_monitoring": true
  },
  "env_debug": {
    "has_supabase_url": true,
    "has_supabase_service_role_key": true,
    "supabase_url_host": "your-project.supabase.co",
    "selected_store": "supabase",
    "fallback_reason": null
  }
}
```

## Seed behavior

If `watchlist_topics` is empty, `seedDefaultWatchTopicsIfEmpty()` inserts:

- `watch_topic_id`: `watch-magnesium-cortisol`
- Structured PubMed query from Phase 9.5
- Empty `known_pmids`
- Baseline policy for magnesium/cortisol claim family

Existing rows are never duplicated.

## Dry run vs real run

| Mode | Supabase behavior |
|------|-------------------|
| `dry_run: true` | Read topics, run PubMed check, **no write**; `state_update.updated = false` |
| `dry_run: false` | Merge PMIDs, update schedule, store alert/heartbeat; `state_update.updated = true` |

## Repeat-run durable baseline proof

1. `POST` with `force=true`, `dry_run=false` — PMIDs merged into `known_pmids`
2. Wait for cold start or new invocation
3. `POST` again — `previous_known_pmids_count > 0`, `new_pmids=[]`, heartbeat emitted

This proves durable baseline when `selected_store=supabase`.

## Query hash monitoring drift

If stored `query_hash` ≠ computed hash:

- `query_strategy_changed: true`
- `previous_query_hash`, `current_query_hash`
- Recommendation: *"Reset or re-baseline this watch before interpreting deltas."*

Phase 11 warns only — no reset workflow.

## Privacy boundary

**May store in Supabase:**

- Watch topic metadata, claim family, PMIDs, query strategy
- Baseline policy and evidence grade
- Last alert and heartbeat metadata (no client wording)

**Must NOT store:**

- Client exact claim wording
- Client IDs
- Brand confidential copy
- Private legal notes
- Commercial strategy

## Key files

| File | Role |
|------|------|
| `engine/watchlist/supabase-client.ts` | Server-side Supabase client |
| `engine/watchlist/supabase-watchlist-store.ts` | Durable adapter |
| `engine/watchlist/store-selector.ts` | Adapter selection + fallback |
| `engine/watchlist/in-memory-watchlist-store.ts` | Fallback adapter |
| `app/api/watch/run-due/route.ts` | HTTP handler + `debug_only` |

## Limitations

- No client workspace mapping
- No non-PubMed regulatory sources
- No query re-baseline workflow
- Service role key must be protected in Vercel env only

## Next step (Phase 12 — implemented)

Production autonomous monitoring uses **Vercel Cron** → `GET /api/watch/cron` daily at **21:00 UTC** (**4:00 AM Bangkok**), configured in `vercel.json` as `0 21 * * *`. Manual/debug runs remain on `POST /api/watch/run-due`. See [vercel-cron-phase-12.md](./vercel-cron-phase-12.md).

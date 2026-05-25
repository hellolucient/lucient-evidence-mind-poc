# Phase 10.5 — Watchlist persistence readiness + store adapter

> **Superseded for persistence by Phase 11.** Durable storage is now implemented via `SupabaseWatchlistStore`. This doc describes the adapter pattern introduced in 10.5, which remains the architecture for all store implementations.

Phase 10 proved the scheduled-watch runner pattern using in-memory state on Vercel. Phase 10.5 introduced the `WatchlistStore` interface so durable persistence could be added without changing route logic. Phase 11 activated Supabase.

## Why in-memory persistence alone is insufficient

The in-memory fallback (`InMemoryWatchlistStore`) survives only for the lifetime of a warm serverless instance:

- Cold starts reset baselines — the same PMIDs may alert again
- `next_check_utc` scheduling is unreliable across invocations
- No audit trail of historical alerts and heartbeats across deploys

This is acceptable for **scheduler simulation** and as a **fallback**, but not for production autonomous monitoring.

## What the store interface does

`engine/watchlist/watchlist-store.ts` defines `WatchlistStore`:

| Method | Purpose |
|--------|---------|
| `listWatchTopics()` | Return all watch topics |
| `getWatchTopic(id)` | Fetch one topic by ID |
| `saveWatchTopic(topic)` | Insert or replace a full topic record |
| `updateWatchTopicState(id, patch)` | Partial update after a check |
| `seedDefaultWatchTopicsIfEmpty()` | Seed POC default topic if store is empty |
| `getStoreStatus()` | Report durability and adapter metadata |

`/api/watch/run-due` uses `resolveWatchlistStore()` (Phase 11) to select the active adapter.

## Adapters

| Adapter | When active | Durable |
|---------|-------------|---------|
| `SupabaseWatchlistStore` | Supabase env vars set + table reachable | Yes |
| `InMemoryWatchlistStore` | Fallback or env vars missing | No |

See [supabase-watchlist-store-phase-11.md](./supabase-watchlist-store-phase-11.md) for Phase 11 behavior.

The file `engine/watchlist/durable-watchlist-store.placeholder.ts` documents other future providers (Vercel KV, direct Postgres) — **not imported** in production code.

## Required durable fields

Implemented schema: [future-watchlist-persistence-schema.md](./future-watchlist-persistence-schema.md) — table `public.watchlist_topics`.

## Query hash / monitoring drift

`engine/watchlist/query-hash.ts` computes a stable 16-char **FNV-1a** hash from:

- `watch_topic_id`
- `query_mode`
- `raw_query`
- `structured_query`
- `query_version`

If stored `query_hash` differs from the currently computed hash, the response includes `query_strategy_changed: true` and a re-baseline recommendation. No reset workflow yet.

## Dry run vs real run

| Flag | Store behavior |
|------|----------------|
| `dry_run: true` | Read topics, run PubMed check, return preview; `state_update.updated = false`; no store mutation |
| `dry_run: false` | After successful check, `updateWatchTopicState()` merges PMIDs, updates schedule, stores alert or heartbeat |

## Privacy boundary

**May store:**

- Watch topic metadata, claim family, PMIDs, query strategy
- Policy state, last alert and heartbeat metadata

**Must NOT store:**

- Client exact wording, client IDs, brand confidential copy, private legal notes, commercial strategy

## Endpoint: `POST /api/watch/run-due`

Responses include `persistence_status` and (when not durable) `persistence_warning`. Use `debug_only: true` to inspect adapter selection without running PubMed.

`GET /api/watch/run-due` returns health JSON with `"phase": "11"`.

## Key files

| File | Role |
|------|------|
| `engine/watchlist/watchlist-store.ts` | Interface + types |
| `engine/watchlist/in-memory-watchlist-store.ts` | Fallback adapter |
| `engine/watchlist/supabase-watchlist-store.ts` | Durable adapter (Phase 11) |
| `engine/watchlist/store-selector.ts` | `resolveWatchlistStore()` |
| `engine/watchlist/query-hash.ts` | Query hash + drift detection |
| `lib/watch-run-due.ts` | Scheduled run orchestration |
| `app/api/watch/run-due/route.ts` | HTTP handler |

## Limitations

- No Vercel cron yet
- No client workspace mapping
- No non-PubMed regulatory sources
- Query hash drift warns but does not auto-rebaseline

## Next step (post Phase 11)

Configure **Vercel cron** or external scheduled trigger for autonomous `POST /api/watch/run-due` with `force=false`.

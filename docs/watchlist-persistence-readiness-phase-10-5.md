# Phase 10.5 — Watchlist persistence readiness + store adapter

Phase 10 proved the scheduled-watch runner pattern using in-memory state on Vercel. Phase 10.5 prepares the codebase for durable persistence **without** configuring an external store yet.

## Why Phase 10 in-memory persistence is insufficient

Phase 10 (and the Vercel hotfix) use a module-level in-memory map:

- State survives only for the lifetime of a warm serverless instance.
- Cold starts reset baselines — the same PMIDs may alert again.
- `next_check_utc` scheduling is unreliable across invocations.
- No audit trail of historical alerts or heartbeats across deploys.

This is acceptable for **scheduler simulation** but not for production autonomous monitoring.

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

`/api/watch/run-due` uses `getWatchlistStore()` — currently the in-memory adapter only.

## Current in-memory adapter

`engine/watchlist/in-memory-watchlist-store.ts` (`InMemoryWatchlistStore`):

- Seeds `watch-magnesium-cortisol` on first access.
- Mutates state in place for non-dry-run checks.
- Returns `persistence_status.store = "in_memory"`.
- Does **not** write to the filesystem.

## Why no external DB is added yet

This POC deliberately avoids:

- Supabase setup and credentials
- Vercel KV / Redis provisioning
- Postgres migrations
- New environment variables for persistence

Phase 10.5 only introduces **adapter boundaries** so a durable store can be swapped in later with minimal route changes.

## Future durable store options

See `engine/watchlist/durable-watchlist-store.placeholder.ts` (stub only, not imported):

- **Supabase** — Postgres rows with RLS; good for relational queries and audit history
- **Vercel KV / Redis** — JSON documents keyed by `watch_topic_id`; fast reads for scheduler
- **Postgres** — direct or via ORM; same schema as Supabase without Supabase-specific APIs
- **Other** — DynamoDB, PlanetScale, etc.

Recommended next phase: **choose one provider**, implement `WatchlistStore`, wire via `getWatchlistStore()` factory.

## Required durable fields

Full schema: [future-watchlist-persistence-schema.md](./future-watchlist-persistence-schema.md)

Minimum per watch topic:

- Identity: `watch_topic_id`, `claim_family`, `label`, `active`, `frequency`
- Schedule: `last_checked_utc`, `next_check_utc`
- Baseline: `known_pmids`, `baseline_evidence_grade`, `baseline_policy`
- Query: `query_mode`, `raw_query`, `structured_query`, `query_hash`, `query_version`
- Outcomes: `last_alert`, `last_heartbeat`
- Audit: `created_at`, `updated_at`

## Query hash / monitoring drift

`engine/watchlist/query-hash.ts` computes a stable 16-char SHA-256 prefix from:

- `watch_topic_id`
- `query_mode`
- `raw_query`
- `structured_query`
- `query_version`

If stored `query_hash` differs from the currently computed hash:

- Response includes `query_strategy_changed: true`
- `previous_query_hash` and `current_query_hash`
- Recommendation: *"Reset or re-baseline this watch before interpreting deltas."*

Phase 10.5 warns only — no reset workflow yet.

## Dry run vs real run

| Flag | Store behavior |
|------|----------------|
| `dry_run: true` | Read topics, run PubMed check, return preview; `state_update.updated = false`; no store mutation |
| `dry_run: false` | After successful check, `updateWatchTopicState()` merges PMIDs, updates schedule, stores alert or heartbeat |

## Alert storage requirements

When `evidence_change_alert.alert_required = true`, store:

- `alert_type`, `alert_summary`, `generated_at`
- `contributing_sources_to_delta`
- `evidence_delta_change_level`, `delta_confidence`

Clear `last_heartbeat` when a material alert is stored.

## Heartbeat storage requirements

When no material alert:

- `last_heartbeat.emitted = true`
- `last_heartbeat.no_material_change = true`
- Summary: *"Watch checked successfully. No material evidence change requiring human review."*

## Privacy boundary

**May store:**

- Watch topic metadata, claim family, PMIDs, query strategy
- Policy state (`baseline_policy`, `baseline_evidence_grade`)
- Source metadata references (PMIDs, titles in alert attribution)
- Last alert and last heartbeat summaries

**Must NOT store:**

- Client exact wording
- Client IDs
- Brand confidential copy
- Private legal notes
- Commercial strategy

## Endpoint: `POST /api/watch/run-due`

Every successful response includes:

```json
"persistence_status": {
  "durable": false,
  "store": "in_memory",
  "adapter": "InMemoryWatchlistStore",
  "state_survives_cold_start": false,
  "suitable_for_production_monitoring": false,
  "next_step": "Select and configure a durable store before real autonomous monitoring."
},
"persistence_warning": {
  "durable": false,
  "reason": "Current POC store is in-memory only. Vercel serverless memory may reset between invocations.",
  "next_step": "Choose durable persistence provider in the next phase."
}
```

`GET /api/watch/run-due` returns health JSON with `"phase": "10.5"`.

## Manual test checklist

| Test | Request | Expected |
|------|---------|----------|
| A | `GET /api/watch/run-due` | HTTP 200, `status: "ok"`, `phase: "10.5"` |
| B | `POST` `force=true`, `dry_run=true` | `state_update.updated=false`, `persistence_status.store=in_memory` |
| C | `POST` `force=true`, `dry_run=false` | `state_update.updated=true`, attribution preserved |
| D | Immediate second `POST` `dry_run=false` | Heartbeat if memory warm; or baseline reset if cold start |
| E | `POST` `force=false` | Skipped if `next_check_utc` in future (when memory persists) |

## Key files

| File | Role |
|------|------|
| `engine/watchlist/watchlist-store.ts` | Interface + types |
| `engine/watchlist/in-memory-watchlist-store.ts` | Current POC adapter |
| `engine/watchlist/durable-watchlist-store.placeholder.ts` | Future adapter stub (not imported) |
| `engine/watchlist/query-hash.ts` | Query hash + drift detection |
| `engine/watchlist/index.ts` | `getWatchlistStore()` factory |
| `lib/watch-run-due.ts` | Scheduled run orchestration |
| `app/api/watch/run-due/route.ts` | HTTP handler |

## Limitations

- In-memory only; no durable persistence configured
- No real cron
- No client workspace mapping
- No non-PubMed regulatory sources
- Query hash drift warns but does not auto-rebaseline

## Recommended next phase

Choose and configure a durable provider, implement `WatchlistStore`, update `getWatchlistStore()` to select by environment variable, and add integration tests against the durable adapter.

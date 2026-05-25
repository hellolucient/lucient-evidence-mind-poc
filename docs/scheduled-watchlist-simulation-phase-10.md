# Scheduled watchlist simulation (Phase 10)

> **Current persistence (Phase 11):** Watchlist state is stored via `WatchlistStore` — **Supabase** (`public.watchlist_topics`) when env vars are configured, otherwise **in-memory** fallback. The original Phase 10 JSON file approach was removed after the Vercel read-only filesystem fix (Phase 10 hotfix → 10.5 adapter → 11 Supabase). See [supabase-watchlist-store-phase-11.md](./supabase-watchlist-store-phase-11.md).

Phase 10 introduced the **scheduler-style endpoint** and baseline update pattern. Phases 9–9.6 proved manual live checks, structured queries, context gates, and delta attribution. Phase 10 demonstrates:

1. Remembering the last known PMID baseline
2. Remembering query strategy and query hash
3. Running repeatable watch checks against stored state
4. Updating baseline after each check
5. Returning **heartbeat** (no material change) or **alert** (human_review / monitor)

## Purpose

Show that the Evidence Mind can run scheduled-style watch checks with **persistent baseline state**, not just one-off manual `/api/watch/check` calls.

## State storage (historical → current)

| Phase | Storage |
|-------|---------|
| 10 (initial) | `data/watchlist-state.json` — removed (Vercel read-only FS) |
| 10 hotfix / 10.5 | In-memory `InMemoryWatchlistStore` |
| **11 (current)** | Supabase `watchlist_topics` with in-memory fallback |

Seeded topic: `watch-magnesium-cortisol` (see [watchlist-persistence-readiness-phase-10-5.md](./watchlist-persistence-readiness-phase-10-5.md)).

### Helper functions

| Function | Role |
|----------|------|
| `resolveWatchlistStore()` | Select Supabase or in-memory adapter (Phase 11) |
| `getDueWatchTopics()` | Select due topics by `next_check_utc` |
| `calculateNextCheckUtc()` | weekly (+7d) / monthly (+30d) / quarterly (+90d) |
| `hashQueryStrategy()` | FNV-1a hash for monitoring drift |
| `runWatchTopicCheck()` | Reuses `buildWatchCheckResponse()` |

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/watch/run-due` | None — health JSON (`phase: "11"`) |
| `POST` | `/api/watch/run-due` | `Authorization: Bearer <EIE_TOOL_API_KEY>` |

### Request

```json
{
  "workspace_id": "demo-phase-10",
  "force": true,
  "dry_run": false,
  "max_watches": 5,
  "context": "Phase 10 scheduled watchlist simulation. No real client data.",
  "debug_only": false
}
```

| Field | Default | Behavior |
|-------|---------|----------|
| `force` | `false` | Run even if `next_check_utc` is in the future |
| `dry_run` | `false` | Preview only; do not persist state |
| `max_watches` | `5` | Cap topics processed per run |
| `debug_only` | `false` | Return persistence adapter info only; no PubMed check |

### Rules

1. `force=true` — run all active watches regardless of schedule
2. `force=false` — only topics where `next_check_utc` is null or `<= now`
3. `dry_run=true` — no store update (`state_update.updated = false`)
4. `dry_run=false` — update `known_pmids`, `last_checked_utc`, `next_check_utc`, `last_alert` or `last_heartbeat`
5. Internally calls shared `buildWatchCheckResponse()` — no duplicated check logic

## Heartbeat behavior

When `alert_required` is false (no material change):

```json
{
  "heartbeat": {
    "emitted": true,
    "summary": "Watch checked successfully. No material evidence change requiring human review.",
    "no_material_change": true
  }
}
```

Stored via `updateWatchTopicState()` as `last_heartbeat`.

## Alert behavior

When `alert_required` is true:

- `heartbeat.emitted = false`
- `last_alert` stores alert type, summary, contributing sources, change level, confidence

## Baseline update

After successful non-dry-run check:

- Merge all `found_pmids` from search into `known_pmids`
- Second run with same search should find **no new PMIDs** → heartbeat, no duplicate alert
- With Phase 11 Supabase active, baseline survives serverless cold starts

## Query hash / monitoring drift

Each topic stores `query_hash` and `query_version` (e.g. `watch-magnesium-cortisol@v1`).

If computed hash differs from stored hash:

```json
{
  "query_strategy_changed": true,
  "previous_query_hash": "...",
  "current_query_hash": "...",
  "query_strategy_change_recommendation": "Reset or re-baseline this watch before interpreting deltas."
}
```

No automatic re-baselining — warning only.

## Privacy boundary

| Runner receives | Runner does not receive |
|-----------------|-------------------------|
| Watch topic, claim family | Client exact wording |
| Query strategy, baseline PMIDs | Client IDs |
| Source metadata, appraisal | Brand copy, legal notes |

`app_maps_back_to_clients: true` — mapping stays in the Lucient app.

## Example curl

```bash
# Health
curl -s "$BASE_URL/api/watch/run-due"

# Persistence debug (Supabase vs in-memory)
curl -s -X POST "$BASE_URL/api/watch/run-due" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -d '{"debug_only":true}'

# Dry run
curl -s -X POST "$BASE_URL/api/watch/run-due" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -d '{"workspace_id":"demo-phase-10","force":true,"dry_run":true}'

# Real run (persists to Supabase or in-memory)
curl -s -X POST "$BASE_URL/api/watch/run-due" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -d '{"workspace_id":"demo-phase-10","force":true,"dry_run":false}'
```

## Limitations

- No real cron yet — external scheduler must call `/api/watch/run-due`
- Single seeded watch topic in POC
- No client workspace mapping
- No regulatory non-PubMed sources yet
- Demo/synthetic data only
- In-memory fallback resets on cold start if Supabase is unavailable

## Future cron path

1. Configure **Vercel cron** or external scheduler hitting `POST /api/watch/run-due` with `force=false`
2. App maps alerts/heartbeats to private workspaces
3. Human review merges approved PMIDs into baseline via app UI

## Related docs

- [supabase-watchlist-store-phase-11.md](./supabase-watchlist-store-phase-11.md) — current durable persistence
- [watch-check-endpoint.md](./watch-check-endpoint.md) — Phase 9 manual check
- [delta-attribution-alert-auditability.md](./delta-attribution-alert-auditability.md) — Phase 9.6 attribution
- [contextual-integrity-query-refinement.md](./contextual-integrity-query-refinement.md) — Phase 9.5 structured queries

## Source files

| File | Role |
|------|------|
| `engine/watchlist/store-selector.ts` | Adapter selection (Supabase / in-memory) |
| `lib/watch-run-due.ts` | Scheduled run orchestration |
| `app/api/watch/run-due/route.ts` | HTTP handler |

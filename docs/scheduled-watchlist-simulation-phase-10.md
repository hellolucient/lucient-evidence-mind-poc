# Scheduled watchlist simulation (Phase 10)

Phase 10 adds **lightweight JSON persistence** for watchlist baselines and a **scheduler-style endpoint** that processes due watch topics without building a full production cron.

Phases 9–9.6 proved manual live checks, structured queries, context gates, and delta attribution. Phase 10 demonstrates:

1. Remembering the last known PMID baseline
2. Remembering query strategy and query hash
3. Running repeatable watch checks against stored state
4. Updating baseline after each check
5. Returning **heartbeat** (no material change) or **alert** (human_review / monitor)

## Purpose

Show that the Evidence Mind can run scheduled-style watch checks with **persistent baseline state**, not just one-off manual `/api/watch/check` calls.

## State file

**Path:** `data/watchlist-state.json` (created on first run if missing; gitignored)

Seeded with one active topic: `watch-magnesium-cortisol`.

```json
{
  "watch_topics": [
    {
      "watch_topic_id": "watch-magnesium-cortisol",
      "claim_family": "magnesium_cortisol_stress",
      "label": "Magnesium and cortisol/stress physiology",
      "active": true,
      "frequency": "weekly",
      "last_checked_utc": null,
      "next_check_utc": null,
      "baseline": {
        "known_pmids": [],
        "baseline_evidence_grade": "low",
        "baseline_policy": "Avoid direct cortisol-regulation claims...",
        "baseline_created_utc": null
      },
      "query_strategy": {
        "mode": "structured",
        "raw_query": "Magnesium for cortisol regulation",
        "structured_query": "...",
        "query_hash": "abc123...",
        "query_version": "watch-magnesium-cortisol@v1"
      },
      "last_alert": null,
      "last_heartbeat": null
    }
  ]
}
```

### Helper functions

| Function | Role |
|----------|------|
| `loadWatchlistState()` | Read or seed state file |
| `saveWatchlistState()` | Persist state after non-dry-run |
| `getDueWatchTopics()` | Select due topics by `next_check_utc` |
| `calculateNextCheckUtc()` | weekly (+7d) / monthly (+30d) / quarterly (+90d) |
| `hashQueryStrategy()` | SHA-256 hash for monitoring drift |
| `runWatchTopicCheck()` | Reuses `buildWatchCheckResponse()` |

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/watch/run-due` | `Authorization: Bearer <EIE_TOOL_API_KEY>` |

### Request

```json
{
  "workspace_id": "demo-phase-10",
  "force": true,
  "dry_run": false,
  "max_watches": 5,
  "context": "Phase 10 scheduled watchlist simulation. No real client data."
}
```

| Field | Default | Behavior |
|-------|---------|----------|
| `force` | `false` | Run even if `next_check_utc` is in the future |
| `dry_run` | `false` | Preview only; do not write state file |
| `max_watches` | `5` | Cap topics processed per run |

### Rules

1. `force=true` — run all active watches regardless of schedule
2. `force=false` — only topics where `next_check_utc` is null or `<= now`
3. `dry_run=true` — no state file update
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

Stored in state as `last_heartbeat`.

## Alert behavior

When `alert_required` is true:

- `heartbeat.emitted = false`
- `state.last_alert` stores alert type, summary, contributing sources, change level, confidence

## Baseline update

After successful non-dry-run check:

- Merge all `found_pmids` from search into `baseline.known_pmids`
- Second run with same search should find **no new PMIDs** → heartbeat, no duplicate alert

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

No automatic re-baselining in Phase 10 — warning only.

## Privacy boundary

| Runner receives | Runner does not receive |
|-----------------|-------------------------|
| Watch topic, claim family | Client exact wording |
| Query strategy, baseline PMIDs | Client IDs |
| Source metadata, appraisal | Brand copy, legal notes |

`app_maps_back_to_clients: true` — mapping stays in the Lucient app.

## Example curl

```bash
# Dry run
curl -s -X POST "$BASE_URL/api/watch/run-due" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -d '{"workspace_id":"demo-phase-10","force":true,"dry_run":true}'

# Real run (updates state)
curl -s -X POST "$BASE_URL/api/watch/run-due" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -d '{"workspace_id":"demo-phase-10","force":true,"dry_run":false}'

# Second run — should heartbeat with no new PMIDs
curl -s -X POST "$BASE_URL/api/watch/run-due" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EIE_TOOL_API_KEY" \
  -d '{"workspace_id":"demo-phase-10","force":true,"dry_run":false}'
```

## Limitations

- JSON file persistence only — **not durable on Vercel serverless** (ephemeral filesystem)
- No real cron — external scheduler must call `/api/watch/run-due`
- Single seeded watch topic in POC
- No client workspace mapping
- No regulatory non-PubMed sources yet
- Demo/synthetic data only

## Future cron path

1. Deploy worker or Vercel cron hitting `POST /api/watch/run-due` with `force=false`
2. Replace JSON file with durable store when ready (not Supabase in this POC unless trivial)
3. App maps alerts/heartbeats to private workspaces
4. Human review merges approved PMIDs into baseline via app UI

## Related docs

- [watch-check-endpoint.md](./watch-check-endpoint.md) — Phase 9 manual check
- [delta-attribution-alert-auditability.md](./delta-attribution-alert-auditability.md) — Phase 9.6 attribution
- [contextual-integrity-query-refinement.md](./contextual-integrity-query-refinement.md) — Phase 9.5 structured queries

## Source files

| File | Role |
|------|------|
| `lib/watchlist-state.ts` | State load/save, hashing, due logic |
| `lib/watch-run-due.ts` | Scheduled run orchestration |
| `app/api/watch/run-due/route.ts` | HTTP handler |
| `data/watchlist-state.json` | Runtime state (gitignored) |

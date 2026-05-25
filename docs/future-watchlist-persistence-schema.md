# Watchlist persistence schema

Schema reference for the durable `WatchlistStore` adapter. **Implemented in Phase 11** as `public.watchlist_topics` in Supabase.

## Table: `public.watchlist_topics`

| Field | Type | Description |
|-------|------|-------------|
| `watch_topic_id` | `text` PK | Stable ID, e.g. `watch-magnesium-cortisol` |
| `claim_family` | `text` | Abstract claim family, e.g. `magnesium_cortisol_stress` |
| `label` | `text` | Human-readable watch label |
| `active` | `boolean` | Whether scheduled checks run |
| `frequency` | `text` | `weekly` \| `monthly` \| `quarterly` |
| `last_checked_utc` | `timestamptz` nullable | Last successful check timestamp |
| `next_check_utc` | `timestamptz` nullable | Next scheduled check |
| `known_pmids` | `text[]` | Baseline PMIDs already seen |
| `baseline_evidence_grade` | `text` | e.g. `low`, `moderate` |
| `baseline_policy` | `text` | Claim policy guidance (not client copy) |
| `query_mode` | `text` | `structured` \| `raw` |
| `raw_query` | `text` | Original query text |
| `structured_query` | `text` nullable | PubMed structured query when `query_mode=structured` |
| `query_hash` | `text` | Hash at last baseline/check for drift detection |
| `query_version` | `text` | e.g. `watch-magnesium-cortisol@v1` |
| `last_alert` | `jsonb` nullable | Last material alert payload |
| `last_heartbeat` | `jsonb` nullable | Last no-change heartbeat payload |
| `created_at` | `timestamptz` | Record creation |
| `updated_at` | `timestamptz` | Last mutation |

Mapped in `engine/watchlist/supabase-watchlist-store.ts`.

## `last_alert` JSON shape

```json
{
  "alert_type": "human_review",
  "alert_summary": "string",
  "generated_at": "ISO string",
  "contributing_sources_to_delta": [],
  "evidence_delta_change_level": "possible_material",
  "delta_confidence": 0.65
}
```

## `last_heartbeat` JSON shape

```json
{
  "emitted": true,
  "summary": "Watch checked successfully. No material evidence change requiring human review.",
  "no_material_change": true,
  "generated_at": "ISO string"
}
```

## Query hash computation

Implemented in `engine/watchlist/query-hash.ts`. Inputs:

- `watch_topic_id`
- `query_mode`
- `raw_query`
- `structured_query`
- `query_version`

Output: 16-character hex string (FNV-1a, pure JS — no Node `crypto` dependency).

## Monitoring drift

When stored `query_hash` ≠ computed hash at check time:

```json
{
  "query_strategy_changed": true,
  "previous_query_hash": "abc123...",
  "current_query_hash": "def456...",
  "query_strategy_change_recommendation": "Reset or re-baseline this watch before interpreting deltas."
}
```

Do not interpret evidence deltas until baseline is reset or re-established.

## Dry run vs real run

| Mode | Store behavior |
|------|----------------|
| `dry_run: true` | Read only; no `updated_at` change |
| `dry_run: false` | Update `known_pmids`, schedule fields, `last_alert` or `last_heartbeat`, `query_hash`, `updated_at` |

## Privacy: fields that MUST NOT be stored

- Client exact claim wording
- Client IDs or workspace-to-client mappings with PII
- Brand confidential marketing copy
- Private legal notes
- Commercial strategy documents

The durable store holds **abstracted claim-family monitoring state** only. Client mapping remains in the private Lucient app layer.

## Index suggestions

- PK on `watch_topic_id`
- Index on `(active, next_check_utc)` for due-watch queries
- Index on `claim_family` for alert routing lookups

## Implementation status (Phase 11)

| Item | Status |
|------|--------|
| `WatchlistStore` interface | Done (Phase 10.5) |
| `SupabaseWatchlistStore` | Done (Phase 11) |
| `resolveWatchlistStore()` selector | Done — env-based with fallback |
| Row ↔ `WatchTopicState` mapping | Done |
| Seed default topic if empty | Done |
| Integration tests | Manual via `debug_only` + run-due |

## Related docs

- [supabase-watchlist-store-phase-11.md](./supabase-watchlist-store-phase-11.md)
- [watchlist-persistence-readiness-phase-10-5.md](./watchlist-persistence-readiness-phase-10-5.md)
- [scheduled-watchlist-simulation-phase-10.md](./scheduled-watchlist-simulation-phase-10.md)

# Future watchlist persistence schema

Design reference for a durable `WatchlistStore` adapter. **Not a migration** — no database is configured in the POC yet.

## Table: `watch_topics` (suggested)

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

Output: 16-character hex prefix of SHA-256.

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

| Mode | Durable store behavior |
|------|------------------------|
| `dry_run: true` | Read only; no `updated_at` change |
| `dry_run: false` | Update `known_pmids`, schedule fields, `last_alert` or `last_heartbeat`, `query_hash`, `updated_at` |

## Privacy: fields that MUST NOT be stored

- Client exact claim wording
- Client IDs or workspace-to-client mappings with PII
- Brand confidential marketing copy
- Private legal notes
- Commercial strategy documents

The durable store holds **abstracted claim-family monitoring state** only. Client mapping remains in the private Lucient app layer.

## Index suggestions (when implemented)

- PK on `watch_topic_id`
- Index on `(active, next_check_utc)` for due-watch queries
- Index on `claim_family` for alert routing lookups

## Adapter implementation checklist

1. Implement all `WatchlistStore` methods against chosen provider
2. Map rows ↔ `WatchTopicState` type
3. Use transactions for check + baseline update
4. Return accurate `getStoreStatus()` (`durable: true`, etc.)
5. Wire `getWatchlistStore()` in `engine/watchlist/index.ts`
6. Add env var e.g. `WATCHLIST_STORE=in_memory|supabase|vercel_kv`
7. Integration tests: seed → check → baseline merge → heartbeat on repeat

## Related docs

- [watchlist-persistence-readiness-phase-10-5.md](./watchlist-persistence-readiness-phase-10-5.md)
- [scheduled-watchlist-simulation-phase-10.md](./scheduled-watchlist-simulation-phase-10.md)

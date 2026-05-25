# Documentation index

Lucient Evidence Mind POC — `POST /api/query` integration docs for **Animoca Mind → Lucient EIE**.

**Use demo workspace IDs and synthetic queries only.** Do not send real client-private data.

## Quick links

| Doc | Purpose |
|-----|---------|
| [magnesium-test.md](./magnesium-test.md) | Base API reference — request/response schema, auth, errors |
| [dynamic-claim-tests.md](./dynamic-claim-tests.md) | Phase 2 — keyword claim classification and risk levels |
| [evidence-source-stubs.md](./evidence-source-stubs.md) | Phase 3 — claim-tailored evidence stubs |
| [real-evidence-object-shape.md](./real-evidence-object-shape.md) | Phase 4/4.5 — nested source object (`meta`, `methodology`, `analysis`, etc.) |
| [pubmed-retrieval-test.md](./pubmed-retrieval-test.md) | Phase 5 — optional real PubMed metadata via NCBI E-utilities |
| [pubmed-abstract-appraisal.md](./pubmed-abstract-appraisal.md) | Phase 6 — abstract retrieval + basic appraisal |
| [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md) | Phase 7 — skeptical intervention matching and relevance caps |
| [evidence-watchlist-architecture.md](./evidence-watchlist-architecture.md) | Phase 7.5 — claim-family watchlists and privacy boundary |
| [evidence-change-monitoring-simulation.md](./evidence-change-monitoring-simulation.md) | Phase 8 — simulated evidence-change detection and alerts |
| [watch-check-endpoint.md](./watch-check-endpoint.md) | Phase 9 — manual live PubMed watchlist check |
| [contextual-integrity-query-refinement.md](./contextual-integrity-query-refinement.md) | Phase 9.5 — structured queries and context gates |
| [delta-attribution-alert-auditability.md](./delta-attribution-alert-auditability.md) | Phase 9.6 — delta attribution and alert auditability |
| [scheduled-watchlist-simulation-phase-10.md](./scheduled-watchlist-simulation-phase-10.md) | Phase 10 — persistent baseline and scheduled run simulation |
| [watchlist-persistence-readiness-phase-10-5.md](./watchlist-persistence-readiness-phase-10-5.md) | Phase 10.5 — store adapter and persistence readiness |
| [future-watchlist-persistence-schema.md](./future-watchlist-persistence-schema.md) | Future durable watchlist schema (design only) |

## POC phase summary

| Phase | What it adds |
|-------|----------------|
| 1 | `POST /api/query`, API key auth, static magnesium integration test |
| 2 | Dynamic claim-risk classification (`claim_analysis`) by query keywords |
| 3 | Claim-tailored `sources[]` stubs + `evidence_notes` |
| 4 | Nested research-record shape on each source |
| 4.5 | `alignment_confidence`, `study_limitations`, `regulatory_context`, `source_rank`, `max_sources` cap |
| 5 | Optional real PubMed retrieval (`filters.use_real_pubmed`) — `esearch` + `esummary` |
| 6 | PubMed abstract fetch (`efetch`) + basic automated appraisal |
| 7 | Skeptical appraisal rules — wrong intervention vs background mention, score caps, `appraisal_debug` |
| 7.5 | Evidence watchlist — abstracted claim families, watch topics, `evidence_change_status` placeholder, privacy boundary |
| 8 | Evidence-change monitoring simulation — optional `evidence_monitoring` with simulated deltas and alert routing |
| 9 | Manual live watchlist check — `POST /api/watch/check` diffs PubMed PMIDs against baseline |
| 9.5 | Contextual integrity — structured PubMed queries, context gates, `query_strategy` metadata |
| 9.6 | Delta attribution — `contributing_sources_to_delta`, `non_contributing_sources`, alert reason codes |
| 10 | Persistent watchlist baseline — in-memory state + `POST /api/watch/run-due` |
| 10.5 | WatchlistStore interface — in-memory adapter, persistence_status, future durable stub |

## Default vs PubMed mode

**Default (no PubMed):** returns claim-classified **evidence stubs** (`source_type: "evidence_stub"`).

**PubMed mode:** set both:

```json
{
  "filters": {
    "source_types": ["pubmed"],
    "use_real_pubmed": true,
    "max_sources": 3,
    "recency_years": 10
  }
}
```

On PubMed failure or empty results, the API falls back to stubs and sets `lucient_meta.pubmed_fetch_status` to `"failed_fallback_to_stub"`.

## Key source files

| File | Role |
|------|------|
| `app/api/query/route.ts` | HTTP handler |
| `lib/claim-classifier.ts` | Claim keyword classification |
| `lib/query-response.ts` | Response assembly |
| `lib/evidence-stubs.ts` | Stub sources + types |
| `lib/pubmed-retrieval.ts` | NCBI E-utilities + source mapping |
| `lib/pubmed-appraisal.ts` | Abstract appraisal rules |
| `lib/evidence-watchlist.ts` | Claim-family watchlist builder |
| `lib/evidence-monitoring.ts` | Phase 8 evidence-change simulation |
| `lib/watch-check.ts` | Phase 9 manual live watchlist check |
| `lib/structured-query.ts` | Phase 9.5 structured PubMed query builder |
| `lib/contextual-appraisal.ts` | Phase 9.5 context gates and score caps |
| `lib/delta-attribution.ts` | Phase 9.6 delta attribution and alert auditability |
| `lib/watchlist-state.ts` | Scheduling helpers + re-exports from engine/watchlist |
| `engine/watchlist/watchlist-store.ts` | Phase 10.5 WatchlistStore interface |
| `engine/watchlist/in-memory-watchlist-store.ts` | Phase 10.5 in-memory adapter |
| `engine/watchlist/query-hash.ts` | Phase 10.5 query hash + drift detection |
| `lib/watch-run-due.ts` | Phase 10 scheduled run orchestration |
| `app/api/watch/run-due/route.ts` | Phase 10 HTTP handler |
| `app/api/watch/check/route.ts` | Phase 9 HTTP handler |

## Current top-level response fields

`report_id`, `generated_at`, `report_status`, `workspace_id`, `query`, `claim_analysis`, `evidence_summary`, `evidence_grade`, `risk_assessment`, `recommended_wording`, `sources`, `evidence_notes`, `watchlist`, `evidence_monitoring` (optional, Phase 8), `report_confidence`, `lucient_meta`

## What this POC does not include

Database, Supabase, auth providers, dashboard, full evidence engine, PDF handling, real claim substantiation, or real client data.

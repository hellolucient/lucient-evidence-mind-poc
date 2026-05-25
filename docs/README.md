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

## Current top-level response fields

`report_id`, `generated_at`, `report_status`, `workspace_id`, `query`, `claim_analysis`, `evidence_summary`, `evidence_grade`, `risk_assessment`, `recommended_wording`, `sources`, `evidence_notes`, `watchlist`, `report_confidence`, `lucient_meta`

## What this POC does not include

Database, Supabase, auth providers, dashboard, full evidence engine, PDF handling, real claim substantiation, or real client data.

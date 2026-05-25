# lucient-evidence-mind-poc

Minimal HTTPS API proof-of-concept for **Animoca Mind → Lucient Evidence Intelligence Engine (EIE)** integration.

This is **not** the full Evidence Intelligence Engine. It proves that an Animoca Mind can:

1. Call our HTTPS endpoint
2. Authenticate with an API key
3. Send a `workspace_id` and evidence query
4. Receive structured JSON suitable for an Evidence Brief
5. Optionally retrieve real PubMed metadata with automated appraisal (Phases 5–7)

**Use demo workspace IDs and synthetic queries only.** Do not send real client-private data.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/query` | `Authorization: Bearer <API_KEY>` | Evidence Brief JSON (stubs or optional PubMed) |
| `POST` | `/api/watch/check` | `Authorization: Bearer <API_KEY>` | Manual live watchlist PubMed check (Phase 9) |

## Documentation

Full doc index: [docs/README.md](./docs/README.md)

| Doc | Topic |
|-----|-------|
| [docs/magnesium-test.md](./docs/magnesium-test.md) | Base API reference |
| [docs/dynamic-claim-tests.md](./docs/dynamic-claim-tests.md) | Claim classification (Phase 2) |
| [docs/evidence-source-stubs.md](./docs/evidence-source-stubs.md) | Evidence stubs (Phase 3) |
| [docs/real-evidence-object-shape.md](./docs/real-evidence-object-shape.md) | Source object schema (Phase 4/4.5) |
| [docs/pubmed-retrieval-test.md](./docs/pubmed-retrieval-test.md) | PubMed metadata (Phase 5) |
| [docs/pubmed-abstract-appraisal.md](./docs/pubmed-abstract-appraisal.md) | Abstracts + appraisal (Phase 6) |
| [docs/pubmed-appraisal-rules.md](./docs/pubmed-appraisal-rules.md) | Skeptical appraisal rules (Phase 7) |
| [docs/evidence-watchlist-architecture.md](./docs/evidence-watchlist-architecture.md) | Watchlist + claim families (Phase 7.5) |
| [docs/evidence-change-monitoring-simulation.md](./docs/evidence-change-monitoring-simulation.md) | Evidence-change simulation (Phase 8) |
| [docs/watch-check-endpoint.md](./docs/watch-check-endpoint.md) | Manual live watchlist check (Phase 9) |
| [docs/contextual-integrity-query-refinement.md](./docs/contextual-integrity-query-refinement.md) | Structured queries + context gates (Phase 9.5) |
| [docs/delta-attribution-alert-auditability.md](./docs/delta-attribution-alert-auditability.md) | Delta attribution + alert auditability (Phase 9.6) |

## POC phases (current)

| Phase | Capability |
|-------|------------|
| 1–2 | API + dynamic `claim_analysis` from query keywords |
| 3–4.5 | Rich `sources[]` stubs with nested research-record fields |
| 5 | Optional PubMed metadata (`use_real_pubmed` + `source_types: ["pubmed"]`) |
| 6 | PubMed abstracts + basic appraisal |
| 7 | Skeptical appraisal — intervention vs background mention, relevance caps, `appraisal_debug` |
| 7.5 | Evidence watchlist — abstracted claim families, watch topics, privacy boundary |
| 8 | Evidence-change monitoring simulation — optional `evidence_monitoring` via filters |
| 9 | Manual live watchlist check — `POST /api/watch/check` with PMID baseline diff |
| 9.5 | Contextual integrity — structured PubMed queries, context gates, query_strategy |
| 9.6 | Delta attribution — auditable contributing/non-contributing sources on watch checks |

## Setup

```bash
git clone https://github.com/hellolucient/lucient-evidence-mind-poc.git
cd lucient-evidence-mind-poc
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
EIE_TOOL_API_KEY=your-secret-api-key-here
```

## Run locally

```bash
npm run dev
```

API: [http://localhost:3000](http://localhost:3000)

## Quick tests

Health check:

```bash
curl -s http://localhost:3000/api/health
```

### Stub mode (default)

Returns claim-classified evidence stubs — no PubMed call:

```bash
curl -s -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "mode": "evidence_brief",
    "context": "Animoca Mind integration test. No real client data."
  }' | jq '.claim_analysis, .sources[0].source_type, .lucient_meta.pubmed_fetch_status'
```

Expected: `source_type: "evidence_stub"`, `pubmed_fetch_status: "not_requested"`.

### PubMed mode (Phases 5–7)

Requires outbound HTTPS to NCBI E-utilities:

```bash
curl -s -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "mode": "evidence_brief",
    "filters": {
      "source_types": ["pubmed"],
      "use_real_pubmed": true,
      "max_sources": 3,
      "recency_years": 10
    },
    "context": "PubMed integration test. No real client data."
  }' | jq '.lucient_meta.pubmed_fetch_status, .evidence_notes.citation_status, .report_confidence, .sources[0] | {source_type, appraisal: .appraisal.intervention_match, relevance: .analysis.relevance_score}'
```

See [docs/pubmed-retrieval-test.md](./docs/pubmed-retrieval-test.md) and [docs/pubmed-appraisal-rules.md](./docs/pubmed-appraisal-rules.md) for fallback behavior and appraisal rules.

## Filters reference

| Field | Default | Notes |
|-------|---------|-------|
| `source_types` | — | Include `"pubmed"` for PubMed mode |
| `use_real_pubmed` | `false` | Must be `true` to call NCBI |
| `max_sources` | `3` | Hard max `5` |
| `recency_years` | none | PubMed publication date filter when set |
| `simulate_evidence_change` | `false` | When `true`, include `evidence_monitoring` (Phase 8) |
| `simulated_change_type` | `"none"` | `none`, `weak_new_source`, `potentially_material_new_source`, `regulatory_warning` |
| `use_structured_query` | `false` on `/api/query`; `true` on `/api/watch/check` | Structured PubMed query for supported watch topics (Phase 9.5) |

Without `use_real_pubmed: true`, `max_sources` still caps stub count (currently one stub per claim type).

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start local dev server |
| `build` | `npm run build` | Production build |
| `start` | `npm run start` | Run production server locally |
| `lint` | `npm run lint` | ESLint via Next.js |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EIE_TOOL_API_KEY` | Yes (for `/api/query`) | Bearer token in `Authorization` header |

If missing at runtime, `/api/query` returns `500`. The key is never logged or exposed in responses.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import in [Vercel](https://vercel.com/new).
3. Set `EIE_TOOL_API_KEY` in project environment variables.
4. Deploy (Next.js auto-detected).

After deploy:

```bash
curl -s https://YOUR-PROJECT.vercel.app/api/health
```

Use the curl examples above with your Vercel URL and API key. PubMed mode requires Vercel outbound network access to `eutils.ncbi.nlm.nih.gov`.

## What this does not include

- Database, Supabase, auth provider, dashboard, RLS
- Full evidence search, PDF handling, full workspace system
- Background jobs, webhooks
- Final claim substantiation or clinical evidence grading

PubMed retrieval and Phase 7 appraisal are **conservative and automated only** — not proof that a claim is supported.

## License

Private POC — Lucient.

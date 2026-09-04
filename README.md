# lucient-evidence-mind-poc

Ecosystem-ready proof-of-concept for **lucient Evidence Mind** integrated with an external Mind layer (**HelloMinds / Animoca Minds**).

This repository demonstrates how a wellness evidence watchtower can convert monitoring into structured, reviewable intelligence and hand it to an external Mind for reasoning, memory, collaboration, and action planning. The Mind layer is **not** an optional notification channel — the intended operating model depends on the Mind receiving structured evidence intelligence and participating in the evidence-to-action workflow.

**Production app:** https://lucient-evidence-mind-poc.vercel.app

**Use demo workspace IDs and synthetic queries only.** Do not send real client-private data. This is a technical POC, not a finished SaaS product or multi-client platform.

## External Mind operating model

| Layer | Responsibility |
|-------|----------------|
| **lucient Evidence Mind** | Evidence monitoring, digest generation, risk posture, privacy-safe handoff preparation, operator review gates, durable audit |
| **External Mind (HelloMinds)** | Persistent reasoning context, memory, collaborative interpretation, downstream action planning |

The product becomes more defensible when the workflow depends on this loop:

**evidence intelligence → Mind interpretation → operator action**

Phase 39F validated production transport to HelloMinds (HTTP 200, durable audit records). The immediate next step is not more transport testing alone — it is **closing the loop** by retrieving or surfacing the Mind’s response back inside the operator workflow.

## Current capabilities (Phases 1–41A)

**Strategic milestone:** Phase 39F — controlled production HelloMinds validation **complete**. Internal API metadata `CURRENT_WATCH_PHASE` remains `"37"` for payload compatibility; see [docs/evidence-mind-roadmap.md](./docs/evidence-mind-roadmap.md) for canonical phase status.

| Capability | Status |
|------------|--------|
| Supabase magic-link operator login | `/review-login` → `/auth/callback` |
| Break-glass internal access | `INTERNAL_REVIEW_ACCESS_TOKEN` fallback |
| Scheduled cron/watch endpoint | `GET /api/watch/cron` (`CRON_SECRET`) |
| Durable watchlist persistence | `watchlist_topics`, `watch_runs`, `evidence_alerts` |
| Durable review items | `evidence_review_items` |
| Review queue UI | `/review-items` |
| Audit trail | `evidence_review_item_audit_events` |
| Operator notes | `evidence_review_item_notes` |
| Durable client claims | `client_claims` — `/client-claims` |
| Claim-family profiles | `claim_family_profiles` |
| Claim-to-watchlist mappings | `client_claim_watchlist_mappings` |
| Evidence change briefs | `evidence_change_briefs` — `/evidence-briefs` |
| Mind digests / watchtower summaries | `evidence_mind_digests` — `/mind-digests` |
| Watchtower narratives (deterministic templates) | `evidence_mind_watchtower_narratives` — generate from `/mind-digests` |
| Watchtower narrative diffs (deterministic comparison) | `evidence_mind_watchtower_narrative_diffs` |
| External Mind handoff payloads | `external_mind_handoffs` — `test_sink` and `hellominds` destinations |
| Operator approval before handoff send | Phase 34 — pending review blocks send until approved |
| Test-sink send + send audit log | Default safe operator path for `test_sink` handoffs |
| HelloMinds handoff creation (operator UI) | Explicit `hellominds` destination from `/mind-digests` |
| HelloMinds dry-run send (operator UI) | Approved `hellominds` handoffs while `EXTERNAL_MIND_LIVE_SEND=false` |
| HelloMinds production transport | **Validated Phase 39F** — controlled dry-run + one gated live send; live send disabled again |
| Mind receipt verification (HelloMinds) | **Phase 41A** — operator-gated receipt record derived from send audit metadata (no HelloMinds read) |
| **Simple statement check UI** | `/` — paste a statement, extract claims, run assessment |
| **Mind-centered claim intelligence (Phase 45)** | `/source-intake` — Mind extraction + candidate review; Mind risk briefs on `/client-claims` |

**Validated production chain (Phases 29–45):** watchlist → evidence alert → review item → affected client claims → evidence brief → Mind digest → durable watchtower narrative → deterministic narrative diff (when prior narrative exists) → external Mind handoff payload → operator approval → test-sink or HelloMinds send (gated) → send audit log → **Mind claim extraction / risk brief loop (Phase 45)**.

### External Mind safety model

- External Mind sends are **operator-approval-gated** (`review_status=approved` required).
- Live delivery is **separately gated** by `EXTERNAL_MIND_LIVE_SEND`.
- `EXTERNAL_MIND_LIVE_SEND=false` is the **safe default production state**.
- Live sending requires an intentional, temporary operator-controlled validation window.
- Operator UI exposes dry-run send for HelloMinds; it does **not** expose live-send controls or secrets.
- Documentation records validation IDs and audit metadata only — no API keys, bearer tokens, or full payload contents.

**For detailed phase status and validation records, see [docs/evidence-mind-roadmap.md](./docs/evidence-mind-roadmap.md).**

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/query` | `Authorization: Bearer <API_KEY>` | Evidence Brief JSON (stubs or optional PubMed) |
| `POST` | `/api/watch/check` | `Authorization: Bearer <API_KEY>` | Manual live watchlist PubMed check (Phase 9) |
| `GET` | `/api/watch/run-due` | None | Scheduled runner health check (Phase 10+) |
| `POST` | `/api/watch/run-due` | `Authorization: Bearer <API_KEY>` | Manual scheduled watchlist run (Phases 10–11) |
| `GET` | `/api/watch/cron` | Vercel Cron user-agent **or** `Authorization: Bearer <CRON_SECRET>` | Production scheduled watchlist run (Phase 12+) |
| `GET` | `/api/watch/runs` | Same as cron | Latest watch run history (Phase 13+) |
| `GET` | `/api/review-items` | Operator session or break-glass token | List review items (Phase 18+) |
| `GET/POST` | `/api/review-items/[id]/*` | Operator session or break-glass token | Review item detail and status (Phase 18+) |
| `GET` | `/review-items` | Operator session or break-glass token | Internal review queue UI (Phase 19+) |
| `GET` | `/` | Operator session or public landing | Simple statement check: extract claims and assess |
| `GET` | `/review-login` | None | Operator magic-link login (Phase 23+) |
| `GET` | `/client-claims` | Operator session or break-glass token | Client claims registry + mappings + Mind risk briefs (Phase 45) |
| `GET` | `/source-intake` | Operator session or break-glass token | Mind-centered source intake + claim extraction workflow (Phase 45) |
| `POST/GET` | `/api/source-documents/*` | Operator session or break-glass token | Source intake documents (Phase 45) |
| `POST` | `/api/mind-extraction-jobs/[id]/*` | Operator session or break-glass token | Mind claim extraction job workflow (Phase 45) |
| `GET/PATCH/POST` | `/api/candidate-claims/[id]/*` | Operator session or break-glass token | Mind candidate claim review (Phase 45) |
| `POST/GET` | `/api/client-claims/[id]/mind-risk-brief-*` | Operator session or break-glass token | Mind claim risk brief workflow (Phase 45) |

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
| [docs/scheduled-watchlist-simulation-phase-10.md](./docs/scheduled-watchlist-simulation-phase-10.md) | Persistent baseline + scheduled run (Phase 10) |
| [docs/watchlist-persistence-readiness-phase-10-5.md](./docs/watchlist-persistence-readiness-phase-10-5.md) | Store adapter + persistence readiness (Phase 10.5) |
| [docs/future-watchlist-persistence-schema.md](./docs/future-watchlist-persistence-schema.md) | Watchlist persistence schema (`watchlist_topics`, Phase 11) |
| [docs/supabase-watchlist-store-phase-11.md](./docs/supabase-watchlist-store-phase-11.md) | Supabase durable watchlist store (Phase 11) |
| [docs/vercel-cron-phase-12.md](./docs/vercel-cron-phase-12.md) | Vercel Cron scheduled monitoring (Phase 12) |
| [docs/watch-run-logging-phase-13.md](./docs/watch-run-logging-phase-13.md) | Durable watch run logging (Phase 13) |
| [docs/evidence-mind-roadmap.md](./docs/evidence-mind-roadmap.md) | **Canonical live roadmap** — current phase status through Phase 45 Mind-centered claim intelligence |
| [docs/phase-45-mind-centered-claim-intelligence.md](./docs/phase-45-mind-centered-claim-intelligence.md) | Mind-centered claim extraction + risk briefs (Phase 45) |
| [docs/DEVELOPMENT_PHASES.md](./docs/DEVELOPMENT_PHASES.md) | Phase history (1–20 detail + 21–28 summary; see roadmap for 29–45) |
| [docs/REVIEW_QUEUE_API.md](./docs/REVIEW_QUEUE_API.md) | Review queue API (Phase 18 origin; see current-status note) |
| [docs/REVIEW_QUEUE_UI.md](./docs/REVIEW_QUEUE_UI.md) | Review queue UI (Phase 19 origin; see current-status note) |
| [docs/MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./docs/MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md) | Handoff and claim mapping architecture |

## POC phases (historical summary — Phases 1–13)

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
| 10 | Persistent watchlist baseline + `POST /api/watch/run-due` scheduler simulation |
| 10.5 | Watchlist store interface + in-memory adapter; persistence readiness without external DB |
| 11 | SupabaseWatchlistStore — durable `watchlist_topics` persistence with in-memory fallback |
| 12 | Vercel Cron — `GET /api/watch/cron` daily at 21:00 UTC (4:00 AM Bangkok); Supabase-backed autonomous monitoring |
| 13 | Durable watch run logging — `public.watch_runs` audit trail for cron and manual runs |

Phases 14–27 added evidence alerts, signal classification, review queue, operator auth, audit trail, notes, client claims, and claim-to-watchlist mapping. Phases 28–35 added evidence change briefs, Mind digests, scheduled digest generation, external Mind handoff payloads, disabled-by-default test-sink send, send audit trail, operator approval before send, and deterministic watchtower narratives. See [docs/evidence-mind-roadmap.md](./docs/evidence-mind-roadmap.md).

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

# Phase 12 — manual cron smoke tests (server-side only; generate with: openssl rand -hex 32)
CRON_SECRET=replace_me_with_a_long_random_secret

# Optional Phase 11 — durable watchlist persistence (server-side only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

When Supabase env vars are set, `/api/watch/run-due` uses `SupabaseWatchlistStore` against `public.watchlist_topics`. Without them, it falls back to in-memory state. See [docs/supabase-watchlist-store-phase-11.md](./docs/supabase-watchlist-store-phase-11.md).

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

### Scheduled watchlist (Phases 10–11)

Health check (no auth):

```bash
curl -s http://localhost:3000/api/watch/run-due
```

Persistence debug (confirms Supabase vs in-memory adapter):

```bash
curl -s -X POST http://localhost:3000/api/watch/run-due \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{"debug_only":true}' | jq '.persistence_status, .env_debug'
```

See [docs/supabase-watchlist-store-phase-11.md](./docs/supabase-watchlist-store-phase-11.md) for full run-due behavior.

### Production cron (Phase 12)

Vercel Cron hits `GET /api/watch/cron` daily at **21:00 UTC** (**4:00 AM Bangkok**, UTC+7). Configured in `vercel.json`:

```json
{ "crons": [{ "path": "/api/watch/cron", "schedule": "0 21 * * *" }] }
```

Unauthorized probe (expect `401`):

```bash
curl -i https://YOUR-PROJECT.vercel.app/api/watch/cron
```

Authorized manual smoke test:

```bash
curl -i \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR-PROJECT.vercel.app/api/watch/cron
```

See [docs/vercel-cron-phase-12.md](./docs/vercel-cron-phase-12.md) for auth, response shape, and operator checklist. **Redeploy after any `vercel.json` schedule change.**

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
| `EIE_TOOL_API_KEY` | Yes (for protected endpoints) | Bearer token in `Authorization` header |
| `CRON_SECRET` | No (Phase 12 manual cron tests) | Bearer token for authorized `GET /api/watch/cron` smoke tests |
| `NEXT_PUBLIC_SUPABASE_URL` | No (Phase 11) | Supabase project URL — enables durable watchlist persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | No (Phase 11) | **Server-only** — never expose to client code or API responses |

If `EIE_TOOL_API_KEY` is missing at runtime, protected endpoints return `500`. Keys are never logged or exposed in responses.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import in [Vercel](https://vercel.com/new).
3. Set environment variables:
   - `EIE_TOOL_API_KEY` (required)
   - `CRON_SECRET` (required for manual cron smoke tests; Vercel Cron uses user-agent auth)
   - `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (optional, Phase 11 durable watchlist)
4. Deploy (Next.js auto-detected). Vercel picks up the cron job from `vercel.json` — confirm under **Settings → Cron Jobs** (`GET /api/watch/cron`, schedule `0 21 * * *` = 4:00 AM Bangkok).

After deploy:

```bash
curl -s https://YOUR-PROJECT.vercel.app/api/health
```

Use the curl examples above with your Vercel URL and API key. PubMed mode requires Vercel outbound network access to `eutils.ncbi.nlm.nih.gov`.

## What this does not include

- Public client-facing accounts or a finished multi-client SaaS product
- Multi-client production readiness
- Full evidence search, PDF handling, or final claim substantiation
- Webhooks or client-facing alert delivery
- Non-PubMed regulatory source integration
- Operator UI live-send control for HelloMinds (`EXTERNAL_MIND_LIVE_SEND` remains `false` in production)
- Full Mind-response loop closure — retrieving HelloMinds interpretation back into operator workflow (Phase 41B+)
- Real client data — demo workspace IDs and synthetic queries only

PubMed retrieval and Phase 7 appraisal are **conservative and automated only** — not proof that a claim is supported.

**Note:** Supabase is used server-side for watchlist state, review items, audit/notes, client claims, and claim mappings. See [docs/evidence-mind-roadmap.md](./docs/evidence-mind-roadmap.md) for the full validated capability list.

## License

Private POC — Lucient.

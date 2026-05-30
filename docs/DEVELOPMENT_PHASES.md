# lucient Evidence Mind — Development Phases

lucient Evidence Mind is evolving from a one-off evidence query and brief system into a persistent evidence-monitoring and claim-intelligence platform for wellness claims. The phases below track what has been built, what has been validated in production, and what comes next so future work stays aligned with the platform direction.

---

## Phase 1 — Basic Evidence Query Endpoint

**Status:** Completed

**Purpose:** Built the first working query endpoint so the app could accept a wellness/evidence question and return a structured response.

---

## Phase 2 — Basic Claim/Evidence Response Shape

**Status:** Completed

**Purpose:** Began structuring responses around claims, evidence, risk, and safer wording rather than generic chatbot answers.

---

## Phase 3 — Claim Extraction / Evidence Mapping Foundation

**Status:** Completed

**Purpose:** Introduced the idea that wellness copy or product claims should be broken into checkable claims and mapped to evidence.

---

## Phase 4 — Guardrail / Safer Wording Logic

**Status:** Completed

**Purpose:** Added safer wording and claim-risk handling so risky wellness claims can be rewritten more carefully.

---

## Phase 5 — Persistence Preparation / Supabase Direction

**Status:** Completed

**Purpose:** Prepared the system for durable storage rather than runtime-only or JSON-only state.

---

## Phase 6 — Engine Refactor / Service Separation

**Status:** Completed

**Purpose:** Separated logic into clearer engine/service layers to support more complex evidence workflows.

---

## Phase 7 — Intervention Matching and Appraisal Tightening

**Status:** Completed / Validated

**Purpose:** Fixed intervention matching and tightened appraisal rules to reduce weak or irrelevant evidence matches.

---

## Phase 8 — Reframe Toward Evidence Watchlists

**Status:** Completed conceptually

**Purpose:** Shifted the strategic direction from one-off evidence brief generation toward persistent evidence monitoring over time.

---

## Phase 9 — Watchlist Runner Foundation

**Status:** Completed

**Purpose:** Built the first version of the watchlist runner to check a watched claim family and compare current PMIDs against a baseline.

---

## Phase 9.5 — Baseline / Known PMID Handling

**Status:** Completed

**Purpose:** Improved known PMID comparison and baseline state handling so the system can distinguish old evidence from new evidence.

---

## Phase 9.6 — Alert Logic / Evidence Delta Simulation

**Status:** Completed

**Purpose:** Added evidence delta summaries, alert-required logic, monitor-only classification, and non-contributing source handling.

---

## Phase 10 — Scheduled Watch Simulation

**Status:** Completed

**Purpose:** Built scheduled watch simulation mode so the system could behave like a daily evidence watchtower run before real cron scheduling.

---

## Phase 10.5 — Duplicate Suppression / Repeat Run Validation

**Status:** Completed / Validated

**Purpose:** Validated that repeated runs do not create duplicate alerts for already-known PMIDs.

---

## Phase 11 — Durable Supabase Watchlist Persistence

**Status:** PASS

**Purpose:** Moved watchlist state into Supabase using SupabaseWatchlistStore.

**Validated:**

- `durable = true`
- `store = supabase`
- `adapter = SupabaseWatchlistStore`
- state survives cold starts
- known PMIDs are remembered
- `next_check_utc` is respected

---

## Phase 12 — Vercel Cron Scheduled Trigger

**Status:** PASS

**Purpose:** Added `/api/watch/cron` and Vercel scheduled execution so Evidence Mind can wake itself automatically.

**Validated:**

- `/api/watch/cron` deployed
- `CRON_SECRET` protection works
- unauthorized calls return `401`
- authorized manual calls return `200`
- actual Vercel scheduled calls return `200`
- production schedule runs at 21:00 UTC, equivalent to 4:00 AM Bangkok time and 5:00 AM Malaysia time

---

## Phase 13 — Durable Watch Run Logging

**Status:** PASS

**Purpose:** Added `public.watch_runs` so each watchtower run has durable operational history.

**Validated:**

- manual runs create `watch_runs` rows
- scheduled cron runs create `watch_runs` rows
- unauthorized calls do not create rows
- trigger/source diagnostics fixed
- `response_summary` stored

---

## Phase 14 — Durable Evidence Alert Persistence

**Status:** PASS

**Purpose:** Added `public.evidence_alerts` so newly detected evidence is stored as durable alert/event records.

**Validated:**

- `evidence_alerts` table exists
- no-new-evidence run logs zero alerts
- simulated new PMID creates durable alert
- alert links to `watch_run_id`
- repeat run creates no duplicate alert
- unique alert count confirmed

**Key test:**

- PMID `32124007` removed from baseline
- forced run rediscovered it
- `evidence_alert` created
- repeat run created no duplicate

---

## Phase 15 — Claim Family Search Profiles

**Status:** PASS

**Purpose:** Define exactly what each claim family is watching.

This phase should cover:

- claim family name
- intervention terms
- outcome terms
- synonyms
- included concepts
- excluded concepts
- PubMed query strategy
- publication type preferences
- human/animal filters
- noise filters
- query versioning
- source priority

**Validated:**

- Structured profile exists for `magnesium_cortisol_stress`
- Watch topic `watch-magnesium-cortisol` resolves to that profile
- Generated PubMed query includes magnesium terms
- Generated PubMed query includes cortisol/stress/HPA terms
- Generated PubMed query excludes animal/veterinary noise
- v1 query is stable and preserves the previous production query string
- Targeted local tests passed: 6/6
- Full local test suite passed: 28/28
- Production `/api/watch/cron` smoke test passed with phase 15

See [CLAIM_FAMILY_SEARCH_PROFILES.md](./CLAIM_FAMILY_SEARCH_PROFILES.md)

---

## Phase 16 — Evidence Appraisal / Signal Classification

**Status:** PASS

**Purpose:** Improve how the system decides whether new evidence strengthens, weakens, contradicts, or merely touches a claim.

**Signal categories (Phase 16 v1):**

- `strengthens_claim`
- `weakens_claim`
- `contradicts_claim`
- `no_material_change`
- `irrelevant_noise`
- `monitor_only`
- `human_review_required`
- `client_claim_re_review_required`

**Validated:**

- Evidence signal classifier implemented
- Targeted classifier tests passed: 7/7
- Full local test suite passed: 37/37
- Runtime phase marker centralized and production `/api/watch/cron` reports phase 16
- Signal classification is integrated into live watch execution, not standalone only
- Signal classification appears in:
  - `results[].signal_classifications[]`
  - `results[].evidence_delta.signal_classification`
  - `results[].evidence_change_alert.signal_classification`
  - `results[].new_evidence_candidates[].raw_payload.signal_classification`
  - `evidence_alerts.raw_payload.signal_classification`
- Cron summary payload remains intentionally slim and does not expose result-level classifications directly

See [EVIDENCE_SIGNAL_CLASSIFICATION.md](./EVIDENCE_SIGNAL_CLASSIFICATION.md)

---

## Phase 17 — Mind/App Handoff and Client Claim Mapping

**Status:** PASS

**Purpose:** Phase 17 creates the bridge from abstract evidence alerts to affected client/workspace claims and review handoff items.

**Phase 17 v1 deliverables:**

- `lib/watch/client-claim-mapper.ts` — demo claim-family → client claim mapping
- `lib/watch/evidence-review-handoff.ts` — review handoff item builder
- `lib/watch/evidence-review-item-store.ts` — optional Supabase persistence (`EIE_ENABLE_REVIEW_HANDOFFS=true`)
- Migration: `supabase/migrations/20260530140000_create_evidence_review_items.sql`
- Docs: [MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md)

**Validated:**

- Client claim mapping foundation implemented
- Demo mapping exists for `magnesium_cortisol_stress` to `demo-claim-magnesium-stress-001`
- Review handoff item builder implemented
- Optional `evidence_review_items` Supabase persistence implemented behind `EIE_ENABLE_REVIEW_HANDOFFS`
- Migration prepared but not required for default production behavior
- Privacy boundary preserved: scheduled runner payloads do not expose private claim text
- Full local test suite passed: 51/51
- Production `/api/watch/cron` reports phase 17 and logs `watch_runs` successfully
- Review handoff persistence remains disabled by default in production

**Intentionally not included in v1:**

- Real client notifications or email
- Full workspace UI or review queues
- Client claim ingestion pipeline
- Changes to cron auth, PubMed queries, alert dedupe, or signal classification rules

See [MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md)

---

## Phase 18 — Review Queue API and Operator Actions

**Status:** In Progress

**Purpose:** Phase 18 adds a minimal review queue API and operator status actions so the lucient app or Mind layer can list, inspect, and update Phase 17 review handoff items.

**Phase 18 v1 deliverables:**

- Extended `lib/watch/evidence-review-item-store.ts` — `listReviewItems`, `getReviewItemById`, `updateReviewItemStatus`, `createDemoReviewItem`
- `lib/review/review-items-api.ts` — privacy-safe API response builders
- Routes: `GET /api/review-items`, `GET /api/review-items/[id]`, `POST /api/review-items/[id]/status`
- Docs: [REVIEW_QUEUE_API.md](./REVIEW_QUEUE_API.md)
- Optional demo seed: `supabase/seed/demo_evidence_review_item.sql`

**Intentionally not included in v1:**

- Full review queue UI
- Automatic production handoff creation (still behind `EIE_ENABLE_REVIEW_HANDOFFS`, default off)
- Workspace-scoped authenticated app auth (uses internal cron-secret auth for now)
- Client notifications or email

---

## Summary

| Phase range | Focus |
|-------------|-------|
| **Phases 1–7** | Basic evidence engine |
| **Phases 8–10.5** | Watchlist and scheduled monitoring simulation |
| **Phase 11** | Durable watchlist state |
| **Phase 12** | Scheduled autonomous execution |
| **Phase 13** | Durable run history |
| **Phase 14** | Durable evidence alerts |
| **Phase 15** | Better claim-family search profiles |
| **Phase 16** | Better appraisal and signal classification |
| **Phase 17** | Mind/app/client claim workflow integration |
| **Phase 18** | Review queue API and operator status actions |

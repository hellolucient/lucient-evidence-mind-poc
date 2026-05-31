# lucient Evidence Mind — Roadmap

> **Canonical live roadmap.** This file is the source of truth for current phase status. It **supersedes older phase docs** (including per-phase guides and `DEVELOPMENT_PHASES.md` sections written before Phase 21) when there is a conflict.

High-level phase plan, status tracking, and strategic direction for the Evidence Mind POC. For early-phase deliverables (Phases 1–20), see [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md). For Phases 21–29, see the summary there and the detailed validation records below.

**Current phase marker (production):** `35`  
**Strategic status:** Internal alpha validated — Phases 1–35 production-validated; **Phase 36 (Watchtower Narrative History / Diff Layer) planned — not started.**

> **Phase 35 summary:** Phase 35 added a durable, evidence-constrained watchtower narrative layer generated from Mind digests using deterministic templates. The narrative explains what changed, why it matters, operator focus, recommended next action, and risk posture, and is persisted for later comparison and handoff.

### Recent phase status (quick reference)

| Phase | Name | Status |
|-------|------|--------|
| **24** | Operator audit trail for review queue actions | **PASS / Production validated** |
| **25** | Operator notes and review decision rationale | **PASS / Production validated** |
| **26** | Durable client claim registry | **PASS / Production validated** |
| **27** | Claim-to-watchlist mapping | **PASS / Production validated** |
| **28** | Evidence change brief generator | **PASS / Production validated** |
| **29** | Mind digest / watchtower summary | **PASS / Production validated** |
| **30** | Scheduled digest generation | **PASS / Production validated** |
| **31** | External Mind handoff / Animoca Mind payload | **PASS / Production validated** |
| **32** | External Mind send stub / disabled-by-default integration | **PASS / Production validated** |
| **33** | External Mind send audit trail / operator send log | **PASS / Production validated** |
| **34** | Operator review of external Mind payloads before send | **PASS / Production validated** |
| **35** | Evidence Mind watchtower narrative / persistent interpretation layer | **PASS / Production validated** |

---

## Roadmap at a Glance

| Horizon | Phases | Status | Focus |
|---------|--------|--------|-------|
| **Completed** | 1–35 | PASS / Done | Evidence engine through watchtower narratives, Mind digests, external Mind handoffs, disabled-by-default send stub, send audit trail, operator handoff review/approval |
| **Mind integration** | 36 | Planned (not started) | Watchtower narrative history / diff layer |

---

## Phase Plan

### Completed phases (validated)

| Phase | Name | Status |
|-------|------|--------|
| 1–7 | Basic evidence engine | Done |
| 8–10.5 | Watchlist and scheduled monitoring simulation | Done |
| 11 | Durable Supabase watchlist persistence | PASS |
| 12 | Vercel Cron scheduled execution | PASS |
| 13 | Durable watch run logging | PASS |
| 14 | Durable evidence alerts | PASS |
| 15 | Claim-family search profiles | PASS |
| 16 | Appraisal and signal classification | PASS |
| 17 | Mind/app handoff and client claim mapping | PASS |
| 18 | Review queue API and operator status actions | PASS |
| 19 | Minimal internal review queue UI | PASS |
| 20 | Internal access control / route protection for `/review-items` | PASS / Done |
| 20.5 | Correct-token access and review UI regression check | PASS / Done |
| **21** | **Review queue API hardening** | **PASS / Done** |
| **22** | **Workspace operator auth planning** | **PASS / Done** |
| **23A** | **Supabase Auth + demo workspace membership** | **PASS / Done** |
| **23B** | **Operator logout, session visibility, access denied UX, and operator login diagnostics** | **PASS / Done** |
| **24** | **Operator audit trail for review queue actions** | **PASS / Done** |
| **25** | **Operator notes and review decision rationale** | **PASS / Done** |
| **26** | **Durable client claim registry** | **PASS / Done** |
| **27** | **Claim-to-watchlist mapping** | **PASS / Done** |
| **28** | **Evidence change brief generator** | **PASS / Done** |
| **29** | **Mind digest / watchtower summary** | **PASS / Done** |
| **30** | **Scheduled digest generation** | **PASS / Done** |
| **31** | **External Mind handoff / Animoca Mind payload** | **PASS / Done** |
| **32** | **External Mind send stub / disabled-by-default integration** | **PASS / Done** |
| **33** | **External Mind send audit trail / operator send log** | **PASS / Done** |
| **34** | **Operator review of external Mind payloads before send** | **PASS / Done** |
| **35** | **Evidence Mind watchtower narrative / persistent interpretation layer** | **PASS / Done** |

### Forward phases (planned)

| Phase | Name | Horizon | Status |
|-------|------|---------|--------|
| **36** | **Watchtower narrative history / diff layer** | Mind integration | Planned |

---

## Task / Status Table

| Item | Phase | Status | Notes |
|------|-------|--------|-------|
| Basic evidence query and appraisal engine | 1–7 | Done | |
| Watchlist runner and scheduled simulation | 8–10.5 | Done | |
| Supabase watchlist persistence | 11 | PASS | |
| Vercel Cron + `CRON_SECRET` auth | 12 | PASS | Unchanged in Phase 21 |
| Watch run logging | 13 | PASS | |
| Evidence alerts persistence | 14 | PASS | |
| Claim-family search profiles | 15 | PASS | |
| Signal classification | 16 | PASS | |
| Client claim mapping + review handoff | 17 | PASS | |
| Review queue API (`/api/review-items*`) | 18 | PASS | |
| Internal review queue UI (`/review-items`) | 19 | PASS | |
| Route protection for `/review-items` | 20 | PASS | `INTERNAL_REVIEW_ACCESS_TOKEN` |
| Correct-token access and review UI regression | 20.5 | PASS / Done | Production operator test completed |
| Review queue API internal auth hardening | 21 | **PASS / Done** | Internal review auth on `/api/review-items*` |
| Production validation: review API blocked without session | 21 | **PASS / Done** | Production `401` confirmed |
| Production validation: review UI regression after API hardening | 21 | **PASS / Done** | Queue, selection, detail, status update persist |
| Workspace operator auth planning | 22 | **PASS / Done** | Proposal documented; no code changes |
| Supabase Auth operator login + workspace membership | 23A | **PASS / Done** | Magic-link login + workspace-scoped review access |
| Production validation: operator magic-link login | 23A | **PASS / Done** | Login email redirects to deployed `/auth/callback` |
| Production validation: workspace-scoped review access | 23A | **PASS / Done** | Demo operator accesses `demo-workspace-spa-menu` queue |
| Production validation: break-glass token fallback | 23A | **PASS / Done** | `INTERNAL_REVIEW_ACCESS_TOKEN` path still available |
| Operator logout and session visibility UX | 23B | **PASS / Done** | Auth panel, logout, access-denied UX |
| Operator login eligibility and diagnostics | 23B | **PASS / Done** | Pre-check + server-side failure reasons |
| Production validation: full operator login/logout cycle | 23B | **PASS / Done** | Magic link → queue → logout → blocked |
| Production validation: callback session persistence | 23B | **PASS / Done** | Route-handler cookies on redirect response |
| Operator audit trail for review queue actions | 24 | **PASS / Done** | Durable status-change audit rows + detail panel history |
| Production validation: Supabase audit migration applied | 24 | **PASS / Done** | `evidence_review_item_audit_events` table created |
| Production validation: operator status change writes audit row | 24 | **PASS / Done** | UI status update persisted audit event in Supabase |
| Production validation: audit history in review detail panel | 24 | **PASS / Done** | Privacy-safe audit history visible to authorized operators |
| Production validation: review queue regressions after Phase 24 | 24 | **PASS / Done** | Auth, break-glass, API protection, cron isolation unchanged |
| Operator notes and review decision rationale | 25 | **PASS / Done** | Durable notes table + UI note submission + audit integration |
| Production validation: Supabase notes migration applied | 25 | **PASS / Done** | `evidence_review_item_notes` table created |
| Production validation: operator note creation from review UI | 25 | **PASS / Done** | Note persisted in Supabase with matching `note_added` audit event |
| Production validation: notes and audit history in detail panel | 25 | **PASS / Done** | Notes history and note-related audit activity visible to authorized operators |
| Production validation: magic-link login restored during Phase 25 | 25 | **PASS / Done** | Operator login via `/review-login` working again after auth-flow fix |
| Production validation: review queue regressions after Phase 25 | 25 | **PASS / Done** | Status-change audit, auth, break-glass, API protection, cron isolation unchanged |
| Durable client claim registry | 26 | **PASS / Done** | Durable `client_claims` table + `/client-claims` UI + review-item claim linking |
| Production validation: Supabase client claims migration applied | 26 | **PASS / Done** | `client_claims` table created with demo seed row |
| Production validation: manual client claim create/list/update | 26 | **PASS / Done** | Operator created and updated claims via `/client-claims` |
| Production validation: review item linked durable claim | 26 | **PASS / Done** | Review detail panel resolves linked `client_claims` row when present |
| Production validation: review queue regressions after Phase 26 | 26 | **PASS / Done** | Notes, audit trail, auth, break-glass, API protection, cron isolation unchanged |
| Claim-to-watchlist mapping | 27 | **PASS / Done** | Durable `claim_family_profiles` + `client_claim_watchlist_mappings` + `/client-claims` mapping UI |
| Production validation: Supabase claim mapping migration applied | 27 | **PASS / Done** | `claim_family_profiles` and `client_claim_watchlist_mappings` tables created |
| Production validation: seeded magnesium claim family profile | 27 | **PASS / Done** | `magnesium_cortisol_stress` profile and demo mapping exist |
| Production validation: `/client-claims` mapping UI and controlled dropdown | 27 | **PASS / Done** | Operators map claims via profile dropdown; mappings display with status/confidence |
| Production validation: review queue regressions after Phase 27 | 27 | **PASS / Done** | Audit trail, notes, auth, break-glass, API protection, cron isolation unchanged |
| Evidence change brief generator | 28 | **PASS / Done** | Durable `evidence_change_briefs` + `evidence_change_brief_claims` + `/evidence-briefs` UI + demo brief generation |
| Production validation: Supabase evidence brief migration applied | 28 | **PASS / Done** | `evidence_change_briefs` and `evidence_change_brief_claims` tables created |
| Production validation: demo magnesium brief generation | 28 | **PASS / Done** | Brief and affected claim snapshots persisted; durable Phase 27 mappings used |
| Production validation: duplicate prevention for active briefs | 28 | **PASS / Done** | Second generation for same workspace + claim family shows existing brief |
| Production validation: review queue regressions after Phase 28 | 28 | **PASS / Done** | Audit trail, notes, client claims, mappings, auth, break-glass, cron isolation unchanged |
| Mind digest / watchtower summary | 29 | **PASS / Done** | Internal `evidence_mind_digests` + `/mind-digests` UI + demo digest generation |
| Production validation: Supabase Mind digest migration applied | 29 | **PASS / Done** | `evidence_mind_digests` and `evidence_mind_digest_items` tables created |
| Production validation: demo Mind digest generation | 29 | **PASS / Done** | Digest and item snapshots persisted from stored watchtower activity |
| Production validation: duplicate prevention for active digests | 29 | **PASS / Done** | Second generation for same workspace + period shows existing digest |
| Production validation: review queue regressions after Phase 29 | 29 | **PASS / Done** | Audit trail, notes, client claims, mappings, evidence briefs, auth, break-glass, cron isolation unchanged |
| Scheduled digest generation | 30 | **PASS / Done** | Protected `/api/mind-digests/run-due` + Vercel weekly cron + Phase 29 generator reuse |
| Production validation: Vercel cron for scheduled digests | 30 | **PASS / Done** | `/api/mind-digests/run-due` cron entry present alongside `/api/watch/cron` |
| Production validation: scheduled digest endpoint auth | 30 | **PASS / Done** | Open/unauthenticated requests rejected; authorized bearer accepted |
| Production validation: duplicate skip on scheduled run | 30 | **PASS / Done** | Existing active digest for workspace + period skipped, not duplicated |
| Production validation: review queue regressions after Phase 30 | 30 | **PASS / Done** | Mind digests UI, review queue, client claims, evidence briefs, watch cron unchanged |
| External Mind handoff / Animoca Mind payload | 31 | **PASS / Done** | Durable `external_mind_handoffs` + digest payload builder + `/mind-digests` handoff UI |
| Production validation: Supabase external Mind handoff migration applied | 31 | **PASS / Done** | `external_mind_handoffs` table created |
| Production validation: operator handoff creation from digest | 31 | **PASS / Done** | Handoff row persisted with privacy-safe `mind_digest_payload_v1` JSON |
| Production validation: duplicate handoff prevention | 31 | **PASS / Done** | Same digest + destination + payload version reuses existing active handoff |
| Production validation: review queue regressions after Phase 31 | 31 | **PASS / Done** | Mind digests, review queue, client claims, evidence briefs, auth, break-glass, both cron endpoints unchanged |
| External Mind send stub / disabled-by-default integration | 32 | **PASS / Done** | Env-gated send config + test-sink send + `/mind-handoffs/send` operator action |
| Production validation: Supabase send metadata migration applied | 32 | **PASS / Done** | `send_attempted_at` and `send_result_json` columns added |
| Production validation: test-sink send marks handoff sent | 32 | **PASS / Done** | Status `sent`, `sent_at` populated, privacy-safe `send_result_json` recorded |
| Production validation: external send disabled by default | 32 | **PASS / Done** | No external network call; `ENABLE_EXTERNAL_MIND_SEND` not enabled in production |
| Production validation: resend guard for already-sent handoffs | 32 | **PASS / Done** | Already-sent handoffs cannot be resent accidentally |
| Production validation: review queue regressions after Phase 32 | 32 | **PASS / Done** | Handoff creation, digests, review queue, client claims, evidence briefs, auth, break-glass, both cron endpoints unchanged |
| External Mind send audit trail / operator send log | 33 | **PASS / Done** | Durable `external_mind_handoff_send_events` + send helper audit wiring + `/mind-digests` send history |
| Production validation: Supabase send events migration applied | 33 | **PASS / Done** | `external_mind_handoff_send_events` table created |
| Production validation: two-step handoff + test-sink send flow | 33 | **PASS / Done** | Create payload then send to test sink with durable audit events |
| Production validation: send attempted and succeeded events recorded | 33 | **PASS / Done** | Privacy-safe event metadata with status before/after and actor/access mode |
| Production validation: review queue regressions after Phase 33 | 33 | **PASS / Done** | Handoff/send flow, digests, review queue, client claims, evidence briefs, auth, break-glass, both cron endpoints unchanged |
| Operator review of external Mind payloads before send | 34 | **PASS / Done** | Review/approval fields, approve/reject/request-changes actions, send gating, blocked-send audit |
| Production validation: Supabase review fields migration applied | 34 | **PASS / Done** | `external_mind_handoffs` review/approval columns added |
| Production validation: pending review blocks send; approval enables test-sink send | 34 | **PASS / Done** | Two-step create → approve → send flow with durable send events |
| Production validation: review queue regressions after Phase 34 | 34 | **PASS / Done** | Handoff/send flow, digests, review queue, client claims, evidence briefs, auth, break-glass, both cron endpoints unchanged |
| Watchtower narrative from Mind digest | 35 | **PASS / Done** | Deterministic digest interpretation, durable storage, `/mind-digests` UI, optional handoff `watchtower_narrative` section |
| Production validation: Supabase watchtower narratives migration applied | 35 | **PASS / Done** | `evidence_mind_watchtower_narratives` table created |
| Production validation: narrative generation + duplicate prevention | 35 | **PASS / Done** | One narrative per digest/type/version; repeat generation reuses existing |
| Production validation: handoff includes watchtower_narrative when present | 35 | **PASS / Done** | Phase 34 approval gate and test-sink send chain unchanged |
| Production validation: review queue regressions after Phase 35 | 35 | **PASS / Done** | Digests, handoff/send, review queue, client claims, evidence briefs, auth, break-glass, both cron endpoints unchanged |

---

## Current System State After Phase 35

The POC is a validated **internal alpha** for evidence monitoring and operator review. Production-validated capabilities include:

| Capability | Status |
|------------|--------|
| Evidence query engine | Working |
| Contextual appraisal and signal classification | Working |
| Durable Supabase watchlist persistence | Working |
| Scheduled cron trigger (`/api/watch/cron`, `CRON_SECRET`) | Working |
| Durable watch run logging | Working |
| Durable evidence alerts | Working |
| Claim-family search profiles | Working |
| Review item creation and persistence | Working |
| Internal review queue UI (`/review-items`) | Working |
| Protected review APIs (`/api/review-items*`) | Working |
| Supabase operator magic-link login (`/review-login` → `/auth/callback`) | Working |
| Workspace membership model and scoping | Working |
| Operator session panel (email, workspace scope, access mode) | Working |
| Operator logout | Working |
| Break-glass internal token access | Working |
| Operator login eligibility pre-check and server-side diagnostics | Working |
| Review item status-change audit trail (`evidence_review_item_audit_events`) | Working |
| Read-only audit history in review item detail panel | Working |
| Operator notes on review items (`evidence_review_item_notes`) | Working |
| Append-only notes history in review item detail panel | Working |
| `note_added` audit events for operator note creation | Working |
| Durable client claim registry (`client_claims`) | Working |
| Internal client claims UI (`/client-claims`) | Working |
| Review item detail linking to durable client claims | Working |
| Controlled claim-family profile registry (`claim_family_profiles`) | Working |
| Durable claim-to-watchlist mappings (`client_claim_watchlist_mappings`) | Working |
| `/client-claims` mapping UI with controlled claim-family dropdown | Working |
| Durable-first affected-claim resolution in watch handoff (with in-memory fallback) | Working |
| Durable evidence change briefs (`evidence_change_briefs`) | Working |
| Affected client claim snapshots for briefs (`evidence_change_brief_claims`) | Working |
| Internal evidence briefs UI (`/evidence-briefs`) | Working |
| Deterministic/template-based evidence change brief generator | Working |
| Demo magnesium brief generation with durable Phase 27 mapping resolution | Working |
| Duplicate prevention for active briefs (same workspace + claim family) | Working |
| Durable Mind digests (`evidence_mind_digests`) | Working |
| Digest item snapshots (`evidence_mind_digest_items`) | Working |
| Internal Mind digests UI (`/mind-digests`) | Working |
| Deterministic/template-based watchtower digest generator | Working |
| Demo digest generation (last 7 days, manual trigger) | Working |
| Duplicate prevention for active digests (same workspace + period) | Working |
| Scheduled Mind digest generation (`/api/mind-digests/run-due`, `CRON_SECRET`) | Working |
| Digest generation source tracking (`manual` / `scheduled`) | Working |
| External Mind handoff payloads (`external_mind_handoffs`) | Working |
| Privacy-safe digest-to-Mind payload builder (`mind_digest_payload_v1`) | Working |
| `/mind-digests` handoff creation UI + JSON preview | Working |
| Duplicate prevention for active handoffs (same digest + destination + payload version) | Working |
| External Mind send disabled by default (no external Animoca Mind call in Phase 31) | Working |
| Disabled-by-default external Mind send config (`ENABLE_EXTERNAL_MIND_SEND`) | Working |
| Test-sink handoff send with durable status + send result metadata | Working |
| `/mind-digests` test-sink send action + send result display | Working |
| Resend guard for already-sent handoffs | Working |
| Durable external Mind handoff send audit events (`external_mind_handoff_send_events`) | Working |
| Send helper audit logging for every handoff send attempt | Working |
| `/mind-digests` handoff send history section | Working |
| Operator review/approval for external Mind handoffs (`review_status`, approve/reject/request-changes) | Working |
| Send gating: only approved handoffs can be sent to test sink | Working |
| Blocked-send audit events for non-approved handoffs (`not_approved`) | Working |
| Durable watchtower narratives (`evidence_mind_watchtower_narratives`) | Working |
| Deterministic digest interpretation narrative generator | Working |
| `/mind-digests` watchtower narrative generation and detail display | Working |
| Optional `watchtower_narrative` section in external Mind handoff payloads | Working |

**Validated operator flow:** `/review-login` → magic link → `/auth/callback` → `/review-items`, with workspace scope enforced through `workspace_operator_memberships`. Status changes and note creation from the review queue UI write durable audit rows attributed by access mode (Supabase operator or break-glass). Authorized operators can manage workspace-scoped client claims and claim-to-watchlist mappings at `/client-claims`, view or generate evidence change briefs at `/evidence-briefs`, view or generate internal Mind digests at `/mind-digests`, generate evidence-constrained watchtower narratives from digests (deterministic templates only), create privacy-safe external Mind handoff payloads with optional `watchtower_narrative` when a narrative exists, review and approve payloads before send (Phase 34), and complete test-sink send with durable send audit history at `/mind-digests`. Real external Animoca Mind delivery remains disabled unless future server configuration explicitly enables it.

**Validated production chain (Phases 29–35):** watchlist → evidence alert → review item → affected client claims → evidence brief → Mind digest → durable watchtower narrative → external Mind handoff payload (including `watchtower_narrative` when present) → operator approval → test-sink send → send audit log.

---

## Known Limitations (Current)

| Limitation | Notes |
|------------|-------|
| Operator membership is manually seeded | No self-service onboarding |
| Client claim entry is manual and form-heavy | `/client-claims` claim-family mapping uses controlled profiles; other fields (`claim_source_type`, `risk_level`, status) still allow too much free-text input |
| Client claims are a storage foundation only | Long-term workflow should not depend on one-by-one manual entry; claim extraction from source material is a future requirement (Phase 26.5 / Phase 32 planning) |
| In-memory claim mapper retained as fallback | Durable mapping lookup preferred in async handoff path; sync path and empty-mapping fallback still use in-memory demo mapper |
| Watchlist configuration is developer-driven | Not yet client-operable |
| Review queue has no note editing/deletion | Notes are append-only internal review notes |
| Mind digests are internal-only (Phase 29–30) | No external Animoca Mind call; scheduled generation is internal/template-based only |
| External Mind handoffs are payload-only (Phase 31) | Creates durable `mind_digest_payload_v1` packages; no external send, notifications, or LLM narrative |
| External Mind send is disabled by default (Phase 32) | Test-sink send marks handoffs `sent` locally; real Animoca Mind HTTP send requires explicit env enablement + endpoint/API key |
| Send audit events are separate from handoff status (Phase 33) | Durable send history per attempt; still no real external Animoca delivery, notifications, or LLM narrative |
| External Mind handoff send requires operator approval (Phase 34) | New handoffs start `pending_review`; only `approved` handoffs can send to test sink; no real Animoca delivery |
| Watchtower narratives are template-only (Phase 35) | Deterministic interpretation from digest snapshots; no LLM narrative; no external Mind call |
| Mind digest generation is template-only | Manual demo action and scheduled cron; LLM enrichment planned for later phases |
| No client-facing dashboard | Internal operator UI only |
| No reporting or export layer | No claim-risk memos or monthly summaries |
| No notification system | Email/alerts to operators or clients not built |
| Break-glass token sees all workspaces | Intentional emergency fallback |
| Evidence change briefs are template-only | No LLM generation yet; manually triggered via demo action — not yet auto-triggered by watch/cron |
| Safer wording in briefs is limited/static | Available where pre-defined; not dynamically generated per claim |

---

## Remaining Gaps Before Serious Mind Integration

Before Evidence Mind can operate as a client-facing evidence governance product integrated with Animoca Mind, these gaps must be closed in order:

1. **Evidence appraisal reliability** — appraisal rules and retrieval need deeper consistency before client-facing risk statements.
2. **Client claim ingestion at scale** — durable registry exists, but claims are entered manually; future phases should extract claims from spa menus, product descriptions, labels, websites, marketing copy, and similar source material with operator review before registry insertion (planned as Phase 26.5 or Phase 32).
3. **Watchlist operability** — claim-family watchlists remain developer-configured; clients cannot yet manage monitored topics.
4. **Review governance workflow** — operator notes and status audit trail are in place; note editing/deletion and richer decision rationale fields remain future work.
5. **Claim-to-evidence linkage** — durable claim-to-watchlist mappings validated in Phase 27.
6. **Structured evidence briefs** — template-based brief generator validated in Phase 28; LLM enrichment and automatic watch-triggered generation remain future work.
7. **Mind digest / feed** — internal durable Mind Digests, scheduled generation, watchtower narratives, external Mind handoff payloads (with optional `watchtower_narrative`), disabled-by-default send stub, send audit trail, and operator payload review before send validated in Phases 29–35; real external Animoca Mind delivery remains opt-in via env configuration (Phase 36+).
8. **Client dashboard definition** — requirements for client-facing UX are undefined.
9. **Reporting and export** — no exportable evidence reports or monitoring summaries.
10. **Notifications** — no delivery layer for operator or client alerts.

---

## Forward Roadmap — From Internal Alpha to Evidence Mind Operating System

This section defines the proposed build sequence from the current internal alpha toward a Mind-integrated evidence operating system. Phase 36 is **planned, not started**. Phases 26–35 are production-validated.

### Completed near-term foundation (Phases 26–30)

#### Phase 27 — Claim-to-Watchlist Mapping

**Status:** PASS / Production validated

**Goal:** Map client claims to evidence watchlists / claim families so evidence changes can identify affected client claims.

**Why:** This is the bridge from “new evidence found” to “which client wording is affected?”

---

### Completed near-term foundation (Phase 26)

**Status:** PASS / Production validated

**Goal:** Create a durable database-backed registry of client claims per workspace.

**Scope delivered:**
- Durable `client_claims` table and store
- Workspace-scoped `/client-claims` internal UI (list, create, status update)
- Review item detail linking to durable claims when `client_claim_id` resolves
- Demo seed claim for `demo-workspace-spa-menu`
- Privacy-safe claim output and workspace/break-glass authorization

**Production validation note:** Manual client-claim entry works, but the current form allows too much free-text input. Fields such as `claim_family`, `claim_source_type`, `risk_level`, and status should become controlled, validated values to reduce operator error.

**Future design requirement:** Phase 26 is a storage/registry foundation only. The long-term product workflow should not depend on manually entering claims one by one. Future phases should support claim extraction from spa menus, product descriptions, labels, websites, marketing copy, and similar source material, with operator review before claims are added to the durable registry. Track as **Phase 26.5** (near-term UX hardening) or **Phase 32** (source-material claim extraction pipeline) during planning.

---

#### Phase 28 — Evidence Change Brief Generator

**Status:** PASS / Production validated

**Goal:** When a watchlist detects meaningful evidence change, generate a structured brief:

- what changed
- why it matters
- evidence summary
- affected claim families
- affected client claims
- risk implication
- suggested safer wording
- recommended operator action

**Why:** This is where Evidence Mind becomes useful to operators and clients.

---

#### Phase 29 — Mind Digest / Watchtower Summary

**Status:** PASS / Production validated

**Goal:** Generate a Mind-readable digest summarizing:

- new evidence detected
- claim families affected
- review items created
- pending operator actions
- unresolved risk issues
- recommended next actions

**Why:** This becomes the operating feed for Animoca Evidence Mind.

**Architecture note (Phase 29):** Phase 29 creates internal durable Mind Digests from the app’s own stored data using a deterministic/template-based generator. It does **not** call an external Animoca Mind and does **not** schedule automatic digest generation. External Mind handoff is planned for Phase 31 or later; scheduled digest generation is planned for Phase 30 or later.

---

#### Phase 30 — Scheduled Digest Generation

**Status:** PASS / Production validated

**Goal:** Automatically generate workspace Mind digests on a schedule (e.g. weekly), replacing manual demo-only triggers.

**Why:** Operators should receive periodic watchtower summaries without clicking generate each time.

**Architecture note (Phase 30):** Phase 30 schedules **internal** digest generation only via `/api/mind-digests/run-due` protected by `CRON_SECRET`. It reuses the Phase 29 deterministic generator and duplicate prevention. It does **not** call an external Animoca Mind and does **not** use LLM-generated narrative. External Mind handoff is Phase 31.

---

### Strategic Mind integration build plan (Phases 31–32)

Mind-facing outputs and client product definition — without overbuilding UI prematurely.

#### Phase 31 — External Mind Handoff / Animoca Mind Payload

**Status:** PASS / Production validated

**Goal:** Create a durable, privacy-safe handoff package from an Evidence Mind Digest for future external Mind/agent integration.

**Why:** This connects the internal watchtower to the Animoca Evidence Mind operating feed without autonomous external execution in Phase 31.

**Architecture note (Phase 31):** Phase 31 creates durable external Mind handoff payloads but does **not** send them automatically to an external Animoca Mind. External send remains disabled unless `ENABLE_EXTERNAL_MIND_SEND=true`, and no external endpoint is configured yet.

**Implementation summary (Phase 31):**

- Added durable external Mind handoff storage
- Added deterministic digest payload builder
- Added operator-visible handoff creation from digest
- Added safe JSON payload preview
- Added duplicate handoff prevention
- No external Animoca Mind call is made in Phase 31
- External send remains disabled/not implemented

**Next recommended phase:** Phase 36 — Watchtower Narrative History / Diff Layer (not started).

#### Phase 35 — Evidence Mind Watchtower Narrative / Persistent Interpretation Layer

**Status:** PASS / Production validated

**Goal:** Add the first Mind-like interpretation layer: durable, evidence-constrained watchtower narratives from Evidence Mind digests.

**Why:** Operators need a persistent explanation of what changed, why it matters, and what to do next — without calling an external Animoca Mind.

**Architecture note (Phase 35):** Phase 35 introduces the first persistent interpretation layer of Evidence Mind. It turns stored alerts, briefs, and digests into a durable watchtower narrative explaining what changed, why it matters, and what the operator should do next. This is the first Mind-like output layer, but it still runs inside lucient Evidence Mind and does not yet call an external Animoca Mind endpoint. Narratives are **deterministic/template-only** for now (no LLM generation).

**Implementation summary (Phase 35):**

- Added durable `evidence_mind_watchtower_narratives` storage
- Added deterministic/template narrative generator from digest + item snapshots
- Added `/mind-digests/generate-narrative` operator action and digest detail narrative display
- Added duplicate prevention per digest, narrative type, and version
- Extended external Mind handoff payloads with optional privacy-safe `watchtower_narrative` section when a narrative exists for the digest
- Preserved Phase 34 approval gating, Phase 32 test-sink send, Phase 33 send audit trail, and disabled-by-default external send guard
- No real Animoca Mind delivery, notifications, or LLM-written narrative

#### Phase 36 — Watchtower Narrative History / Diff Layer (planned)

**Status:** Planned (not started)

**Goal:** Compare the latest narrative against previous narratives for the same digest, claim family, or watchtower scope so Evidence Mind can identify whether interpretation changed over time — not just whether a new narrative exists.

#### Phase 34 — Operator Review of External Mind Payloads Before Send

**Status:** PASS / Production validated

**Goal:** Add an operator approval step before any external Mind handoff can be sent.

**Why:** Operators must review privacy-safe handoff payloads before test-sink or future external delivery.

**Architecture note (Phase 34):** Phase 34 adds operator review/approval before external Mind handoff send. It still does **not** perform real Animoca delivery.

**Implementation summary (Phase 34):**

- Added operator review/approval fields for external Mind handoffs
- Added pending review as the default state for new handoffs
- Added approve/reject/request-changes actions
- Added send gating so only approved handoffs can be sent
- Added blocked-send audit behavior for non-approved handoffs
- Preserved test-sink send behavior
- Preserved disabled-by-default external send guard
- No real Animoca Mind delivery is performed

#### Phase 33 — External Mind Send Audit Trail / Operator Send Log

**Status:** PASS / Production validated

**Goal:** Add a durable audit/event log for every external Mind handoff send attempt, separate from final handoff status.

**Why:** Operators need operational send history beyond handoff row state for governance and troubleshooting.

**Architecture note (Phase 33):** Phase 33 adds a durable send audit/event log for external Mind handoff send attempts. It still does **not** perform real external Animoca delivery.

**Implementation summary (Phase 33):**

- Added durable external Mind handoff send events table
- Added server-side send event logging
- Added send attempted/succeeded/blocked/already-sent event capture
- Added operator-visible send history
- Preserved Phase 32 test-sink send behavior
- Preserved disabled-by-default external send guard
- No real Animoca Mind delivery is performed

#### Phase 32 — External Mind Send Stub / Disabled-by-Default Integration

**Status:** PASS / Production validated

**Goal:** Add safe sending framework around Phase 31 handoffs without enabling real external delivery by default.

**Why:** Operators need auditable send readiness, test-sink behavior, and future external endpoint configuration without autonomous external execution.

**Architecture note (Phase 32):** Phase 32 adds disabled-by-default external Mind send plumbing and test-sink send behavior. It does **not** perform real external Animoca Mind delivery unless `ENABLE_EXTERNAL_MIND_SEND=true` and endpoint/API key are configured.

**Implementation summary (Phase 32):**

- Added disabled-by-default external Mind send configuration
- Added server-only send helper/service
- Added test-sink transport behavior
- Added durable send metadata
- Added operator-visible test-sink send action
- Preserved Phase 31 handoff creation and duplicate prevention
- No real Animoca Mind call is made in Phase 32 unless future env vars explicitly enable it

---

## Completed Phase Records (Historical Detail)

## Phase 26 — Durable Client Claim Registry

**Status:** PASS / Production validated

**Purpose:** Create a durable workspace-scoped registry of client claims so Evidence Mind can store and manage the actual wellness/spa/product/marketing claims being monitored, without exposing secrets or private metadata.

### Implementation summary

- Added durable client claims table (`client_claims`)
- Added client claims store with create, list, lookup, and status update
- Added internal `/client-claims` UI with workspace-scoped operator/break-glass access
- Linked review item detail panel to durable claims when `client_claim_id` resolves
- Added demo seed claim for `demo-workspace-spa-menu`
- Added privacy-safe claim shaping and workspace authorization tests
- Updated phase marker to `26`

### Production validation (completed)

- Phase 26 migration was applied successfully.
- New table exists: `public.client_claims`.
- Demo seed claim exists for `demo-workspace-spa-menu` / `demo-claim-magnesium-stress-001`.
- Operator logged in and accessed `/client-claims`.
- Operator created a client claim manually via the internal UI.
- Operator updated claim status via the internal UI.
- Review item detail panel resolves linked durable client claim when present.
- Missing durable claim does not break review item detail.
- Existing Phase 24 audit trail and Phase 25 notes history still work.
- Supabase operator login, break-glass access, review APIs, and `/api/watch/cron` protection unchanged.
- No secrets, tokens, service-role keys, user UUIDs, raw internal payloads, or private metadata exposed.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531120000_create_client_claims.sql` |
| Claims store | `lib/watch/client-claims-store.ts` |
| Claims page/helpers | `lib/review/client-claims-page.ts`, `client-claims-constants.ts` |
| Internal UI | `app/client-claims/page.tsx`, `client-claims-view.tsx` |
| Form routes | `app/client-claims/create/route.ts`, `update-status/route.ts` |
| Review queue linking | `lib/review/review-queue-ui.ts`, `review-queue-console.tsx` |
| Phase marker | `lib/watch/watch-phase.ts` → `26` |
| Tests | `client-claims-store.test.ts`, `client-claims-page.test.ts`, linked-claim review queue tests |

### Tests / build

- `npm test` passed: 195/195
- `npm run build` passed

### Remaining limitations

- Manual client-claim entry only; current form allows too much free-text input.
- `claim_family`, `claim_source_type`, `risk_level`, and status should become controlled, validated values to reduce operator error.
- Phase 26 is a storage/registry foundation only; long-term workflow should not depend on one-by-one manual entry.
- Future requirement: claim extraction from spa menus, product descriptions, labels, websites, marketing copy, and similar source material, with operator review before registry insertion (plan as Phase 26.5 or Phase 32).
- No claim editing/deletion yet; status updates only.
- In-memory `client-claim-mapper.ts` retained as fallback; durable mapping lookup preferred in async handoff path.
- Phase 29 Mind digest production-validated.

---

- Phase 29 Mind digest production-validated.

---

## Phase 30 — Scheduled Digest Generation

**Status:** PASS / Production validated

**Purpose:** Automatically generate internal Evidence Mind Digests for configured workspaces on a protected schedule, reusing Phase 29 deterministic generation and duplicate prevention — without calling an external Animoca Mind or exposing secrets.

### Implementation summary

- Added protected scheduled digest endpoint (`/api/mind-digests/run-due`)
- Added Vercel cron wiring for scheduled digest generation
- Added scheduler module reusing `generateEvidenceMindDigestForWorkspace`
- Added `generation_source` column (`manual` / `scheduled`) on `evidence_mind_digests`
- Reused Phase 29 digest generation and duplicate prevention logic
- Updated `/mind-digests` UI to show digest generation source
- Preserved existing review queue, client claims, mappings, evidence briefs, notes, audit, auth, break-glass, and watch cron behavior
- Updated phase marker to `30`

**Architecture note:** Phase 30 schedules internal digest generation only. It does not call an external Animoca Mind and does not use LLM-written narrative.

### Production validation (completed)

- Vercel cron entry exists for `/api/mind-digests/run-due`.
- Existing Vercel cron entry for `/api/watch/cron` remains present.
- `/api/mind-digests/run-due` rejects unauthenticated/open browser requests without authorized cron credentials.
- `/api/mind-digests/run-due` accepts valid authorized Terminal request.
- Authorized endpoint returned expected JSON.
- Scheduled digest generation uses the Phase 29 deterministic digest generator.
- Duplicate active digest prevention remains working: existing active digest for the same workspace and period is skipped instead of duplicated.
- Supabase validation confirms only one active digest exists for the May 25–May 31, 2026 period.
- Older duplicate test digest was archived and does not block validation.
- Endpoint response is privacy-safe and does not expose secrets.
- `/mind-digests` remains working.
- `/review-items` remains working.
- `/client-claims` remains working.
- `/evidence-briefs` remains working.
- `/api/watch/cron` remains protected by `CRON_SECRET`.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531200000_add_evidence_mind_digests_generation_source.sql` |
| Scheduled endpoint | `app/api/mind-digests/run-due/route.ts` |
| Cron orchestration | `lib/mind-digest-cron.ts` |
| Scheduler | `lib/watch/evidence-mind-digest-scheduler.ts` |
| Generator reuse | `lib/watch/evidence-mind-digest-generator.ts` |
| Digest store | `lib/watch/evidence-mind-digest-store.ts` |
| Digest constants | `lib/review/evidence-mind-digest-constants.ts` |
| Internal UI | `app/mind-digests/mind-digests-view.tsx` |
| Vercel cron | `vercel.json` |
| Phase marker | `lib/watch/watch-phase.ts` → `30` |
| Tests | `mind-digest-cron.test.ts`, `evidence-mind-digest-scheduler.test.ts`, `run-due/route.test.ts` |

### Tests / build

- `npm test` passed: 281/281
- `npm run build` passed

### Remaining limitations

- Phase 30 schedules internal digest generation only.
- It does not call an external Animoca Mind.
- It does not use LLM-written narrative.
- It does not send email/Slack/client notifications.
- Real scheduled execution will occur on the Vercel cron schedule; production validation used manual authorized invocation of the same protected endpoint.
- Phase 31 external Mind handoff production-validated.

---

## Phase 31 — External Mind Handoff / Animoca Mind Payload

**Status:** PASS / Production validated

**Purpose:** Create durable, privacy-safe external Mind handoff payloads from Evidence Mind Digests so the internal watchtower can feed future Animoca Mind integration — without calling an external Mind, sending notifications, or exposing secrets.

### Implementation summary

- Added durable external Mind handoff storage (`external_mind_handoffs`)
- Added deterministic digest payload builder (`mind_digest_payload_v1`)
- Added handoff store, creator, duplicate prevention, and archive support
- Added `/mind-digests/create-handoff` operator action and digest detail handoff UI with JSON preview
- Added disabled-by-default external send stub
- Preserved existing review queue, client claims, mappings, evidence briefs, Mind digests, notes, audit, auth, break-glass, and both cron endpoints
- Updated phase marker to `31`

**Architecture note:** Phase 31 creates payloads only. It does not call an external Animoca Mind, send notifications, or use LLM-written narrative. Actual external Mind integration remains a later phase.

### Production validation (completed)

- Phase 31 migration was applied successfully.
- New table exists: `public.external_mind_handoffs`.
- `/mind-digests` loads for authenticated operator.
- Operator can create an external Mind handoff payload from an existing Evidence Mind Digest.
- Handoff row is recorded in `public.external_mind_handoffs`.
- Handoff uses `handoff_type = digest_summary`.
- Handoff uses safe non-external destination `test_sink`.
- Handoff uses `payload_version = mind_digest_payload_v1`.
- Handoff status is `ready`.
- `sent_at` remains null.
- `error_message` remains null.
- Payload JSON includes digest summary, digest period, counts, highest risk implication, recommended focus, affected claim families, affected client claims, digest item snapshots, referenced review items, referenced evidence briefs, source system, and phase metadata.
- Payload JSON is privacy-safe and does not include operator emails, auth user IDs, service-role keys, access tokens, magic-link data, `CRON_SECRET`, `INTERNAL_REVIEW_ACCESS_TOKEN`, or private env vars.
- Duplicate handoff prevention was tested: creating another handoff for the same digest/destination/payload version reuses or shows the existing active handoff rather than creating duplicate active rows.
- `/review-items` remains working.
- `/client-claims` remains working.
- `/evidence-briefs` remains working.
- `/mind-digests` remains working.
- `/api/watch/cron` remains protected.
- `/api/mind-digests/run-due` remains protected.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531210000_create_external_mind_handoffs.sql` |
| Handoff constants | `lib/review/external-mind-handoff-constants.ts` |
| Payload builder | `lib/watch/external-mind-handoff-payload-builder.ts` |
| Handoff store | `lib/watch/external-mind-handoff-store.ts` |
| Handoff creator | `lib/watch/external-mind-handoff-creator.ts` |
| External send stub | `lib/watch/external-mind-handoff-sender.ts` |
| Digests page/helpers | `lib/review/mind-digests-page.ts` |
| Internal UI | `app/mind-digests/mind-digests-view.tsx` |
| Handoff creation route | `app/mind-digests/create-handoff/route.ts` |
| Supabase client export | `engine/watchlist/supabase-client.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `31` |
| Tests | `external-mind-handoff-*.test.ts`, `mind-digests-page.test.ts`, `create-handoff/route.test.ts` |

### Tests / build

- `npm test` passed: 300/300
- `npm run build` passed

### Remaining limitations

- Phase 31 creates payloads only.
- It does not call an external Animoca Mind.
- It does not send notifications.
- It does not use LLM-written narrative.
- Actual external Mind integration remains a later phase.
- Phase 32 external Mind send stub production-validated.

---

## Phase 32 — External Mind Send Stub / Disabled-by-Default Integration

**Status:** PASS / Production validated

**Purpose:** Add disabled-by-default external Mind send plumbing and safe test-sink send behavior around Phase 31 handoffs — without real Animoca Mind delivery, notifications, or exposing secrets.

### Implementation summary

- Added disabled-by-default external Mind send configuration (`ENABLE_EXTERNAL_MIND_SEND`, `EXTERNAL_MIND_ENDPOINT_URL`, `EXTERNAL_MIND_API_KEY`)
- Added server-only send orchestration with workspace/status guards
- Added test-sink transport behavior that marks handoffs `sent` without network calls
- Added durable send metadata (`send_attempted_at`, `send_result_json`)
- Added `/mind-handoffs/send` operator action and `/mind-digests` test-sink send UI
- Preserved Phase 31 handoff creation and duplicate prevention
- Updated phase marker to `32`

**Architecture note:** Phase 32 adds send plumbing only. It does not perform real Animoca Mind delivery unless future env configuration explicitly enables it.

### Production validation (completed)

- Phase 32 migration was applied successfully.
- `/mind-digests` loads for authenticated operator.
- Existing Phase 31 handoff payload was visible.
- Test-sink send action was available for a ready `test_sink` handoff.
- Test-sink send completed successfully.
- Handoff was marked as `sent`.
- `sent_at` was populated.
- `send_attempted_at` was populated.
- `send_result_json` was recorded and privacy-safe.
- `error_message` remained null.
- No external network call was required for `test_sink`.
- Real external send remained disabled by default.
- `ENABLE_EXTERNAL_MIND_SEND` was not enabled in production.
- Resend guard was tested or confirmed: already-sent handoffs cannot be resent accidentally.
- `/review-items` remains working.
- `/client-claims` remains working.
- `/evidence-briefs` remains working.
- `/mind-digests` remains working.
- `/api/watch/cron` remains protected.
- `/api/mind-digests/run-due` remains protected.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531220000_add_external_mind_handoffs_send_metadata.sql` |
| Send config | `lib/watch/external-mind-handoff-send-config.ts` |
| Send result types | `lib/review/external-mind-handoff-send-result.ts` |
| Send transport | `lib/watch/external-mind-handoff-sender.ts` |
| Send orchestration | `lib/watch/external-mind-handoff-send.ts` |
| Handoff store | `lib/watch/external-mind-handoff-store.ts` |
| Digests page/helpers | `lib/review/mind-digests-page.ts` |
| Internal UI | `app/mind-digests/mind-digests-view.tsx` |
| Send route | `app/mind-handoffs/send/route.ts` |
| Env example | `.env.local.example` |
| Phase marker | `lib/watch/watch-phase.ts` → `32` |
| Tests | `external-mind-handoff-send*.test.ts`, `external-mind-handoff-sender.test.ts`, `external-mind-handoff-store.test.ts`, `mind-digests-page.test.ts`, `send/route.test.ts` |

### Tests / build

- `npm test` passed: 317/317
- `npm run build` passed

### Remaining limitations

- Phase 32 adds send plumbing only.
- It does not perform real Animoca Mind delivery.
- It does not send notifications.
- It does not use LLM-written narrative.
- Real Animoca Mind HTTP requires explicit future configuration.
- Phase 33 external Mind send audit trail production-validated.

---

## Phase 33 — External Mind Send Audit Trail / Operator Send Log

**Status:** PASS / Production validated

**Purpose:** Record durable send audit events for every external Mind handoff send attempt, separately from handoff status — without real external Animoca delivery or exposing secrets.

### Implementation summary

- Added durable send events table (`external_mind_handoff_send_events`)
- Added send event constants, store, and privacy-safe shaping
- Wired Phase 32 send helper to write `send_attempted`, `send_succeeded`, `send_blocked`, `send_already_sent`, and `send_failed` events
- Added `/mind-digests` send history section for handoff send events
- Preserved Phase 31 handoff creation, Phase 32 test-sink send, and disabled-by-default external send guard
- Updated phase marker to `33`

**Architecture note:** Phase 33 adds send audit/event logging only. It does not perform real external Animoca delivery.

### Production validation (completed)

- Phase 33 migration was applied successfully.
- New table exists: `public.external_mind_handoff_send_events`.
- External Mind handoff flow was tested as a two-step process:
  1. Create Mind handoff payload.
  2. Send to test sink.
- Test-sink send created durable send audit events.
- Send attempt event was recorded.
- Send success event was recorded.
- Event records include workspace, handoff, digest, destination, payload version, event type, result, status before/after, timestamps, actor/access mode where available.
- Event result confirmed test-sink send behavior.
- Handoff status moved from `ready` to `sent`.
- Event metadata is privacy-safe and does not include service-role keys, API keys, access tokens, magic-link data, `CRON_SECRET`, `INTERNAL_REVIEW_ACCESS_TOKEN`, `EXTERNAL_MIND_API_KEY`, or private env vars.
- `/mind-digests` shows the handoff/send flow.
- `/review-items` remains working.
- `/client-claims` remains working.
- `/evidence-briefs` remains working.
- `/mind-digests` remains working.
- `/api/watch/cron` remains protected.
- `/api/mind-digests/run-due` remains protected.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531230000_create_external_mind_handoff_send_events.sql` |
| Send event constants | `lib/review/external-mind-handoff-send-event-constants.ts` |
| Send event store | `lib/watch/external-mind-handoff-send-event-store.ts` |
| Send audit helper | `lib/watch/external-mind-handoff-send-audit.ts` |
| Send orchestration | `lib/watch/external-mind-handoff-send.ts` |
| Digests page/helpers | `lib/review/mind-digests-page.ts` |
| Internal UI | `app/mind-digests/mind-digests-view.tsx` |
| Send route | `app/mind-handoffs/send/route.ts` |
| Supabase client export | `engine/watchlist/supabase-client.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `33` |
| Tests | `external-mind-handoff-send-event-store.test.ts`, `external-mind-handoff-send-audit.test.ts`, updated send/page tests |

### Tests / build

- `npm test` passed: 325/325
- `npm run build` passed

### Remaining limitations

- Phase 33 adds send audit/event logging only.
- It does not perform real Animoca Mind delivery.
- It does not send notifications.
- It does not use LLM-written narrative.
- Real external Mind delivery remains a later phase.
- Phase 34 operator review/approval production-validated.

---

## Phase 34 — Operator Review of External Mind Payloads Before Send

**Status:** PASS / Production validated

**Purpose:** Add an operator approval step before any external Mind handoff can be sent — without real Animoca Mind delivery, notifications, or LLM-written narrative.

### Implementation summary

- Added operator review/approval fields for external Mind handoffs
- Added pending review as the default state for new handoffs
- Added approve/reject/request-changes actions
- Added send gating so only approved handoffs can be sent
- Added blocked-send audit behavior for non-approved handoffs
- Preserved test-sink send behavior
- Preserved disabled-by-default external send guard
- Updated phase marker to `34`

**Architecture note:** Phase 34 adds operator review/approval before external Mind handoff send. It still does not perform real Animoca delivery.

### Production validation (completed)

- Phase 34 migration was applied successfully.
- `public.external_mind_handoffs` now supports review/approval fields.
- A previously sent handoff was archived to allow a fresh handoff to be generated for the same digest.
- A new handoff payload was created successfully.
- New handoff started as `status = ready` and `review_status = pending_review`.
- Send to test sink was disabled while the handoff was pending review.
- Operator approval was completed successfully.
- After approval, `review_status = approved`.
- `approved_at` was populated.
- `approved_by_actor_type = supabase_operator`.
- Send to test sink became available after approval.
- Approved test-sink send completed successfully.
- Handoff moved from `ready` to `sent`.
- `sent_at` was populated.
- `send_attempted_at` was populated.
- `send_result_json.result = test_sink_sent`.
- `send_result_json.test_sink_only = true`.
- `error_message` remained null.
- Send audit events were recorded in `public.external_mind_handoff_send_events`.
- Send attempt event was recorded.
- Send success event was recorded.
- Send success event recorded `result = test_sink_sent`.
- Send success event recorded `status_before = ready` and `status_after = sent`.
- Send event metadata is privacy-safe and does not include service-role keys, API keys, access tokens, magic-link data, `CRON_SECRET`, `INTERNAL_REVIEW_ACCESS_TOKEN`, `EXTERNAL_MIND_API_KEY`, or private env vars.
- `/review-items` remains working.
- `/client-claims` remains working.
- `/evidence-briefs` remains working.
- `/mind-digests` remains working.
- `/api/watch/cron` remains protected.
- `/api/mind-digests/run-due` remains protected.

### Notes

- In the current implementation, approval populates approval metadata fields.
- `reviewed_at` and `reviewed_by_actor_type` may remain null when the operator approves directly. This is acceptable for Phase 34 because the approval gate is functioning correctly.
- The `send_attempted` audit event may have `result = null`; the final result is recorded on the `send_succeeded` event. This is acceptable.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531240000_add_external_mind_handoffs_review_fields.sql` |
| Review constants | `lib/review/external-mind-handoff-constants.ts` |
| Send event constants | `lib/review/external-mind-handoff-send-event-constants.ts` (+ `not_approved` result) |
| Handoff store | `lib/watch/external-mind-handoff-store.ts` |
| Review actions | `lib/watch/external-mind-handoff-review.ts` |
| Send orchestration | `lib/watch/external-mind-handoff-send.ts` |
| Send audit helper | `lib/watch/external-mind-handoff-send-audit.ts` |
| Send result messages | `lib/review/external-mind-handoff-send-result.ts` |
| Digests page/helpers | `lib/review/mind-digests-page.ts` |
| Internal UI | `app/mind-digests/mind-digests-view.tsx` |
| Review route | `app/mind-handoffs/review/route.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `34` |
| Tests | `external-mind-handoff-review.test.ts`, updated send/store/page/route tests |

### Tests / build

- `npm test` passed: 337/337
- `npm run build` passed

### Remaining limitations

- Phase 34 adds approval gating only.
- It does not perform real Animoca Mind delivery.
- It does not send notifications.
- It does not use LLM-written narrative.
- Real external Mind delivery remains a later phase.
- Phase 35 watchtower narrative production-validated.

---

## Phase 35 — Evidence Mind Watchtower Narrative / Persistent Interpretation Layer

**Status:** PASS / Production validated

**Purpose:** Add the first Mind-like interpretation layer — durable, evidence-constrained watchtower narratives from Evidence Mind digests explaining what changed, why it matters, operator focus, recommended next action, and risk posture — without real Animoca Mind delivery, notifications, or LLM-written narrative.

> **Phase 35 summary:** Phase 35 added a durable, evidence-constrained watchtower narrative layer generated from Mind digests using deterministic templates. The narrative explains what changed, why it matters, operator focus, recommended next action, and risk posture, and is persisted for later comparison and handoff.

### Implementation summary

- Added durable watchtower narrative storage (`evidence_mind_watchtower_narratives`)
- Added deterministic/template narrative generator from digest and digest item snapshots only
- Added duplicate prevention per digest, narrative type, and version
- Added `/mind-digests/generate-narrative` operator action and digest detail narrative display
- Extended external Mind handoff payloads with optional privacy-safe `watchtower_narrative` section when a narrative exists for the digest
- Preserved Phase 34 approval-before-send gating, Phase 32 test-sink send, Phase 33 send audit trail, and disabled-by-default external send guard
- Updated phase marker to `35`

**Architecture note:** Phase 35 introduces the first persistent interpretation layer of Evidence Mind. It turns stored alerts, briefs, and digests into a durable watchtower narrative explaining what changed, why it matters, and what the operator should do next. This is the first Mind-like output layer, but it still runs inside lucient Evidence Mind and does not yet call an external Animoca Mind endpoint. Generation is **deterministic_template** only — no LLM-assisted narrative is enabled.

### Production validation (completed)

- Phase 35 migration was applied successfully.
- New table exists: `public.evidence_mind_watchtower_narratives`.
- Watchtower narrative can be generated from a Mind digest through the `/mind-digests` UI.
- Narrative generation uses deterministic templates only; no LLM generation is enabled.
- Narrative is evidence-constrained and based only on stored digest snapshots.
- Narrative does not provide medical advice and does not invent citations or external evidence.
- Narrative explains what changed, why it matters, operator focus, recommended next action, and current risk posture.
- Generated narrative was persisted successfully.
- Duplicate prevention works: one narrative per `digest_id` / `narrative_type` / `narrative_version`; repeated generation reuses the existing narrative rather than creating duplicates.
- New Mind handoff payload created after narrative generation includes a `watchtower_narrative` section.
- Phase 34 operator approval gate remains intact: send to test sink blocked until approval; after approval, test-sink send completed successfully; handoff marked `sent`.
- Real Animoca delivery remains disabled; external send remains disabled unless explicitly enabled in server configuration.
- `/review-items`, `/client-claims`, `/evidence-briefs`, `/mind-digests`, `/api/watch/cron`, and `/api/mind-digests/run-due` remain working and protected as before.

**Validated production example (privacy-safe fields only):**

- Digest title: Evidence Mind Digest — May 25 – May 31, 2026
- Workspace: `demo-workspace-spa-menu`
- Narrative type: `digest_interpretation`
- Narrative version: `watchtower_narrative_v1`
- Generation method: `deterministic_template`
- Risk posture: `monitor`
- Confidence level: `high`
- Handoff payload phase: `35`
- Destination: `test_sink`

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531250000_create_evidence_mind_watchtower_narratives.sql` |
| Narrative constants | `lib/review/evidence-mind-watchtower-narrative-constants.ts` |
| Narrative store | `lib/watch/evidence-mind-watchtower-narrative-store.ts` |
| Narrative generator | `lib/watch/evidence-mind-watchtower-narrative-generator.ts` |
| Handoff payload builder | `lib/watch/external-mind-handoff-payload-builder.ts` (+ optional `watchtower_narrative`) |
| Handoff creator | `lib/watch/external-mind-handoff-creator.ts` |
| Digests page/helpers | `lib/review/mind-digests-page.ts` |
| Internal UI | `app/mind-digests/mind-digests-view.tsx` |
| Generate narrative route | `app/mind-digests/generate-narrative/route.ts` |
| Supabase client export | `engine/watchlist/supabase-client.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `35` |
| Tests | `evidence-mind-watchtower-narrative-*.test.ts`, updated payload/creator/page/route tests |

### Tests / build

- `npm test` passed: 350/350
- `npm run build` passed

### Remaining limitations

- Phase 35 adds deterministic interpretation only (template-based; no LLM narrative).
- It does not perform real Animoca Mind delivery.
- It does not send notifications.
- Handoff payloads include `watchtower_narrative` only when a narrative already exists for the digest.
- Narrative history/diff across time is not yet implemented (Phase 36).
- Phase 36 has not started.

---

## Phase 29 — Mind Digest / Watchtower Summary

**Status:** PASS / Production validated

**Purpose:** Create a durable internal watchtower digest summarizing watch activity, evidence alerts, review items, evidence change briefs, affected claim families, and affected client claims for a workspace period — without calling an external Animoca Mind or exposing secrets.

### Implementation summary

- Added durable Evidence Mind digest storage (`evidence_mind_digests`)
- Added durable digest item snapshot storage (`evidence_mind_digest_items`)
- Added deterministic/template-based digest generator from stored watch runs, alerts, review items, briefs, and mappings
- Added `/mind-digests` internal page with list, detail panel, and digest item snapshots
- Added demo digest generation action (last 7 days for demo workspace)
- Added highest-risk ranking and recommended operator focus
- Added/fixed duplicate active digest prevention for same workspace and period (canonical period comparison, pre-insert lookup, partial unique index, duplicate-skip UI)
- Preserved existing review queue, client claims, mappings, evidence briefs, notes, audit, auth, break-glass, and cron behavior
- Updated phase marker to `29`

**Architecture note:** Phase 29 creates internal durable Mind Digests but does not call an external Animoca Mind and does not schedule automatic digest generation. External Mind handoff is Phase 31 or later; scheduled generation is Phase 30 or later.

### Production validation (completed)

- Phase 29 migration was applied successfully.
- New table exists: `public.evidence_mind_digests`.
- New table exists: `public.evidence_mind_digest_items`.
- `/mind-digests` loads for authenticated operator.
- Demo Mind Digest generation works.
- Generated digest is recorded in `public.evidence_mind_digests`.
- Digest item snapshots are recorded in `public.evidence_mind_digest_items`.
- Digest summarizes stored watchtower activity from existing evidence briefs, review items, affected claims, and related system data where available.
- Highest risk implication is populated.
- Recommended focus is populated.
- Duplicate active digest handling was tested and fixed: generating again for the same workspace and period now shows the existing digest instead of creating another duplicate.
- Supabase magic-link login remains working.
- Break-glass access remains available.
- `/review-items` remains working.
- `/client-claims` remains working.
- `/evidence-briefs` remains working.
- Existing Phase 24 audit trail remains working.
- Existing Phase 25 notes remain working.
- Existing Phase 26 client claims remain working.
- Existing Phase 27 mappings remain working.
- Existing Phase 28 evidence briefs remain working.
- `/api/watch/cron` remains protected by `CRON_SECRET`.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531180000_create_evidence_mind_digests.sql`, `20260531190000_add_evidence_mind_digests_active_period_unique_idx.sql` |
| Digest store | `lib/watch/evidence-mind-digest-store.ts` |
| Period helpers | `lib/review/evidence-mind-digest-period.ts` |
| Digest data collector | `lib/watch/evidence-mind-digest-data-collector.ts` |
| Digest generator | `lib/watch/evidence-mind-digest-generator.ts` |
| Digest constants | `lib/review/evidence-mind-digest-constants.ts` |
| Digests page/helpers | `lib/review/mind-digests-page.ts` |
| Internal UI | `app/mind-digests/page.tsx`, `mind-digests-view.tsx` |
| Demo generation route | `app/mind-digests/generate-demo/route.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `29` |
| Tests | `evidence-mind-digest-store.test.ts`, `evidence-mind-digest-generator.test.ts`, `evidence-mind-digest-period.test.ts`, `mind-digests-page.test.ts`, `generate-demo/route.test.ts` |

### Tests / build

- `npm test` passed: 267/267
- `npm run build` passed

### Remaining limitations

- Digest generation is template-only; no LLM generation yet.
- Manual demo generation remains available alongside scheduled internal generation (Phase 30).
- Phase 29 does not call an external Animoca Mind.
- External Mind handoff remains Phase 31.
- Duplicate prevention only blocks active `draft`/`ready_for_review` digests for the same workspace and period boundaries.

---

## Phase 28 — Evidence Change Brief Generator

**Status:** PASS / Production validated

**Purpose:** Generate durable internal Evidence Change Briefs when evidence changes affect a claim family/watchlist, explaining what changed, why it matters, which claims are affected, and recommended operator action — without exposing secrets or private metadata.

### Implementation summary

- Added durable evidence change brief storage (`evidence_change_briefs`)
- Added affected client claim snapshot storage (`evidence_change_brief_claims`)
- Added deterministic/template-based brief generator (no LLM required)
- Added `/evidence-briefs` internal page with list, detail panel, and affected claim snapshots
- Added demo magnesium brief generation action using durable Phase 27 mappings
- Added durable mapped client-claim resolution for brief snapshots
- Added duplicate prevention for active briefs (same workspace + claim family)
- Preserved existing review queue, client claims, mappings, notes, audit, auth, break-glass, and cron behavior
- Updated phase marker to `28`

### Production validation (completed)

- Phase 28 migration was applied successfully.
- New table exists: `public.evidence_change_briefs`.
- New table exists: `public.evidence_change_brief_claims`.
- `/evidence-briefs` loads for authenticated operator.
- Demo magnesium evidence brief generation works.
- Generated brief is recorded in `public.evidence_change_briefs`.
- Affected client claim snapshots are recorded in `public.evidence_change_brief_claims`.
- Brief uses durable Phase 27 claim-to-watchlist mappings.
- Brief displays claim family, evidence signal, risk implication, recommended action, safer wording where available, and affected client claim snapshots.
- Duplicate prevention works: attempting to generate a second active brief for the same workspace and claim family shows the existing brief instead of creating a duplicate.
- Supabase magic-link login remains working.
- Break-glass access remains available.
- `/review-items` remains working.
- `/client-claims` remains working.
- Existing Phase 24 audit trail remains working.
- Existing Phase 25 notes remain working.
- Existing Phase 26 client claims remain working.
- Existing Phase 27 mappings remain working.
- `/api/watch/cron` remains protected by `CRON_SECRET`.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531160000_create_evidence_change_briefs.sql` |
| Brief store | `lib/watch/evidence-change-brief-store.ts` |
| Brief generator | `lib/watch/evidence-change-brief-generator.ts` |
| Brief constants | `lib/review/evidence-change-brief-constants.ts` |
| Briefs page/helpers | `lib/review/evidence-briefs-page.ts` |
| Internal UI | `app/evidence-briefs/page.tsx`, `evidence-briefs-view.tsx` |
| Demo generation route | `app/evidence-briefs/generate-demo/route.ts` |
| Affected-claim resolver | `lib/watch/affected-client-claims-resolver.ts` (workspace filter + mapping confidence) |
| Phase marker | `lib/watch/watch-phase.ts` → `28` |
| Tests | `evidence-change-brief-store.test.ts`, `evidence-change-brief-generator.test.ts`, `evidence-briefs-page.test.ts`, `generate-demo/route.test.ts` |

### Tests / build

- `npm test` passed: 239/239
- `npm run build` passed

### Remaining limitations

- Brief generation is template-only; no LLM generation yet.
- Brief generation is manually triggered; not yet automatically triggered by watch/cron evidence changes.
- Duplicate prevention only blocks active `draft`/`ready_for_review` briefs for the same workspace and claim family.
- Safer wording is limited/static where available.
- Phase 30 scheduled digest production-validated.

---

## Phase 27 — Claim-to-Watchlist Mapping

**Status:** PASS / Production validated

**Purpose:** Create a durable mapping layer between client claims and evidence watchlists / claim families so the system can identify affected client claims when watchlists detect new evidence.

### Implementation summary

- Added controlled claim-family profile registry (`claim_family_profiles`)
- Added durable claim-to-watchlist mapping table (`client_claim_watchlist_mappings`)
- Added store modules for profile listing, mapping CRUD, and affected-claim resolution
- Extended `/client-claims` UI with mapping display, controlled claim-family dropdown, and mapping status updates
- Seeded `magnesium_cortisol_stress` profile and demo mapping for `demo-claim-magnesium-stress-001`
- Added async durable-first affected-claim resolution in review handoff with in-memory fallback
- Updated phase marker to `27`

### Production validation (completed)

- Phase 27 migration was applied successfully.
- New tables exist: `public.claim_family_profiles`, `public.client_claim_watchlist_mappings`.
- Seeded `magnesium_cortisol_stress` profile and demo mapping exist for `demo-workspace-spa-menu`.
- Operator logged in and accessed `/client-claims`.
- `/client-claims` shows existing claim-to-watchlist mappings with status and confidence.
- Operators map claims using controlled claim-family dropdown (not free-text family IDs).
- Mapping status updates (active/paused/archived) work via the internal UI.
- Durable mapping resolves affected client claims by `claim_family` in async watch handoff path.
- Missing durable mapping falls back safely to in-memory demo mapper without breaking handoff.
- Existing Phase 24 audit trail, Phase 25 notes, and Phase 26 client claims still work.
- Supabase operator login, break-glass access, review APIs, and `/api/watch/cron` protection unchanged.
- No secrets, tokens, service-role keys, user UUIDs, raw internal payloads, or private metadata exposed.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260531140000_create_claim_mappings.sql` |
| Profile store | `lib/watch/claim-family-profile-store.ts` |
| Mapping store | `lib/watch/client-claim-watchlist-mapping-store.ts` |
| Affected-claim resolver | `lib/watch/affected-client-claims-resolver.ts` |
| Mapping constants | `lib/review/claim-mapping-constants.ts` |
| Claims page/helpers | `lib/review/client-claims-page.ts` |
| Internal UI | `app/client-claims/client-claims-view.tsx` |
| Form routes | `app/client-claims/create-mapping/route.ts`, `update-mapping-status/route.ts` |
| Watch handoff | `lib/watch/evidence-review-handoff.ts`, `evidence-review-item-store.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `27` |
| Tests | `claim-family-profile-store.test.ts`, `client-claim-watchlist-mapping-store.test.ts`, `affected-client-claims-resolver.test.ts`, mapping route/page tests |

### Tests / build

- `npm test` passed: 217/217
- `npm run build` passed

### Remaining limitations

- Claim create form still allows free-text for some fields (`claim_source_type`, `risk_level`, etc.); only mapping uses controlled claim-family profiles.
- Mapping create does not auto-populate `watchlist_id` from profile `default_watchlist_id`.
- Sync handoff path still uses in-memory mapper; async cron persistence path uses durable-first lookup.
- Phase 29 Mind digest production-validated.

---

## Phase 25 — Operator Notes and Review Decision Rationale

**Status:** PASS / Production validated

**Purpose:** Add durable operator notes to review items so internal reviewers can record decision rationale alongside the existing status-change audit trail, without exposing secrets or private claim text.

### Implementation summary

- Added durable notes table for review item notes (`evidence_review_item_notes`)
- Added notes insert/list store
- Added operator note submission from the review queue UI (`POST /review-items/notes`)
- Added append-only notes history to the review item detail panel
- Added `note_added` audit event recording integrated with the Phase 24 audit store
- Extended audit history rendering to show note-related activity
- Added privacy-safe shaping for notes history
- Added tests for operator note creation, break-glass notes, cross-workspace blocking, notes history, and privacy-safe note output
- Updated phase marker to `25`

### Magic-link login fix (during Phase 25 validation)

During Phase 25 production validation, magic-link operator login exposed a PKCE/session-cookie persistence issue:

- The login send flow was changed so magic-link requests are handled through a route handler rather than the prior fragile Server Action flow.
- Additional auth callback diagnostics were added so future failures can distinguish rate limits, expired/reused OTP links, missing PKCE verifier, callback errors, and environment misconfiguration.
- Supabase also temporarily rate-limited auth emails during debugging, but this was an infrastructure throttle rather than an application failure.

### Production validation (completed)

- Phase 25 migration was applied successfully.
- New table exists: `public.evidence_review_item_notes`.
- Supabase magic-link operator login is working again.
- Operator logged in successfully via `/review-login`.
- Operator created a review note from `/review-items`.
- The note was recorded in `public.evidence_review_item_notes`.
- A matching `note_added` audit event was recorded in `public.evidence_review_item_audit_events`.
- Notes history appears in the review item detail panel.
- Audit history correctly shows note-related activity.
- Existing Phase 24 status-change audit trail still works.
- Review APIs remain protected.
- Break-glass access remains available.
- `/api/watch/cron` remains protected by `CRON_SECRET`.
- No secrets, tokens, magic-link URLs, auth codes, service-role keys, user UUIDs, raw payloads, or private claim text are exposed.

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260530170000_create_evidence_review_item_notes.sql` |
| Notes store | `lib/review/evidence-review-item-notes-store.ts` |
| Note creation + validation | `lib/review/review-item-note-create.ts` |
| Note audit recording | `lib/review/review-item-note-audit.ts` |
| Review queue UI page data | `lib/review/review-queue-ui.ts` — notes history loading |
| Review item detail panel | `app/review-items/review-queue-console.tsx` — notes form and history |
| UI note submission route | `app/review-items/notes/route.ts` |
| Audit store event types | `lib/review/evidence-review-item-audit-store.ts` — `note_added` |
| Magic-link send route | `app/review-login/send/route.ts` |
| Auth callback completion | `app/auth/callback/page.tsx`, `auth-callback-client.tsx`, `lib/supabase/complete-auth-callback.ts` |
| Auth callback diagnostics | `lib/supabase/auth-callback-diagnostics.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `25` |
| Tests | `review-item-note-create.test.ts`, `review-queue-notes-history.test.ts`, `app/review-items/notes/route.test.ts`, auth callback tests |

### Tests / build

- `npm test` passed: 179/179
- `npm run build` passed

### Remaining limitations

- Notes are append-only.
- No note editing/deletion yet.
- Notes are internal review notes only.
- Audit write for `note_added` remains best-effort.
- Phase 30 scheduled digest production-validated.

---

## Phase 24 — Operator Audit Trail for Review Queue Actions

**Status:** PASS / Done

**Purpose:** Add durable audit logging for review queue status changes so the system records who changed a review item, when, how they accessed the system, and what changed — without exposing secrets or private claim text.

### Implementation summary

- Added durable audit table for review item events (`evidence_review_item_audit_events`)
- Added audit insert/list store
- Added shared review item status update flow that writes audit events
- Added audit recording for both UI status updates (`POST /review-items/update`) and API status updates (`POST /api/review-items/[id]/status`)
- Added read-only audit history to the review item detail panel
- Added privacy-safe shaping for audit history
- Added tests for operator audit writes, break-glass audit writes, cross-workspace blocking, workspace-scoped audit history, and privacy-safe audit output
- Updated phase marker to `24`

### Production validation (completed)

- Supabase migration applied successfully
- New audit table exists: `public.evidence_review_item_audit_events`
- Operator login path works
- Operator changed a review item status from `/review-items`
- Status change created a durable audit row in Supabase
- Audit row includes `workspace_id`, `review_item_id`, `event_type`, `old_status`, `new_status`, actor/access fields, and `created_at`
- Audit history appears in the review item detail panel
- Existing review queue status update behavior still works
- Supabase Auth login remains working
- Break-glass access remains available
- Review APIs remain protected
- `/api/watch/cron` remains protected by `CRON_SECRET`
- No secrets, tokens, auth codes, service-role keys, raw payloads, private claim text, or user UUIDs are exposed

### Files / areas changed

| Area | Change |
|------|--------|
| Supabase migration | `20260530160000_create_evidence_review_item_audit_events.sql` |
| Audit store | `lib/review/evidence-review-item-audit-store.ts` |
| Audit recording | `lib/review/review-item-status-audit.ts` |
| Shared status update + audit write | `lib/review/review-item-status-update.ts` |
| Review queue UI page data | `lib/review/review-queue-ui.ts` — audit history loading |
| Review item detail panel | `app/review-items/review-queue-console.tsx` — audit history section |
| Review API status route | `app/api/review-items/[id]/status/route.ts` |
| UI status update route | `app/review-items/update/route.ts` |
| Phase marker | `lib/watch/watch-phase.ts` → `24` |
| Tests | `review-item-status-audit.test.ts`, `review-queue-audit-history.test.ts`, updated API/UI status tests |

### Tests / build

- `npm test` passed: 157/157
- `npm run build` passed

### Remaining limitations

- Audit writes are best-effort in Phase 24; status updates can still succeed if audit insertion fails
- Audit history is UI-only in the detail panel; no dedicated audit API yet
- Audit is status-change only
- `metadata` column exists but is not used yet
- Operator notes and decision rationale are not part of Phase 24

---

## Phase 23B — Operator Logout, Session Visibility, Access Denied UX, and Operator Login Diagnostics

**Status:** PASS / Done

**Purpose:** Make the internal review queue auth experience usable and clear, fix production operator login/session regressions, and add server-side diagnostics without changing the underlying auth model.

### Implementation summary

- Added internal auth status panel on `/review-items`
- Added Supabase operator logout (`POST /review-items/logout`)
- Improved blocked/access-denied UX on `/review-items`
- Added safe distinction between Supabase operator access and break-glass internal access
- Added operator login email normalization (trim + lowercase)
- Added service-role pre-check of Supabase Auth user by email before sending magic link
- Added workspace membership verification against `workspace_operator_memberships.user_id`
- Added server-side diagnostic logging for operator login failures
- Fixed Supabase Auth callback/logout route handlers to bind session cookies to redirect responses
- Improved error handling so Supabase send/config failures are no longer misrepresented as membership failures

### Important fix

The previous login flow called Supabase `signInWithOtp` directly with `shouldCreateUser: false` and returned a broad generic error for all failures. Phase 23B now verifies operator eligibility first and logs precise server-side diagnostic reasons such as:

- `auth_user_not_found`
- `workspace_membership_not_found`
- `magic_link_send_failure`
- `supabase_service_role_not_configured`

Client responses remain generic; diagnostics are server-side only.

### Production validation (completed)

- `/review-login` sends a Supabase magic link to an approved operator email
- Magic link redirects to the deployed `/auth/callback`
- Callback successfully creates the Supabase operator session
- Operator lands directly in `/review-items`
- Review queue displays the authenticated operator session panel
- Operator email is shown safely
- Workspace scope is shown safely as `demo-workspace-spa-menu`
- Logout works and redirects back to `/review-login`
- After logout, `/review-items` is blocked unless the operator logs in again or uses break-glass access
- Break-glass token path still works and shows break-glass access mode without exposing the token
- Unauthenticated `/api/review-items` remains blocked
- `/api/watch/cron` remains protected by `CRON_SECRET`
- No secrets, service-role values, auth codes, tokens, user UUIDs, raw payloads, or private claim text are exposed

### Files / areas changed

| Area | Change |
|------|--------|
| Review login flow | Eligibility pre-check, email normalization, diagnostics |
| Operator auth/session handling | Auth panel metadata, logout route |
| Supabase Auth callback handling | Response-bound session cookies, safe failure redirect |
| Operator login eligibility | `lib/review/operator-login-eligibility.ts` |
| Operator login diagnostics | `lib/review/operator-login-diagnostics.ts` |
| Review queue auth panel / logout UI | `review-queue-auth-panel.tsx`, blocked-page copy |
| Tests | Operator login, membership checking, diagnostics, logout, callback, break-glass |

### Tests / build

- `npm test` passed: 146/146
- `npm run build` passed

### Remaining limitations

- Operator membership is still manually seeded in Supabase
- No self-service operator onboarding UI yet
- No client-facing workspace administration UI yet
- No operator audit trail yet *(superseded by Phase 24)*
- Break-glass token still intentionally sees all workspaces
- Client claims remain demo/in-memory where applicable

---

## Phase 23A — Supabase Auth + Demo Workspace Membership

**Status:** PASS / Done

**Purpose:** Add the smallest real operator authentication layer using Supabase Auth magic link / email OTP, scoped to workspace memberships, while preserving the existing `INTERNAL_REVIEW_ACCESS_TOKEN` break-glass fallback.

### Implementation summary

- Added Supabase Auth magic-link operator login (`/review-login`, `/auth/callback`)
- Added workspace membership model (`workspaces`, `workspace_operator_memberships`)
- Added workspace-scoped review queue authorization via `lib/operator-auth.ts`
- Preserved existing internal token break-glass path
- Preserved cron protection (`CRON_SECRET` on `/api/watch/cron` only)
- Magic-link redirect uses `NEXT_PUBLIC_SITE_URL` when set (`lib/supabase/auth-redirect.ts`)

### Auth flow

```
Operator email → /review-login → Supabase magic link → /auth/callback → /review-items
                                                                    ↓
                              workspace_operator_memberships lookup → scoped queue

Break-glass (unchanged):
/review-items?access_token=<INTERNAL_REVIEW_ACCESS_TOKEN> → /review-items/access → cookie → full queue
```

### Supabase setup (completed)

- `workspaces` table created
- `workspace_operator_memberships` table created
- Demo workspace exists: `demo-workspace-spa-menu`
- Demo operator membership inserted for the approved operator user
- Supabase Auth URL Configuration updated:
  - Site URL: deployed Vercel URL
  - Redirect URL: deployed `/auth/callback`

### Production validation (completed)

- Supabase Auth magic-link login works
- Magic-link email redirects to the deployed Vercel callback URL, not localhost
- Authenticated operator lands in `/review-items`
- Operator is authorized through `workspace_operator_memberships`
- Demo operator can access the `demo-workspace-spa-menu` review queue
- Direct unauthenticated `GET /api/review-items` remains blocked
- Break-glass `INTERNAL_REVIEW_ACCESS_TOKEN` path remains available
- `/api/watch/cron` remains protected by `CRON_SECRET`
- Phase marker reports phase `23`
- No secrets are exposed

### Files changed

| File | Change |
|------|--------|
| `supabase/migrations/20260530150000_create_workspaces_and_operator_memberships.sql` | **New** — schema + demo workspace seed |
| `supabase/seed/demo_workspace_operator_membership.sql` | **New** — manual operator membership seed template |
| `lib/operator-auth.ts` | **New** — operator + break-glass auth resolution |
| `lib/operator-auth.test.ts` | **New** — workspace scope helper tests |
| `lib/operator-auth.api-auth.test.ts` | **New** — API auth: operator, token, CRON rejection |
| `lib/supabase/auth-server.ts` | **New** — `@supabase/ssr` server client |
| `lib/supabase/auth-redirect.ts` | **New** — production magic-link redirect URL resolution |
| `lib/workspace-operator-membership-store.ts` | **New** — `listWorkspaceIdsForOperator()` |
| `app/review-login/page.tsx`, `review-login-form.tsx`, `actions.ts` | **New** — magic link login |
| `app/auth/callback/route.ts` | **New** — auth code exchange |
| `lib/review/review-items-api.ts` | Workspace membership checks on get/update |
| `lib/review/review-queue-ui.ts` | Pass access context to list/update builders |
| `lib/watch/evidence-review-item-store.ts` | `workspace_ids` filter on list |
| `app/review-items/page.tsx` | `resolveReviewQueuePageAccess()` |
| `app/review-items/update/route.ts` | `resolveReviewQueueAccess()` |
| `app/review-items/review-items-access-blocked.tsx` | Optional login link |
| `app/api/review-items/*` | `authorizeReviewQueueApiRequest()` |
| `lib/watch/watch-phase.ts` | Phase marker `23` |
| `.env.local.example` | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` |
| `package.json` | `@supabase/ssr` dependency |
| Tests updated | review-items-api, review-items-routes, update route, review-queue-status-update, auth-redirect |

### Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase Auth client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase Auth client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Membership lookup, existing stores |
| `INTERNAL_REVIEW_ACCESS_TOKEN` | Server only | Break-glass fallback (unchanged) |
| `NEXT_PUBLIC_SITE_URL` | Public | Magic link redirect base (required in production) |

### Tests

- 116/116 tests passing
- Covers: unauthenticated blocked, token fallback, operator membership list/read/update, no-membership blocked, cross-workspace forbidden, CRON_SECRET rejected on review API, privacy fields hidden, production redirect URL resolution

### Remaining limitations

- Membership seeding is manual
- No self-service client signup
- No client-facing workspace UI
- No operator audit trail yet *(superseded by Phase 24)*
- Break-glass token still sees all workspaces
- Client claims remain demo/in-memory where applicable
- Logged-in user without membership treated as unauthorized (same as anonymous)
- RLS enabled on new tables but app uses service role (membership enforced in app code)
- No fine-grained roles beyond `operator` default

---

## Phase 22 — Workspace Operator Auth Planning

**Status:** PASS / Done (planning only; implementation in Phase 23A)

**Purpose:** Define the smallest safe path from the current internal-token POC gate toward real workspace-scoped operator authentication, without breaking Phase 21 behavior or building full SaaS auth yet.

### Current state (inspected)

| Area | Today |
|------|--------|
| Review UI | `/review-items` → `/review-items/access` → httpOnly cookie; `POST /review-items/update` |
| Review API | `authorizeInternalReviewApiRequest()` on `GET/POST /api/review-items*` |
| Internal gate | Single shared `INTERNAL_REVIEW_ACCESS_TOKEN` — no operator identity, no workspace scoping on auth |
| Data model | `evidence_review_items.workspace_id` + `client_claim_id` already persisted; client claims still in-memory demo (`lib/watch/client-claim-mapper.ts`) |
| Supabase | `evidence_review_items` has RLS enabled but no policies; app uses service role server-side only |
| Cron / tool APIs | `/api/watch/cron` → `CRON_SECRET`; `/api/query`, `/api/watch/check` → `EIE_TOOL_API_KEY` (unchanged) |

### Recommended auth approach

**Phase 23 should use Supabase Auth (magic link / email OTP) plus a small workspace membership allowlist — not passwords, not a custom user table, not token-in-URL for operators.**

| Option | Verdict |
|--------|---------|
| Supabase Auth magic links | **Recommended** — real operator identity, minimal UI, fits existing Supabase stack |
| Allowlisted operator emails only (no Auth) | Too weak — no durable session, hard to audit, does not scale to multiple workspaces |
| Full SaaS auth (roles, invites, billing) | **Deferred** — out of scope |
| Keep token-only | **Interim fallback only** — see below |

Why not implement Supabase Auth in Phase 22: this phase is planning only; Phase 21 production behavior must remain unchanged until Phase 23 is tested.

### Proposed schema additions (Phase 23)

Minimal new tables — no changes to existing migrations yet:

```sql
-- Workspace registry (promote workspace_id strings from demo to durable IDs)
public.workspaces (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Maps Supabase Auth users to workspaces they may operate on
public.workspace_operator_memberships (
  workspace_id text NOT NULL REFERENCES public.workspaces(id),
  operator_user_id uuid NOT NULL,  -- auth.users.id
  role text NOT NULL DEFAULT 'operator',  -- operator | admin
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, operator_user_id)
)
```

**Optional Phase 24 fields** on `evidence_review_items` (not required for first operator auth):

- `last_status_updated_by uuid NULL` (operator user id)
- `last_status_updated_at timestamptz` (if not inferrable from `updated_at`)

**Do not add yet:** client-facing user accounts, client workspace self-service signup, or RLS policies that would break the service-role server path before membership checks exist in app code.

### Operator identity mapping

| Entity | Mapping |
|--------|---------|
| **Operator** | Supabase Auth user (`auth.users.id`, email) |
| **workspace_id** | Operator may only read/update review items where `evidence_review_items.workspace_id` is in their `workspace_operator_memberships` rows |
| **review_items** | Already carry `workspace_id` — enforce membership filter in store/API after auth |
| **client_claim_id** | Stays a workspace-local identifier; operator sees privacy-safe fields only (Phase 19 boundary unchanged) |
| **claim_family** | Global watchtower concept — operators see items for their workspace only, not other tenants |
| **Future client workspaces** | Mind/app ingests claims into workspace-scoped tables; review handoff continues to write `workspace_id` + `client_claim_id`; operators never see global watchlist internals |

**Lucient internal admins** (optional): membership row in every workspace, or separate `platform_admin` env allowlist of Auth user IDs — smaller than a role system.

### What stays POC-only (for now)

- Global `INTERNAL_REVIEW_ACCESS_TOKEN` break-glass path (see below)
- In-memory `client-claim-mapper.ts` demo data
- `EIE_TOOL_API_KEY` server-to-server evidence API
- `CRON_SECRET` scheduled watchtower execution
- Claim-family watchlists without per-workspace tenancy
- No client/end-user login
- No email notifications
- No audit log UI

### What happens to `INTERNAL_REVIEW_ACCESS_TOKEN`

| Environment | Recommendation |
|-------------|----------------|
| **Production** | Keep temporarily as **break-glass / emergency admin fallback** behind env flag; not the primary operator login |
| **Local / dev** | Keep for fast testing without Supabase Auth setup |
| **Long term** | Remove once Supabase Auth + membership is validated in production (target Phase 24 or later) |

Phase 23 should **add** operator auth **alongside** the token gate (token OR valid operator session), then narrow token use after validation — not remove it on day one.

### Routes to protect under real auth (Phase 23)

| Route | Phase 21 today | Phase 23 target |
|-------|----------------|-----------------|
| `/review-items` | Internal review cookie / token bootstrap | Supabase Auth session required; token bootstrap optional fallback |
| `/review-items/access` | Sets internal review cookie from token | Sets operator session after magic link; token path retained briefly |
| `/review-items/update` | Internal review cookie | Operator session + workspace membership on target item |
| `/api/review-items` | Internal review cookie or bearer token | Operator session cookie or server bearer; **scope list to member workspaces** |
| `/api/review-items/[id]` | Same | Same + **403 if item.workspace_id not in membership** |
| `/api/review-items/[id]/status` | Same | Same + membership check on write |
| `/api/watch/cron` | `CRON_SECRET` only | **Unchanged** |
| `/api/query`, `/api/watch/check` | `EIE_TOOL_API_KEY` | **Unchanged** |

Implementation should extend `lib/internal-review-access.ts` (or add `lib/operator-auth.ts`) with a single `authorizeReviewOperatorRequest()` that resolves: operator session → allowed `workspace_id[]` → pass/fail.

### Phase 22 implements now vs Phase 23 defers

| Phase 22 (this phase) | Phase 23 (implementation) |
|-----------------------|---------------------------|
| Auth model decision documented | Supabase Auth magic-link login route |
| Schema proposal for workspaces + memberships | Migration + seed for demo workspace |
| Route/membership matrix | Enforce workspace filter in `listReviewItems` / get / update |
| Token fallback policy | Login UI + session cookie integration |
| Acceptance criteria for Phase 23 | Operator audit fields (optional) |
| No production behavior changes | Tests + production validation |

### Acceptance criteria for Phase 23 implementation

1. Operator signs in via Supabase Auth magic link (no shared token in URL for normal use).
2. Signed-in operator sees only review items for workspaces they belong to.
3. Operator cannot read or update a review item in another workspace (API returns `403`).
4. Unsigned-in requests to `/review-items` and `/api/review-items*` return `401`.
5. Phase 21 privacy boundary preserved — no `raw_payload`, private `claim_text`, or secrets in UI/API responses.
6. `/api/watch/cron` and `CRON_SECRET` behavior unchanged.
7. `INTERNAL_REVIEW_ACCESS_TOKEN` still works as configured break-glass fallback until explicitly retired.
8. Existing review queue UI flows work: list, filter, select, detail, status update, persist.
9. Tests cover unauthorized, cross-workspace, and authorized operator paths.

### Remaining limitations after Phase 23 (expected)

- Not full multi-tenant SaaS — manual membership seeding initially
- Client claims still demo/in-memory until workspace claim ingestion phase
- No fine-grained roles beyond `operator` / `admin`
- No operator action audit trail until a later phase

---

## Phase 21 — Review Queue API Hardening

**Status:** PASS / Done

**Purpose:** Harden review queue API routes so they cannot be accessed directly without internal review authorization.

### Implementation summary

- Hardened review queue API routes so they cannot be accessed directly without internal review authorization
- Protected routes:
  - `GET /api/review-items`
  - `GET /api/review-items/[id]`
  - `POST /api/review-items/[id]/status`
- Review API authorization uses `authorizeInternalReviewApiRequest()` in `lib/internal-review-access.ts`
- Authorization supports:
  - httpOnly internal review session cookie set by `/review-items/access`
  - `Authorization: Bearer <INTERNAL_REVIEW_ACCESS_TOKEN>` for server-side scripts only
- Review API no longer accepts `CRON_SECRET`
- Vercel cron user-agent is not accepted for review API access
- Unauthorized review API responses include `phase: "21"` and `internal_review_access_configured`, but do not expose secrets
- Expanded session cookie path to `/` so the UI session cookie is sent to `/api/review-items*` from the same browser
- Phase marker updated to `21`
- Review queue UI unchanged — still uses server-side store access, not client-side API calls

### Production validation (completed)

- Direct unauthenticated `GET /api/review-items` returns HTTP `401`
- Response confirms:
  - `"phase":"21"`
  - `"route":"/api/review-items"`
  - `"internal_review_access_configured":true`
  - `"message":"Unauthorized review queue API request."`
- `/api/watch/cron` remains protected without `CRON_SECRET`
- `/api/watch/cron` reports phase `21`
- `/review-items?access_token=<correct INTERNAL_REVIEW_ACCESS_TOKEN>` loads the review queue
- Review queue table loads
- Item selection works
- Detail panel works
- Status updates work
- Status updates persist
- No `raw_payload`, private `claim_text`, `CRON_SECRET`, or token values are exposed in the UI

### Files changed

| File | Change |
|------|--------|
| `lib/internal-review-access.ts` | `authorizeInternalReviewApiRequest`, unauthorized response builder, cookie path `/` |
| `lib/internal-review-access.api-auth.test.ts` | **New** — API auth helper tests |
| `lib/internal-review-access.test.ts` | Unauthorized response test |
| `app/api/review-items/route.ts` | Internal review auth instead of cron auth |
| `app/api/review-items/[id]/route.ts` | Internal review auth instead of cron auth |
| `app/api/review-items/[id]/status/route.ts` | Internal review auth instead of cron auth |
| `app/api/review-items/review-items-routes.test.ts` | **New** — route unauthorized/authorized tests |
| `app/review-items/access/route.test.ts` | Cookie path expectation updated |
| `lib/watch/watch-phase.ts` | Phase marker `21` |
| `lib/watch/watch-phase.test.ts` | Phase assertion updated |
| `docs/evidence-mind-roadmap.md` | Phase 21 record |

### Tests

- 99/99 tests passing
- Tests cover unauthorized reads/writes on review API routes
- Tests cover cookie and bearer authorization
- Tests cover `CRON_SECRET` rejection on review API
- Tests cover fail-closed behavior when token env is unset

### Remaining limitations

- No workspace auth yet
- No Supabase Auth yet
- No user accounts yet
- Internal review access remains a POC-level operator gate
- UI does not call review API from client JS — server-side store path unchanged; API hardening protects direct/curl access
- Automation must use `INTERNAL_REVIEW_ACCESS_TOKEN` bearer, not `CRON_SECRET`

---

## Phase 20.5 — Correct-Token Access and Review UI Regression Check

**Status:** PASS / Done

**Purpose:** Confirm Phase 20 route protection still allows operators with the correct internal token to use the review queue UI, without changing the auth model or adding new features.

### Production validation (completed)

- `/review-items` without token remains blocked
- `/review-items?access_token=wrong-token` remains blocked
- `/review-items?access_token=<correct INTERNAL_REVIEW_ACCESS_TOKEN>` loads the review queue
- Correct-token access redirects through `/review-items/access`
- Token stripped from visible URL; cookie-based revisit works
- Review item table, selection, detail panel, status update, and persist-after-refresh all work
- `/api/watch/cron` remains protected without `CRON_SECRET`
- No private fields or secrets exposed in UI

---

## Phase 20 — Internal Access Control / Route Protection for `/review-items`

**Status:** PASS / Done

- Internal route protection via `INTERNAL_REVIEW_ACCESS_TOKEN`
- httpOnly session cookie for ongoing UI access
- `POST /review-items/update` requires session cookie

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Phase 19 | Review queue UI uses server-only store access, not client-side `/api/review-items` calls | Avoids exposing `CRON_SECRET` in browser JavaScript |
| Phase 20 | Protect `/review-items` with `INTERNAL_REVIEW_ACCESS_TOKEN` query param + httpOnly cookie | Smallest safe change until workspace auth exists |
| Phase 20.5 | Move cookie write to `GET /review-items/access` Route Handler | Next.js 15 forbids `cookies().set()` in Server Components |
| Phase 21 | Replace cron auth on `/api/review-items*` with internal review auth | Review queue API should not be callable with `CRON_SECRET` alone |
| Phase 21 | Accept internal review cookie or Bearer `INTERNAL_REVIEW_ACCESS_TOKEN` on API routes | Reuses Phase 20/20.5 mechanism; no manual token in browser after UI login |
| Phase 21 | Set internal review cookie path to `/` | Same browser session must authorize both UI and API routes |
| Phase 21 | Leave `/api/watch/cron` on `CRON_SECRET` unchanged | Cron and review queue are separate authorization domains |
| Phase 21 | Record production API + UI regression as phase gate | Confirms review API is hardened and operator UI still works |
| Phase 22 | Plan Supabase Auth magic link + workspace membership before coding | Smallest incremental path; avoids breaking Phase 21 token gate |
| Phase 22 | Keep `INTERNAL_REVIEW_ACCESS_TOKEN` as break-glass fallback in Phase 23 | Safe migration; remove only after operator auth is production-validated |
| Phase 23A | Implement operator auth alongside break-glass token | Operator session first, then cookie/bearer fallback |
| Phase 23A | Enforce workspace scope in app code via membership store | Service-role path unchanged; no RLS policies on review items yet |
| Phase 23A | Magic link with `shouldCreateUser: false` | No public self-service signup |
| Phase 23A | Prefer `NEXT_PUBLIC_SITE_URL` for magic-link redirect | Prevents production login emails redirecting to localhost |
| Phase 23A | Record production validation as phase gate | Confirms operator auth works alongside break-glass fallback |
| Phase 23B | Bind Supabase session cookies to route-handler redirect responses | Fixes production callback/logout session persistence |
| Phase 23B | Verify operator eligibility before magic-link send | Auth user + membership pre-check via service role |
| Phase 23B | Log operator login failure reasons server-side only | Distinguish config, membership, and send failures without exposing secrets |
| Phase 23B | Record full operator login/logout production validation | Confirms end-to-end operator UX before audit trail phase |
| Strategic | Pause coding after Phase 23B; publish forward roadmap Phases 24–31 | Align build sequence before Mind integration work |
| Phase 24 | Durable audit table + privacy-safe audit history in review detail panel | Compliance-style traceability for status changes without exposing secrets |
| Phase 24 | Best-effort audit writes on status update | Status updates must not fail if audit insert fails; hardening deferred |
| Phase 24 | Record production validation as phase gate | Confirms audit trail works alongside operator auth and break-glass fallback |
| Phase 25 | Durable notes table + append-only notes history in review detail panel | Governance increment after audit trail without exposing secrets |
| Phase 25 | Best-effort `note_added` audit writes on note creation | Note creation must not fail if audit insert fails; hardening deferred |
| Phase 25 | Fix magic-link login send/callback flow during production validation | Restores operator login after PKCE/session-cookie persistence issue |
| Phase 25 | Record production validation as phase gate | Confirms notes, audit integration, auth, break-glass, API protection, and cron isolation |
| Phase 26 | Durable client claim registry + `/client-claims` UI | Workspace-scoped claim storage foundation before mapping/briefs |
| Phase 26 | Record production validation as phase gate | Confirms manual claim registry works alongside review queue, auth, and cron isolation |
| Phase 26 | Defer controlled claim-form UX to Phase 26.5 planning | Production validation showed too much free-text input for family/source/risk/status |
| Phase 26 | Defer source-material claim extraction to Phase 26.5 / Phase 32 planning | Registry foundation only; long-term workflow must not rely on one-by-one manual entry |
| Phase 27 | Claim-to-watchlist mapping + controlled claim-family profiles | Durable bridge from evidence changes to affected client claims |
| Phase 27 | Record production validation as phase gate | Confirms mapping UI, durable resolution, and review queue regressions |
| Phase 28 | Evidence change brief generator + `/evidence-briefs` UI | Durable operator-facing briefs from claim-family evidence changes |
| Phase 28 | Record production validation as phase gate | Confirms brief generation, snapshots, duplicate prevention, and review queue regressions |
| Phase 29 | Internal Mind digest + `/mind-digests` UI | Durable watchtower operational summary from stored data |
| Phase 30 | Scheduled digest generation + `/api/mind-digests/run-due` | Protected internal scheduled Mind digest generation |
| Phase 30 | Record production validation as phase gate | **PASS / Done** — cron auth, duplicate skip, privacy-safe response, and regressions confirmed |
| Phase 31 | External Mind handoff payloads from digests | Durable privacy-safe `mind_digest_payload_v1` packages for future Animoca Mind integration |
| Phase 31 | Record production validation as phase gate | **PASS / Done** — handoff creation, duplicate prevention, privacy-safe payload, and regressions confirmed |
| Strategic | Mind integration plan: Phase 32 external Mind send stub | Disabled-by-default external send after payload validation |
| Phase 32 | External Mind send stub + test-sink send | Env-gated send plumbing without default external delivery |
| Phase 32 | Record production validation as phase gate | **PASS / Done** — test-sink send, send metadata, resend guard, disabled external send, and regressions confirmed |
| Strategic | Mind integration plan: Phase 33 send audit trail | Operator-visible send log after disabled-by-default send validation |
| Phase 33 | External Mind send audit trail + operator send log | Durable send events separate from handoff status |
| Phase 33 | Record production validation as phase gate | **PASS / Done** — two-step handoff/send flow, send events, privacy-safe metadata, and regressions confirmed |
| Strategic | Mind integration plan: Phase 34 operator payload review | Pre-send operator review before external Mind delivery |
| Phase 34 | Operator review/approval before external Mind handoff send | Review fields, approve/reject/request-changes, send gating, blocked-send audit |
| Phase 34 | Record production validation as phase gate | **PASS / Done** — pending review blocks send, approval enables test-sink send, send events, privacy-safe metadata, and regressions confirmed |
| Strategic | Mind integration plan: Phase 35 watchtower narrative | First persistent interpretation layer from digests |
| Phase 35 | Watchtower narrative / persistent interpretation layer | Deterministic templates, durable storage, optional handoff section |
| Phase 35 | Record production validation as phase gate | **PASS / Done** — narrative generation, duplicate prevention, handoff `watchtower_narrative`, Phase 34 send chain, regressions confirmed |
| Strategic | Mind integration plan: Phase 36 narrative history / diff | Compare narratives over time for interpretation change detection |
| 2026-05-31 | Phase 33 implemented; send events table, send helper audit wiring, mind-digests send history (pending production validation) |
| 2026-05-31 | Phase 33 marked PASS / Production validated; two-step handoff/send flow, send events, privacy-safe metadata, and regressions confirmed |
| 2026-05-31 | Phase 32 implemented; send config, test-sink send, send metadata migration, `/mind-handoffs/send`, mind-digests send UI (pending production validation) |
| 2026-05-31 | Phase 32 marked PASS / Production validated; test-sink send, send metadata, resend guard, disabled external send, and regressions confirmed |

---

## Next Recommended Step

**Phase 36 — Watchtower Narrative History / Diff Layer**

Phase 35 is production-validated. Next build step:

1. Design narrative history/diff storage and comparison semantics for digest, claim family, and watchtower scope.
2. Surface whether interpretation changed over time versus only whether a new narrative row exists.
3. Preserve Phase 35 deterministic narrative generation and Phase 34 approval-before-send gating.
4. Keep test-sink send and disabled-by-default external send as the safe default path.

---

## Document History

| Date | Change |
|------|--------|
| 2026-05-30 | Initial roadmap created; Phase 20 recorded as PASS / Done |
| 2026-05-30 | Phase 20.5 marked PASS / Done; production operator regression completed |
| 2026-05-30 | Phase 21 recorded as PASS; review queue API hardening implemented |
| 2026-05-30 | Phase 21 marked PASS / Done; production API and UI regression validation completed |
| 2026-05-30 | Phase 22 planning complete; workspace operator auth proposal documented for Phase 23 |
| 2026-05-30 | Phase 23A implemented; Supabase Auth operator login + workspace membership scoping |
| 2026-05-30 | Phase 23A marked PASS / Done; production operator login and workspace scoping validated |
| 2026-05-30 | Phase 23B marked PASS / Done; operator UX, login diagnostics, and full login/logout cycle validated |
| 2026-05-30 | Strategic forward roadmap added (Phases 24–31); current system state and Mind integration gaps documented |
| 2026-05-30 | Phase 24 implemented; operator audit trail for review queue status changes |
| 2026-05-30 | Phase 24 marked PASS / Done; production audit migration, status-change audit rows, and detail panel history validated |
| 2026-05-31 | Phase 25 implemented; operator notes, notes history, and `note_added` audit integration |
| 2026-05-31 | Phase 25 marked PASS / Production validated; notes migration, note creation, audit integration, and magic-link login fix validated |
| 2026-05-31 | Phase 26 implemented; durable client claim registry, `/client-claims` UI, review-item claim linking (pending production validation) |
| 2026-05-31 | Phase 26 marked PASS / Production validated; manual claim registry, review-item linking, and controlled-value/extraction design notes recorded |
| 2026-05-31 | Phase 27 implemented; claim family profiles, durable claim-to-watchlist mappings, `/client-claims` mapping UI, async handoff integration (pending production validation) |
| 2026-05-31 | Phase 27 marked PASS / Production validated; mapping migration, controlled dropdown, durable resolution, and review queue regressions confirmed |
| 2026-05-31 | Phase 29 implemented; Mind digests, digest item snapshots, `/mind-digests` UI, deterministic generator, demo digest action (pending production validation) |
| 2026-05-31 | Phase 29 marked PASS / Production validated; digest generation, item snapshots, duplicate prevention fix, and review queue regressions confirmed |
| 2026-05-31 | Phase 30 implemented; scheduled `/api/mind-digests/run-due`, generation source tracking, Vercel cron, Phase 29 generator reuse (pending production validation) |
| 2026-05-31 | Phase 30 marked PASS / Production validated; cron auth, duplicate skip, privacy-safe endpoint response, and regressions confirmed |
| 2026-05-31 | Phase 31 implemented; external Mind handoff table, payload builder, duplicate prevention, `/mind-digests` handoff UI, disabled external send stub (pending production validation) |
| 2026-05-31 | Phase 31 marked PASS / Production validated; handoff migration, payload creation, duplicate prevention, privacy-safe JSON, and regressions confirmed |
| 2026-05-31 | Phase 32 marked PASS / Production validated; test-sink send, send metadata, resend guard, disabled external send, and regressions confirmed |
| 2026-05-31 | Phase 33 implemented; send events table, send helper audit wiring, mind-digests send history (pending production validation) |
| 2026-05-31 | Phase 33 marked PASS / Production validated; two-step handoff/send flow, send events, privacy-safe metadata, and regressions confirmed |
| 2026-05-31 | Phase 34 implemented; review/approval fields, send gating, `/mind-handoffs/review`, mind-digests review UI (pending production validation) |
| 2026-05-31 | Phase 34 marked PASS / Production validated; pending review blocks send, approval enables test-sink send, send events, and regressions confirmed |
| 2026-05-31 | Phase 35 implemented; watchtower narratives table, deterministic generator, `/mind-digests/generate-narrative`, handoff payload narrative section (pending production validation) |
| 2026-05-31 | Phase 35 marked PASS / Production validated; narrative generation, duplicate prevention, handoff `watchtower_narrative`, Phase 34 approval/send chain, regressions confirmed |

---

## Documentation sync status

**Last sync:** after Phase 35 production validation (2026-05-31).

| Doc | Role after sync |
|-----|-----------------|
| **`docs/evidence-mind-roadmap.md`** | **Canonical** — current phase status, validation records, next step |
| **`docs/DEVELOPMENT_PHASES.md`** | Historical detail for Phases 1–20 + concise Phase 21–28 summary |
| **`README.md`**, **`docs/README.md`** | Current capabilities snapshot + links to roadmap |
| **`docs/MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md`** | Updated for durable mapping architecture (Phase 27) |
| **`docs/REVIEW_QUEUE_UI.md`**, **`docs/REVIEW_QUEUE_API.md`** | Original Phase 18–19 detail preserved; current-status notes added at top |
| **Phase-specific guides** (e.g. Phase 11–13 watchlist/cron docs) | **Historical** — accurate for the phase they describe; do not imply current product phase |

**Next build step:** Phase 36 — Watchtower Narrative History / Diff Layer (not started).

# lucient Evidence Mind — Roadmap

High-level phase plan, status tracking, and strategic direction for the Evidence Mind POC. For detailed deliverables and validation notes per completed phase, see [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md).

**Current phase marker (production):** `24`  
**Strategic status:** Internal alpha validated — Phase 24 operator audit trail complete; next near-term step is Phase 25 (operator notes).

---

## Roadmap at a Glance

| Horizon | Phases | Status | Focus |
|---------|--------|--------|-------|
| **Completed** | 1–24 | PASS / Done | Evidence engine, watchtower, review queue, operator auth, audit trail |
| **Near-term** | 25 | Planned | Operator notes and review decision rationale |
| **Medium-term** | 26–28 | Planned | Durable client claims, claim-to-watchlist mapping, evidence briefs |
| **Mind integration** | 29–31 | Planned | Mind digest, client dashboard requirements, reporting/export |

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

### Forward phases (planned)

| Phase | Name | Horizon | Status |
|-------|------|---------|--------|
| **25** | **Operator notes and review decision rationale** | Near-term | Planned |
| **26** | **Durable client claim registry** | Medium-term | Planned |
| **27** | **Claim-to-watchlist mapping** | Medium-term | Planned |
| **28** | **Evidence change brief generator** | Medium-term | Planned |
| **29** | **Mind digest / watchtower summary** | Mind integration | Planned |
| **30** | **Client workspace dashboard planning** | Mind integration | Planned (requirements only) |
| **31** | **Reporting and export layer** | Mind integration | Planned |

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
| Operator notes and review decision rationale | 25 | Planned | Near-term |
| Durable client claim registry | 26 | Planned | Medium-term |
| Claim-to-watchlist mapping | 27 | Planned | Medium-term |
| Evidence change brief generator | 28 | Planned | Medium-term |
| Mind digest / watchtower summary | 29 | Planned | Mind integration |
| Client workspace dashboard planning | 30 | Planned | Requirements only |
| Reporting and export layer | 31 | Planned | Mind integration |

---

## Current System State After Phase 24

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

**Validated operator flow:** `/review-login` → magic link → `/auth/callback` → `/review-items`, with workspace scope enforced through `workspace_operator_memberships`. Status changes from the review queue UI write durable audit rows attributed by access mode (Supabase operator or break-glass).

---

## Known Limitations (Current)

| Limitation | Notes |
|------------|-------|
| Operator membership is manually seeded | No self-service onboarding |
| Client claims are demo/in-memory in places | Not yet a durable product registry |
| Watchlist configuration is developer-driven | Not yet client-operable |
| Review queue has no operator notes | Status switcher and audit trail only — no decision rationale yet |
| No Mind digest or operating feed | Watchtower output is not yet Mind-readable at scale |
| No client-facing dashboard | Internal operator UI only |
| No reporting or export layer | No claim-risk memos or monthly summaries |
| No notification system | Email/alerts to operators or clients not built |
| Break-glass token sees all workspaces | Intentional emergency fallback |
| Evidence appraisal depth varies | Reliability and consistency need hardening for production claims |

---

## Remaining Gaps Before Serious Mind Integration

Before Evidence Mind can operate as a client-facing evidence governance product integrated with Animoca Mind, these gaps must be closed in order:

1. **Evidence appraisal reliability** — appraisal rules and retrieval need deeper consistency before client-facing risk statements.
2. **Client claim ingestion** — claims must move from demo/in-memory mapping to a durable, workspace-scoped registry.
3. **Watchlist operability** — claim-family watchlists remain developer-configured; clients cannot yet manage monitored topics.
4. **Review governance workflow** — audit trail is in place; operator notes and decision rationale are still missing for compliance-grade review.
5. **Claim-to-evidence linkage** — the bridge from “new evidence detected” to “which client wording is affected” is incomplete.
6. **Structured evidence briefs** — no generator for operator- or client-ready change summaries.
7. **Mind digest / feed** — no consolidated watchtower summary for Mind consumption.
8. **Client dashboard definition** — requirements for client-facing UX are undefined.
9. **Reporting and export** — no exportable evidence reports or monitoring summaries.
10. **Notifications** — no delivery layer for operator or client alerts.

---

## Forward Roadmap — From Internal Alpha to Evidence Mind Operating System

This section defines the proposed build sequence from the current internal alpha toward a Mind-integrated evidence operating system. Phases 25–31 are **planned, not started**. Phase 24 is complete and production-validated.

### Near-term build plan (Phase 25)

Operator workflow hardening on top of the validated auth, review queue, and audit trail foundation.

#### Phase 24 — Operator Audit Trail for Review Queue Actions

**Status:** PASS / Done

**Goal:** Record who changed review items, when, old status, new status, access mode, workspace, and optional metadata.

**Why:** Now that operator identity is known, the system needs compliance-style traceability for review decisions.

**Scope delivered:**
- Durable audit table and store for review item status changes
- Audit writes on UI and API status update paths
- Read-only audit history in the review item detail panel
- Privacy-safe audit shaping (no secrets, tokens, UUIDs, raw payloads, or private claim text exposed)

#### Phase 25 — Operator Notes and Review Decision Rationale

**Goal:** Allow operators to add review notes, decision rationale, recommended action, and optional escalation flags.

**Why:** The review queue should become a genuine evidence governance workflow, not just a status switcher.

**Scope notes:**
- Notes attached to review items within workspace scope
- Visible in operator review UI; privacy boundary unchanged

---

### Medium-term build plan (Phases 26–28)

Durable client claims and the evidence-to-claim intelligence layer.

#### Phase 26 — Durable Client Claim Registry

**Goal:** Create a durable database-backed registry of client claims per workspace.

Each claim should support:

- `workspace_id`
- `client_claim_id`
- claim text
- source/document/menu/page reference
- claim family
- status
- `created_at` / `updated_at`
- optional risk level

**Why:** Commercial value depends on monitoring actual client claims, not just abstract claim families.

#### Phase 27 — Claim-to-Watchlist Mapping

**Goal:** Map client claims to evidence watchlists / claim families so evidence changes can identify affected client claims.

**Why:** This is the bridge from “new evidence found” to “which client wording is affected?”

#### Phase 28 — Evidence Change Brief Generator

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

### Strategic Mind integration build plan (Phases 29–31)

Mind-facing outputs and client product definition — without overbuilding UI prematurely.

#### Phase 29 — Mind Digest / Watchtower Summary

**Goal:** Generate a Mind-readable digest summarizing:

- new evidence detected
- claim families affected
- review items created
- pending operator actions
- unresolved risk issues
- recommended next actions

**Why:** This becomes the operating feed for Animoca Evidence Mind.

#### Phase 30 — Client Workspace Dashboard Planning

**Goal:** Plan the client-facing dashboard separately from the internal operator dashboard.

**Do not build a polished client dashboard yet.** Define requirements only:

- monitored claims
- risk status
- evidence changes
- recommended rewrites
- reports/export
- review history

**Why:** Avoid overbuilding UI before the evidence workflow and claim registry are strong.

#### Phase 31 — Reporting and Export Layer

**Goal:** Create exportable evidence reports, claim-risk memos, and monthly monitoring summaries.

**Why:** This is likely the format hotel groups, spa brands, and wellness companies will actually value.

---

## Completed Phase Records (Historical Detail)

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
| Strategic | Near-term plan: Phase 25 (operator notes) | Next governance increment after audit trail |
| Strategic | Medium-term plan: Phases 26–28 (claims + mapping + briefs) | Evidence-to-claim intelligence layer |
| Strategic | Mind integration plan: Phases 29–31 (digest + dashboard planning + export) | Animoca Mind operating system outputs |

---

## Next Recommended Step

**Phase 25 — Operator Notes and Review Decision Rationale**

Resume implementation with the smallest governance increment after the validated audit trail:

1. Add durable storage for operator notes attached to review items within workspace scope.
2. Allow operators to record decision rationale, recommended action, and optional escalation flags.
3. Expose notes in the review item detail panel (privacy-safe fields only).
4. Preserve workspace scoping, break-glass path, audit trail, API protection, and cron isolation.
5. Add tests for operator-attributed notes, break-glass notes, cross-workspace blocking, and privacy-safe note output.

Do not start Phase 26 (client claim registry) until Phase 25 is validated.

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

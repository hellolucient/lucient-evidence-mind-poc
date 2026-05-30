# lucient Evidence Mind — Roadmap

High-level phase plan, status tracking, and decision log for the Evidence Mind POC. For detailed deliverables and validation notes per phase, see [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md).

**Current phase marker (production):** `21`

---

## Phase Plan

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
| **22** | **Workspace operator auth planning** | **Planning complete** |
| 23 | Workspace operator auth implementation | Planned |

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
| Workspace operator auth planning | 22 | **Planning complete** | Proposal documented; no code changes |
| Workspace operator auth implementation | 23 | Planned | |

---

## Phase 22 — Workspace Operator Auth Planning

**Status:** Planning complete (no implementation in this phase)

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

---

## Next Recommended Step

**Phase 23 — Workspace Operator Auth Implementation** (Supabase Auth magic link, `workspace_operator_memberships`, workspace-scoped review queue access).

---

## Document History

| Date | Change |
|------|--------|
| 2026-05-30 | Initial roadmap created; Phase 20 recorded as PASS / Done |
| 2026-05-30 | Phase 20.5 marked PASS / Done; production operator regression completed |
| 2026-05-30 | Phase 21 recorded as PASS; review queue API hardening implemented |
| 2026-05-30 | Phase 21 marked PASS / Done; production API and UI regression validation completed |
| 2026-05-30 | Phase 22 planning complete; workspace operator auth proposal documented for Phase 23 |

# lucient Evidence Mind — Roadmap

High-level phase plan, status tracking, and decision log for the Evidence Mind POC. For detailed deliverables and validation notes per phase, see [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md).

**Current phase marker (production):** `20` (Phase 20.5 fix pending deploy)

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
| **20.5** | **Correct-token access and review UI regression check** | **PASS** (fix pending deploy) |
| 21 | Review queue API hardening | Planned |

---

## Task / Status Table

| Item | Phase | Status | Notes |
|------|-------|--------|-------|
| Basic evidence query and appraisal engine | 1–7 | Done | |
| Watchlist runner and scheduled simulation | 8–10.5 | Done | |
| Supabase watchlist persistence | 11 | PASS | |
| Vercel Cron + `CRON_SECRET` auth | 12 | PASS | Unchanged in Phase 20 / 20.5 |
| Watch run logging | 13 | PASS | |
| Evidence alerts persistence | 14 | PASS | |
| Claim-family search profiles | 15 | PASS | |
| Signal classification | 16 | PASS | |
| Client claim mapping + review handoff | 17 | PASS | |
| Review queue API (`/api/review-items*`) | 18 | PASS | Still cron-auth only |
| Internal review queue UI (`/review-items`) | 19 | PASS | |
| Route protection for `/review-items` | 20 | PASS | `INTERNAL_REVIEW_ACCESS_TOKEN` |
| Production validation: public access blocked | 20 / 20.5 | PASS | No token → restricted message |
| Production validation: cron auth intact | 20 / 20.5 | PASS | Unauthorized without secret; `"phase":"20"` |
| Correct-token access regression | 20.5 | PASS (local) | Bug found and fixed; redeploy required for production |
| Review queue API hardening | 21 | Planned | |

---

## Phase 20.5 — Correct-Token Access and Review UI Regression Check

**Status:** PASS (with one minimal fix; production re-check after deploy)

**Purpose:** Confirm Phase 20 route protection still allows operators with the correct internal token to use the review queue UI, without changing the auth model or adding new features.

### Validation steps performed

| # | Check | Result |
|---|-------|--------|
| 1 | `/review-items` without token remains blocked | **PASS** (production + local) |
| 2 | `/review-items?access_token=wrong-token` remains blocked | **PASS** (production + local) |
| 3 | `/review-items?access_token=<correct token>` loads review queue UI | **PASS** (local after fix); production blocked by pre-fix bug — see below |
| 4 | Authorized session: table, selection, detail, status update auth path | **PASS** (local auth + POST path); full Supabase-backed persist flow relies on Phase 19 production validation |
| 5 | UI does not expose private fields or secrets | **PASS** — no `raw_payload`, no private `claim_text`, no `CRON_SECRET`, no token values in HTML; env var **names** only in operator error/help copy |
| 6 | `/api/watch/cron` unauthorized without secret; reports phase metadata | **PASS** (production) — `401`, `"phase":"20"`, `cron_secret_configured: true` |

### Issue found and fixed

Phase 20 initially set the httpOnly session cookie inside the `/review-items` Server Component. Next.js 15 rejects cookie writes outside Server Actions or Route Handlers, causing a **500** when a correct `access_token` was supplied.

**Minimal fix (auth model unchanged):**

- Added `GET /review-items/access` route handler — validates token, sets httpOnly cookie, redirects to clean `/review-items` URL
- Page now redirects valid token requests to that handler instead of setting cookies inline

### Files changed

| File | Change |
|------|--------|
| `app/review-items/access/route.ts` | **New** — token validation + cookie + redirect |
| `app/review-items/access/route.test.ts` | **New** — access route tests |
| `lib/internal-review-access.ts` | Redirect to access handler; cookie helper for Route Handler |
| `lib/internal-review-access.test.ts` | Path builder tests |

No changes to Supabase persistence, cron behavior, `/api/review-items*`, or client-side auth.

### Remaining limitations

- **Deploy required:** Production still runs pre-fix Phase 20 code until this fix is deployed; operators should re-verify correct-token access after deploy.
- **Local Supabase not configured:** Full table data, item selection against live rows, and status persist-after-refresh were not re-run locally; Phase 19 already validated those against production Supabase.
- **`/api/review-items*` remains cron-auth only** — not part of Phase 20.5 scope.

---

## Phase 20 — Internal Access Control / Route Protection for `/review-items`

**Status:** PASS / Done

### What was implemented

- Added simple internal route protection for `/review-items`
- Added support for `INTERNAL_REVIEW_ACCESS_TOKEN` (server-side only)
- `/review-items` is blocked when no token is provided
- `/review-items` is blocked when an invalid token is provided
- Valid token sets an httpOnly session cookie so filters and status updates work without exposing the token in client code
- `POST /review-items/update` requires the same server-side session cookie
- Existing cron protection remains intact
- Phase reporting now shows phase `20`

### Production validation (completed)

- `/review-items` without token shows restricted access message
- `/api/watch/cron` without `CRON_SECRET` returns unauthorized
- `/api/watch/cron` response includes `"phase":"20"`
- `/api/watch/cron` confirms `cron_secret_configured: true`

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Phase 19 | Review queue UI uses server-only store access, not client-side `/api/review-items` calls | Avoids exposing `CRON_SECRET` in browser JavaScript |
| Phase 20 | Protect `/review-items` with `INTERNAL_REVIEW_ACCESS_TOKEN` query param + httpOnly cookie | Smallest safe change until workspace auth exists; token never in client code or `NEXT_PUBLIC_` |
| Phase 20 | Do not change `/api/review-items*` auth or `CRON_SECRET` behavior | Cron/API protection and UI protection are separate concerns |
| Phase 20 | Fail closed when `INTERNAL_REVIEW_ACCESS_TOKEN` is unset | Unconfigured env blocks all review UI access |
| Phase 20.5 | Move cookie write to `GET /review-items/access` Route Handler | Next.js 15 forbids `cookies().set()` in Server Components; smallest fix preserving token + cookie model |

---

## Next Recommended Step

**Phase 21 — Review Queue API Hardening** (e.g. tighten operator auth, rate limits, or workspace-scoped access on `/api/review-items*`).

Before or in parallel: **deploy the Phase 20.5 cookie fix** and have an operator confirm correct-token access on production (`/review-items?access_token=<token>` → review queue loads, filters and status update persist).

---

## Document History

| Date | Change |
|------|--------|
| 2026-05-30 | Initial roadmap created; Phase 20 recorded as PASS / Done with production validation notes and Phase 20.5 optional follow-up |
| 2026-05-30 | Phase 20.5 recorded as PASS; cookie-set bug found and fixed via `/review-items/access` route handler |

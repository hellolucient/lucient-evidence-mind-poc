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
| 22 | Workspace operator auth | Planned |

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
| Workspace operator auth | 22 | Planned | |

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

---

## Next Recommended Step

**Phase 22 — Workspace Operator Auth** (replace interim internal token + cookie model with real workspace-scoped operator auth when ready).

---

## Document History

| Date | Change |
|------|--------|
| 2026-05-30 | Initial roadmap created; Phase 20 recorded as PASS / Done |
| 2026-05-30 | Phase 20.5 marked PASS / Done; production operator regression completed |
| 2026-05-30 | Phase 21 recorded as PASS; review queue API hardening implemented |
| 2026-05-30 | Phase 21 marked PASS / Done; production API and UI regression validation completed |

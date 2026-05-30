# lucient Evidence Mind — Roadmap

High-level phase plan, status tracking, and decision log for the Evidence Mind POC. For detailed deliverables and validation notes per phase, see [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md).

**Current phase marker (production):** `20`

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
| **20** | **Internal access control / route protection for `/review-items`** | **PASS / Done** |
| 20.5 | Confirm correct-token review UI access (optional) | Planned |
| 21 | Review queue API hardening | Planned |

---

## Task / Status Table

| Item | Phase | Status | Notes |
|------|-------|--------|-------|
| Basic evidence query and appraisal engine | 1–7 | Done | |
| Watchlist runner and scheduled simulation | 8–10.5 | Done | |
| Supabase watchlist persistence | 11 | PASS | |
| Vercel Cron + `CRON_SECRET` auth | 12 | PASS | Unchanged in Phase 20 |
| Watch run logging | 13 | PASS | |
| Evidence alerts persistence | 14 | PASS | |
| Claim-family search profiles | 15 | PASS | |
| Signal classification | 16 | PASS | |
| Client claim mapping + review handoff | 17 | PASS | |
| Review queue API (`/api/review-items*`) | 18 | PASS | Still cron-auth only |
| Internal review queue UI (`/review-items`) | 19 | PASS | |
| Route protection for `/review-items` | 20 | **PASS / Done** | `INTERNAL_REVIEW_ACCESS_TOKEN` |
| Production validation: public access blocked | 20 | **PASS** | No token → restricted message |
| Production validation: cron auth intact | 20 | **PASS** | Unauthorized without secret; `"phase":"20"` |
| Production validation: correct-token UI flow | 20.5 | **Optional / not fully tested** | See note below |
| Review queue API hardening | 21 | Planned | |

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

### Remaining optional check (Phase 20.5)

Correct-token browser access was **not fully tested** in the Phase 20 production validation pass. Public/unauthenticated access is confirmed blocked. Optional follow-up:

- Open `/review-items?access_token=<correct-token>` in production
- Confirm review queue UI loads, filters work, and status updates persist

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Phase 19 | Review queue UI uses server-only store access, not client-side `/api/review-items` calls | Avoids exposing `CRON_SECRET` in browser JavaScript |
| Phase 20 | Protect `/review-items` with `INTERNAL_REVIEW_ACCESS_TOKEN` query param + httpOnly cookie | Smallest safe change until workspace auth exists; token never in client code or `NEXT_PUBLIC_` |
| Phase 20 | Do not change `/api/review-items*` auth or `CRON_SECRET` behavior | Cron/API protection and UI protection are separate concerns |
| Phase 20 | Fail closed when `INTERNAL_REVIEW_ACCESS_TOKEN` is unset | Unconfigured env blocks all review UI access |
| Phase 20 validation | Record correct-token UI test as optional Phase 20.5 | Production pass confirmed public access blocked and cron intact; full operator flow deferred |

---

## Next Recommended Step

**Option A — Phase 20.5:** Confirm correct-token access and review UI functionality in production (load queue, filter, status update).

**Option B — Phase 21:** Review Queue API Hardening (e.g. tighten operator auth, rate limits, or workspace-scoped access on `/api/review-items*`).

Recommended order: complete **Phase 20.5** if operators need production UI access soon; otherwise proceed to **Phase 21**.

---

## Document History

| Date | Change |
|------|--------|
| 2026-05-30 | Initial roadmap created; Phase 20 recorded as PASS / Done with production validation notes and Phase 20.5 optional follow-up |

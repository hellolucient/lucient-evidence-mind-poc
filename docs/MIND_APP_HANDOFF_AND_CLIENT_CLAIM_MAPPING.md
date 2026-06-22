# Mind/App Handoff and Client Claim Mapping

> **Current architecture (Phases 27 + 39F).** For live phase status, see [evidence-mind-roadmap.md](./evidence-mind-roadmap.md). Phase 17 introduced the handoff concept; Phases 26–27 added durable client claims and mappings; Phase 39F validated production HelloMinds transport for external Mind handoffs.

Phase 17 introduced the bridge between abstract evidence monitoring and private client/workspace claims. Phase 27 completed the durable mapping layer.

## Why claim-family monitoring is separate from client claims

The watchtower monitors **claim families** — abstract evidence topics such as `magnesium_cortisol_stress`. These are shared, non-client-specific monitoring units with PubMed query strategies, baselines, and signal classification.

Client workspaces contain **private claims**: spa menu copy, product descriptions, campaign language, treatment notes, and other material that belongs to a specific workspace.

Keeping these layers separate protects privacy and keeps the scheduled runner simple:

| Layer | Sees | Does not see |
|-------|------|----------------|
| Scheduled runner / cron | Watch topic, claim family, query strategy, PMID metadata, signal classification, evidence alert IDs | Client exact wording, workspace private notes, brand confidential copy |
| App / Mind mapping layer | Workspace claims, source labels, review queues, handoff items, durable mappings | (Operates inside authenticated workspace context) |

## How `claim_family_id` maps to affected client claims

### Durable path (Phase 27 — preferred)

Production mapping uses durable Supabase tables:

| Table | Role |
|-------|------|
| `public.claim_family_profiles` | Controlled registry of known claim families (display names, default watchlist IDs) |
| `public.client_claim_watchlist_mappings` | Workspace-scoped links between `client_claim_id` and `claim_family` |
| `public.client_claims` | Durable client claim registry (Phase 26) |

**Resolution modules:**

- `lib/watch/affected-client-claims-resolver.ts` — durable-first lookup by `claim_family`
- `lib/watch/client-claim-watchlist-mapping-store.ts` — mapping CRUD
- `lib/watch/claim-family-profile-store.ts` — profile listing

When an evidence alert is created for `magnesium_cortisol_stress`, the resolver:

1. Queries `client_claim_watchlist_mappings` where `claim_family = magnesium_cortisol_stress` and `mapping_status = active`
2. Joins to `client_claims` where `status = active`
3. Returns affected workspace claims for handoff

Operators manage mappings at `/client-claims` using a controlled claim-family dropdown (not free-text family IDs).

**Migration:** `supabase/migrations/20260531140000_create_claim_mappings.sql`

### In-memory fallback (Phase 17 demo — retained)

- `lib/watch/client-claim-mapper.ts` — demo/sample mappings for local development and fallback
- `findAffectedClientClaimsForClaimFamily(claimFamilyId)` — **sync** in-memory lookup

The in-memory mapper is **not** the production path. It remains when:

- Supabase is not configured
- Durable mapping tables are empty or missing
- Sync handoff helpers call the in-memory path directly

### Async vs sync handoff paths

| Path | Lookup behavior |
|------|----------------|
| **Async** (cron persistence via `buildReviewItemsFromAlertCandidateAsync`) | **Durable-first**, then in-memory fallback |
| **Sync** (`buildReviewItemsForEvidenceAlert`) | In-memory fallback only |

Phase 28 (Evidence Change Brief Generator) will use durable Phase 27 mappings to identify affected client claims when generating briefs.

## What a review handoff item is

A review handoff item connects:

- an `evidence_alert_id` (and optional `watch_run_id`)
- a `claim_family_id`
- an affected `client_claim_id` / `workspace_id`
- signal classification fields (`signal`, `severity`, `human_review_required`, `client_claim_re_review_required`)
- a durable `status` (`open`, `acknowledged`, `in_review`, `resolved`, `dismissed`)
- a short `summary` for downstream review

Modules:

- `lib/watch/evidence-review-handoff.ts` — builds handoff item shapes
- `lib/watch/evidence-review-item-store.ts` — Supabase persistence

When `EIE_ENABLE_REVIEW_HANDOFFS=true` and Supabase is configured, new evidence alerts can also insert rows into `public.evidence_review_items`. The feature flag defaults to **off**, so production alert behavior is unchanged unless explicitly enabled.

Migration:

`supabase/migrations/20260530140000_create_evidence_review_items.sql`

Duplicate protection uses a unique index on `(evidence_alert_id, client_claim_id)`.

## Privacy boundary

The scheduled runner payload (cron summary, run-due/check responses) must not include private client claim text.

This boundary is preserved:

- Mapping and handoff modules live in the app/Mind layer, not in PubMed query or cron auth paths.
- `buildScheduledRunnerSafeHandoffSummary()` exposes IDs, claim family, signal fields, and summaries — not full `claim_text`.
- Durable claim text is available only in authenticated operator contexts (`/client-claims`, review detail linking).

## Completed since Phase 17

- Workspace-scoped operator auth (Phases 23A–23B)
- Review queue UI at `/review-items` with audit history and notes (Phases 24–25)
- Durable client claim registry at `/client-claims` (Phase 26)
- Durable claim-to-watchlist mappings with controlled profiles (Phase 27)

## Future work

- **Phase 28:** Evidence Change Brief Generator using durable mappings
- Client claim ingestion from menus, products, and campaigns (Phase 26.5 / Phase 32 planning)
- Notification rules and client-safe alerts
- Multi-client RLS policies beyond app-level workspace scoping

## Related docs

- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md) — canonical phase status
- [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md) — phase history
- [EVIDENCE_SIGNAL_CLASSIFICATION.md](./EVIDENCE_SIGNAL_CLASSIFICATION.md)

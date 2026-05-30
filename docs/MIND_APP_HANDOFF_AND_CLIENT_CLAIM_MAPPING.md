# Mind/App Handoff and Client Claim Mapping

Phase 17 introduces the bridge between abstract evidence monitoring and private client/workspace claims.

## Why claim-family monitoring is separate from client claims

The watchtower monitors **claim families** — abstract evidence topics such as `magnesium_cortisol_stress`. These are shared, non-client-specific monitoring units with PubMed query strategies, baselines, and signal classification.

Client workspaces contain **private claims**: spa menu copy, product descriptions, campaign language, treatment notes, and other material that belongs to a specific workspace.

Keeping these layers separate protects privacy and keeps the scheduled runner simple:

| Layer | Sees | Does not see |
|-------|------|----------------|
| Scheduled runner / cron | Watch topic, claim family, query strategy, PMID metadata, signal classification, evidence alert IDs | Client exact wording, workspace private notes, brand confidential copy |
| App / Mind mapping layer | Workspace claims, source labels, review queues, handoff items | (Operates inside authenticated workspace context) |

## How `claim_family_id` maps to affected client claims

Phase 17 v1 uses a lightweight mapping module:

- `lib/watch/client-claim-mapper.ts`

Core function:

```typescript
findAffectedClientClaimsForClaimFamily(claimFamilyId)
```

When an evidence alert is created for `magnesium_cortisol_stress`, the mapper returns affected client claims such as:

- **workspace_id:** `demo-workspace-spa-menu`
- **client_claim_id:** `demo-claim-magnesium-stress-001`
- **source_type:** `spa_menu_description`
- **source_label:** Demo Spa Magnesium Recovery Treatment

Unknown claim families return an empty list — no handoff items are created.

In production, this mapping will eventually be backed by workspace-scoped data. Phase 17 ships demo/sample mappings plus optional Supabase persistence for review items only.

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
- `lib/watch/evidence-review-item-store.ts` — optional Supabase persistence

When `EIE_ENABLE_REVIEW_HANDOFFS=true` and Supabase is configured, new evidence alerts can also insert rows into `public.evidence_review_items`. The feature flag defaults to **off**, so production alert behavior is unchanged unless explicitly enabled.

Suggested migration (run manually if not using Supabase CLI):

`supabase/migrations/20260530140000_create_evidence_review_items.sql`

Duplicate protection uses a unique index on `(evidence_alert_id, client_claim_id)`.

## Privacy boundary

The scheduled runner payload (cron summary, run-due/check responses) must not include private client claim text.

Phase 17 preserves this boundary:

- Mapping and handoff modules live in the app/Mind layer, not in PubMed query or cron auth paths.
- `buildScheduledRunnerSafeHandoffSummary()` exposes IDs, claim family, signal fields, and summaries — not full `claim_text`.
- Demo client claim wording exists only inside `client-claim-mapper.ts` and handoff `raw_payload` for workspace-context use.

## Future work (not in Phase 17)

- Real workspace UI for review queues
- Client claim ingestion from menus, products, and campaigns
- Notification rules and client-safe alerts
- Audit trails and role-based access
- Multi-client isolation and tenant-scoped RLS policies
- Automatic watch_run_id backfill on review items after cron logging
- Replacing demo mappings with workspace-backed client claim tables

## Related docs

- [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)
- [EVIDENCE_SIGNAL_CLASSIFICATION.md](./EVIDENCE_SIGNAL_CLASSIFICATION.md)

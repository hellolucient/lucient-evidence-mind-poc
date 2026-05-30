# Review Queue API

Phase 18 adds a minimal backend for managing evidence review handoff items created in Phase 17.

## Purpose

When Evidence Mind detects material evidence for a claim family, Phase 17 can map that alert to affected client/workspace claims and create a review handoff item.

Phase 18 makes those items manageable through simple API routes so the lucient app or Mind layer can:

- list review queue items
- inspect a single item
- update operator status (acknowledge, resolve, dismiss, etc.)

No UI is included in this phase.

## Relationship to Phase 17

| Phase | Responsibility |
|-------|----------------|
| **17** | Build handoff items from evidence alerts + claim-family mapping |
| **18** | List, fetch, and update review item status via API |

Automatic review item creation during cron remains behind `EIE_ENABLE_REVIEW_HANDOFFS` (default **off**). Phase 18 does not change that default.

## Supported statuses

- `open`
- `acknowledged`
- `in_review`
- `resolved`
- `dismissed`

Unsupported statuses are rejected with `unsupported_review_item_status`.

## API routes

All routes use the same internal auth as `/api/watch/cron`:

- `Authorization: Bearer CRON_SECRET`, or
- Vercel cron user-agent for scheduled/internal callers

### `GET /api/review-items`

List review items with optional filters:

| Query param | Description |
|-------------|-------------|
| `workspace_id` | Filter by workspace |
| `status` | Filter by review status |
| `claim_family` | Filter by claim family |
| `signal` | Filter by signal classification |
| `limit` | Max items (1–50, default 20) |

Example:

```bash
curl -s \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://lucient-evidence-mind-poc.vercel.app/api/review-items?status=open&limit=10"
```

### `GET /api/review-items/[id]`

Fetch one review item by UUID.

```bash
curl -s \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://lucient-evidence-mind-poc.vercel.app/api/review-items/REVIEW_ITEM_ID"
```

### `POST /api/review-items/[id]/status`

Update review item status.

```bash
curl -s -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"status":"acknowledged"}' \
  "https://lucient-evidence-mind-poc.vercel.app/api/review-items/REVIEW_ITEM_ID/status"
```

## Privacy boundary

API list/detail responses return privacy-safe fields only:

- `id`, `evidence_alert_id`, `watch_run_id`
- `workspace_id`, `client_claim_id`, `claim_family`
- `signal`, `severity`, `status`, `summary`
- `created_at`, `updated_at`

Responses do **not** include:

- `raw_payload` by default
- private client claim text (`claim_text`)
- scheduled runner payloads

Full client wording should remain in workspace-scoped authenticated app routes in a later phase.

## Storage and graceful failures

Review items are stored in `public.evidence_review_items` when the Phase 17 migration is applied:

`supabase/migrations/20260530140000_create_evidence_review_items.sql`

If Supabase is not configured or the table has not been migrated yet, API routes return useful errors such as:

- `supabase_not_configured`
- `evidence_review_items_table_missing`
- `review_item_not_found`

Optional demo seed SQL (manual only):

`supabase/seed/demo_evidence_review_item.sql`

Code-level demo fixture: `createDemoReviewItem()` in `lib/watch/evidence-review-item-store.ts`.

## Modules

| Module | Role |
|--------|------|
| `lib/watch/evidence-review-item-store.ts` | Supabase list/get/update + demo fixture |
| `lib/review/review-items-api.ts` | API response builders and filter parsing |
| `app/api/review-items/*` | Next.js route handlers |

## Future work

- Workspace-authenticated app routes (separate from cron-secret internal ops API)
- Review queue UI and operator dashboards
- Notification rules when status changes
- Audit trail for operator actions
- Role-based access and multi-tenant isolation
- Link review items to live client claim records after claim ingestion exists

## Related docs

- [MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md)
- [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)

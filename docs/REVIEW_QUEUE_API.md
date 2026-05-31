# Review Queue API

> **Current status note (post–Phase 27).** This doc was originally written for Phase 18 when routes used cron auth. Since **Phase 21**, `/api/review-items*` requires **Supabase operator session or break-glass `INTERNAL_REVIEW_ACCESS_TOKEN`** — not `CRON_SECRET`. The review queue also now includes audit trail, notes, and linked client claims. For current behavior, see [evidence-mind-roadmap.md](./evidence-mind-roadmap.md). Phase 18 API details below are updated where auth is described.

Phase 18 adds a minimal backend for managing evidence review handoff items created in Phase 17.

## Purpose

When Evidence Mind detects material evidence for a claim family, Phase 17 can map that alert to affected client/workspace claims and create a review handoff item.

Phase 18 makes those items manageable through simple API routes so the lucient app or Mind layer can:

- list review queue items
- inspect a single item
- update operator status (acknowledge, resolve, dismiss, etc.)

No UI is included in this phase (UI added in Phase 19; operator auth in Phases 21–23).

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

All routes require **operator session or break-glass internal review access** (Phase 21+):

- Supabase operator session cookie (magic-link login via `/review-login`), or
- `Authorization: Bearer INTERNAL_REVIEW_ACCESS_TOKEN`

`CRON_SECRET` is **not** accepted on review queue routes. Cron auth remains isolated to `/api/watch/cron` and related watch endpoints.

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
  -H "Authorization: Bearer YOUR_INTERNAL_REVIEW_ACCESS_TOKEN" \
  "https://lucient-evidence-mind-poc.vercel.app/api/review-items?status=open&limit=10"
```

> Prefer operator session cookie in browser contexts. Use break-glass bearer token for scripted internal ops only.

### `GET /api/review-items/[id]`

Fetch one review item by UUID.

```bash
curl -s \
  -H "Authorization: Bearer YOUR_INTERNAL_REVIEW_ACCESS_TOKEN" \
  "https://lucient-evidence-mind-poc.vercel.app/api/review-items/REVIEW_ITEM_ID"
```

### `POST /api/review-items/[id]/status`

Update review item status.

```bash
curl -s -X POST \
  -H "Authorization: Bearer YOUR_INTERNAL_REVIEW_ACCESS_TOKEN" \
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

- Evidence Change Brief Generator (Phase 28)
- Pagination and richer filtering
- Notification rules when status changes
- Role-based access beyond workspace membership

## Related docs

- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md)
- [MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md)
- [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)

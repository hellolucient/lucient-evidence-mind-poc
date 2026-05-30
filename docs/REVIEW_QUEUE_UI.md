# Review Queue UI

Phase 19 adds a minimal internal operator console for Evidence Mind review items.

## Route

**`/review-items`**

Linked from the home page (`/`). This is an internal POC console, not a client-facing product UI.

## What the UI does

The review queue page lets an operator:

1. View summary counts by status (`open`, `acknowledged`, `in_review`, `resolved`, `dismissed`)
2. Filter the queue by status, `workspace_id`, `claim_family`, and `signal`
3. Browse review items in a table
4. Select an item to inspect details in a side panel
5. Update review item status via operator action buttons

Data is loaded server-side from Supabase through the existing review item store (`listReviewItems`, `getReviewItemById`, `updateReviewItemStatus`). Status updates use a server action that calls the store directly.

## Fields shown

### List/table columns

- `status`
- `signal`
- `severity`
- `claim_family`
- `workspace_id`
- `client_claim_id`
- `summary` (truncated in the table)
- `updated_at`

### Detail panel

- `id`
- `status`
- `signal`
- `severity`
- `workspace_id`
- `client_claim_id`
- `claim_family`
- `evidence_alert_id`
- `watch_run_id`
- `summary`
- `created_at`
- `updated_at`

## Privacy boundary

The UI only renders **privacy-safe** review item shapes produced by `toPrivacySafeReviewItem`.

The page does **not** show:

- `raw_payload`
- private `claim_text`
- internal handoff flags such as `human_review_required` or `client_claim_re_review_required`

`CRON_SECRET` is never sent to the browser. The UI does not call `/api/review-items*` from client JavaScript with bearer auth. Server Components and Server Actions read/write through the store using server-only Supabase credentials.

## Auth handling (POC)

This phase intentionally does **not** add a full auth system.

- The Phase 18 API routes remain protected by cron auth (`CRON_SECRET` bearer or Vercel cron user-agent).
- The Phase 19 UI bypasses those HTTP routes and uses server-only store access instead.
- In production, restrict access to `/review-items` at the deployment/network layer until workspace operator auth exists.

## Empty and error states

The page shows helpful messages when:

- No review items match the current filters
- Supabase is not configured (`supabase_not_configured`)
- The `evidence_review_items` table is missing (`evidence_review_items_table_missing`)
- A selected item cannot be loaded (`review_item_not_found`)
- A status update fails (`unsupported_review_item_status` or other store errors)

## Known limitations

- Minimal styling only (inline styles, no design system)
- No pagination UI (store/API limit remains 50 items)
- Status summary cards count up to 50 items for the current non-status filters
- No workspace-scoped login or role-based access control
- No real-time updates; refresh happens after status changes via `router.refresh()`
- Does not enable automatic review handoff creation (`EIE_ENABLE_REVIEW_HANDOFFS` unchanged)

## Relationship to Phase 18 API

| Surface | Auth | Use case |
|---------|------|----------|
| `/api/review-items*` | Cron secret / Vercel cron UA | curl, automation, internal ops scripts |
| `/review-items` | Server-only Supabase access | browser operator console |

Both surfaces return the same privacy-safe item shape.

## Future work

- Workspace-scoped operator authentication
- Pagination and richer filtering (date range, severity)
- Deep links from Mind/app claim views into a pre-filtered queue
- Audit trail for operator status changes
- Optional read-only mode for non-operator stakeholders

See also:

- [REVIEW_QUEUE_API.md](./REVIEW_QUEUE_API.md)
- [MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md)
- [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)

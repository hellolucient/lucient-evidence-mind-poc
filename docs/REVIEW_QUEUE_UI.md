# Review Queue UI

> **Current status note (post–Phase 27).** This doc was originally written for Phase 19. The review queue has since gained **Supabase magic-link operator login**, **break-glass fallback**, **audit history**, **operator notes**, **linked durable client claim display**, and integration with **durable client claims/mappings**. For current behavior and validation status, see [evidence-mind-roadmap.md](./evidence-mind-roadmap.md) and the [README](../README.md) current capabilities section. The Phase 19 details below remain useful as historical UI reference.

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
6. View audit history and append-only notes in the detail panel (Phases 24–25)
7. See linked durable client claim when `client_claim_id` resolves (Phase 26)

Data is loaded server-side from Supabase through the existing review item store (`listReviewItems`, `getReviewItemById`, `updateReviewItemStatus`). Status updates and note submission use server-side route handlers with operator auth.

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

## Auth handling

> **Updated since Phase 19:** The review queue is **not** unauthenticated. Access requires Supabase operator login (`/review-login`) or break-glass `INTERNAL_REVIEW_ACCESS_TOKEN`. Workspace scope is enforced via `workspace_operator_memberships`.

- `/review-items` requires operator session or break-glass access (Phases 20–23)
- `/api/review-items*` uses operator/break-glass auth — **not** cron secret (Phase 21+)
- The UI uses server-only store access; `CRON_SECRET` is never sent to the browser
- Manage client claims and mappings at `/client-claims` (Phases 26–27)

### Historical note (Phase 19 origin)

The original Phase 19 design intentionally deferred full auth. Phases 21–23 superseded this with production operator login.

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
- No real-time updates; refresh happens after status changes
- Does not enable automatic review handoff creation (`EIE_ENABLE_REVIEW_HANDOFFS` unchanged)
- Notes are append-only (no edit/delete)

## Relationship to Phase 18 API

| Surface | Auth | Use case |
|---------|------|----------|
| `/api/review-items*` | Operator session or break-glass token | curl, automation, internal ops scripts |
| `/review-items` | Operator session or break-glass token | browser operator console |

Both surfaces return privacy-safe item shapes and enforce workspace scoping for operators.

See also:

- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md)
- [REVIEW_QUEUE_API.md](./REVIEW_QUEUE_API.md)
- [MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md](./MIND_APP_HANDOFF_AND_CLIENT_CLAIM_MAPPING.md)
- [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)

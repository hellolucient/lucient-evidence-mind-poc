# Phase 45 — Mind-Centered Claim Intelligence Layer

**Status:** Implemented (POC)  
**Migration:** `supabase/migrations/20260624120000_create_mind_claim_intelligence_phase45.sql`  
**UI:** `/source-intake` · Mind risk brief panel on `/client-claims`

## Scope

Phase 45 makes the external Mind / HelloMinds the central intelligence layer for:

1. **High-recall wellness claim extraction** from source copy
2. **Claim-level risk brief generation** for durable `client_claims`

The lucient Evidence Mind app remains the controlled operating layer:

- source intake
- database
- operator approval gates
- durable audit trail
- safe rendering
- cost reporting
- deterministic database state

Phase 44A rule-based extraction (`/claims/extract`) remains unchanged. Phase 45 adds a parallel Mind-powered pipeline.

## Database tables

| Table | Purpose |
|-------|---------|
| `source_intake_documents` | Saved source copy for Mind extraction |
| `mind_claim_extraction_jobs` | Operator-gated Mind extraction workflow state |
| `candidate_claims` | Parsed Mind extraction candidates (Phase 45 table; distinct from `candidate_wellness_claims`) |
| `mind_claim_risk_brief_jobs` | Operator-gated Mind risk brief workflow state |
| `mind_claim_risk_briefs` | Structured parsed risk briefs |
| `mind_claim_intelligence_audit_events` | Durable audit trail for Phase 45 entities |

Apply migration manually in Supabase SQL Editor if not using CLI migrations.

## API routes

### Source intake

| Method | Path |
|--------|------|
| `POST` | `/api/source-documents` |
| `GET` | `/api/source-documents` |
| `GET` | `/api/source-documents/[id]` |

### Mind extraction

| Method | Path |
|--------|------|
| `POST` | `/api/source-documents/[id]/mind-extraction-jobs` |
| `POST` | `/api/mind-extraction-jobs/[id]/approve` |
| `POST` | `/api/mind-extraction-jobs/[id]/send` |
| `POST` | `/api/mind-extraction-jobs/[id]/fetch-response` |
| `POST` | `/api/mind-extraction-jobs/[id]/parse` |
| `GET` | `/api/mind-extraction-jobs/[id]` |

### Candidate claims

| Method | Path |
|--------|------|
| `GET` | `/api/source-documents/[id]/candidate-claims` |
| `PATCH` | `/api/candidate-claims/[id]` |
| `POST` | `/api/candidate-claims/[id]/accept` |
| `POST` | `/api/candidate-claims/[id]/reject` |

### Mind risk briefs

| Method | Path |
|--------|------|
| `POST` | `/api/client-claims/[id]/mind-risk-brief-jobs` |
| `POST` | `/api/mind-risk-brief-jobs/[id]/approve` |
| `POST` | `/api/mind-risk-brief-jobs/[id]/send` |
| `POST` | `/api/mind-risk-brief-jobs/[id]/fetch-response` |
| `POST` | `/api/mind-risk-brief-jobs/[id]/parse` |
| `GET` | `/api/client-claims/[id]/mind-risk-briefs` |
| `GET` | `/api/mind-risk-briefs/[id]` |

All routes require operator session or break-glass token (same auth model as review queue).

## Safety model

| Constraint | Implementation |
|------------|----------------|
| No uncontrolled live send | `EXTERNAL_MIND_LIVE_SEND=false` default; send routes call HelloMinds transport with dry-run when false |
| No UI live-send toggle | Send buttons perform operator-gated API calls only; no env exposure in UI |
| Operator approval required | `review_status=approved` required before send |
| Explicit fetch/parse | No automatic polling, cron, retry, or batch send |
| Safe storage | No raw secrets, bearer tokens, full provider payloads, or unsafe HTML stored |
| Safe rendering | Mind text via `renderSafeMindTextBlock()` — plain text escape + HTML strip; no `dangerouslySetInnerHTML` |

## Prompt contracts

### `mind_claim_extraction_json_v1`

Prompt builder: `lib/watch/mind-claim-extraction-contract.ts`  
Parser: shared `lib/watch/mind-json-parser.ts` + Zod schema

Includes high-recall extraction doctrine (mechanism, evidence, regulation, editing tests) and implied-claims policy (extract both strong and soft claims when reasonably implied).

### `mind_claim_risk_brief_json_v1`

Prompt builder: `lib/watch/mind-claim-risk-brief-contract.ts`

Explicitly distinguishes ingredient, treatment, delivery-route, and branded ritual evidence; oral vs topical magnesium evidence for spa claims.

## Validation checklist

- [x] Extraction JSON parse success
- [x] Malformed JSON parse failure
- [x] Markdown-fenced JSON parse success
- [x] Wrong `contract_version` rejection
- [x] HTML/script text rendered safely
- [x] C1–C6 magnesium extraction fixture parses correctly
- [x] Parse success creates candidate claims exactly once (idempotent)
- [x] Parse failure creates no claims
- [x] Candidate accept creates durable `client_claims`
- [x] Risk brief JSON parse success / failure
- [x] Risk brief parse creates exactly one structured brief (idempotent)
- [x] Send blocked before approval
- [x] Send dry-run when `EXTERNAL_MIND_LIVE_SEND=false`
- [x] No auto retry, batch send, or scheduled behavior

Tests: `lib/watch/mind-claim-intelligence-phase45.test.ts`, `mind-claim-extraction-job-service.test.ts`, `mind-claim-risk-brief-job-service.test.ts`

## Manual demo script

1. Log in at `/review-login` (or use break-glass token).
2. Open `/source-intake`.
3. Paste demo copy (pre-filled):

   > Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance.

4. **Save source document** → **Create Mind extraction job** → **Approve** → **Send** (dry-run with `EXTERNAL_MIND_LIVE_SEND=false`).
5. After a live Mind reply exists: **Fetch Mind response** → **Parse response**.
6. Review candidate claims C1–C6 in the table; **Accept** desired claims into `client_claims`.
7. Open `/client-claims`; for an active claim use the **Mind Claim Risk Brief** panel.
8. Run create → approve → send → fetch → parse workflow.
9. Confirm key risk insight pattern:

   > oral magnesium evidence ≠ topical magnesium evidence ≠ branded ritual evidence

## Known limitations

- Mind extraction and risk brief depend on HelloMinds config (`ENABLE_EXTERNAL_MIND_SEND`, HelloMinds base URL, access key, target mind ID).
- Dry-run send records job state but does not deliver to HelloMinds until live send is intentionally enabled.
- Phase 45 `candidate_claims` is separate from Phase 44A `candidate_wellness_claims` / `wellness_claims` registry.
- Risk brief API uses `client_claims.id` (UUID), not the text `client_claim_id` slug.
- No PDF ingestion, webhooks, or non-PubMed regulatory sources in this phase.

## Related docs

- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md)
- [README.md](../README.md)

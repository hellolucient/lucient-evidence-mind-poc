# Phase 39B — HelloMinds Messaging Smoke Test

**Status:** **PASS** — local messaging validated (2026-06-12 UTC). See [Production validation (completed)](#production-validation-completed).

**Purpose:** Manually verify HelloMinds messaging API (`conversation`, `message`, `history`) using **synthetic text only**, without changing lucient Evidence Mind application behavior.

**Prerequisite:** [Phase 39A](./hellominds-connectivity-phase-39a.md) passed — target Mind **lucient** (mindId suffix `df11`, `isEnabled: true`).

**Phase marker:** `CURRENT_WATCH_PHASE` remains `"37"`. This procedure does not bump the watch phase or `payload_version`.

**Out of scope for Phase 39B:**

- App code, routes, sender logic, migrations, UI, or HelloMinds transport adapter implementation
- lucient handoff `payload_json` or any client data in `messageText`
- Changes to production or local app env used by lucient external send
- Phase 39C adapter design or implementation (unless explicitly approved)

---

## Do not change these during Phase 39B

Leave the following **unchanged** in Vercel, Supabase, and application configuration:

| Setting | Required state |
|---------|----------------|
| `EXTERNAL_MIND_LIVE_SEND` | `false` (or unset) |
| `ENABLE_EXTERNAL_MIND_SEND` | unchanged from current production |
| `EXTERNAL_MIND_ENDPOINT_URL` | unchanged |
| `EXTERNAL_MIND_API_KEY` | unchanged |
| Vercel environment variables | no HelloMinds keys added for app send |
| Supabase schema / data | no migrations or handoff sends for this test |
| App code / external sender | no commits for sender, routes, or adapter |

HelloMinds credentials for this test live **only in your local shell session**. Do not write them into `.env.local` for lucient external send unless explicitly approved in a later phase.

---

## Environment variables

Set in **local terminal only**. Never commit real values.

```bash
export HELLOMINDS_BASE_URL="https://api.build.hellominds.ai"
export HELLOMINDS_ACCESS_KEY="<Builder API key>"
export HELLOMINDS_TARGET_MIND_ID="<mindId — operator vault only>"
export HELLOMINDS_CONVERSATION_ALIAS="<caller-supplied test alias>"
```

| Variable | Required | Notes |
|----------|----------|-------|
| `HELLOMINDS_BASE_URL` | Yes | Default: `https://api.build.hellominds.ai` |
| `HELLOMINDS_ACCESS_KEY` | Yes | Header `X-Access-Key` — not `Authorization: Bearer` |
| `HELLOMINDS_TARGET_MIND_ID` | Yes | From Phase 39A; docs record suffix `df11` only |
| `HELLOMINDS_CONVERSATION_ALIAS` | Yes | **Caller-supplied** non-empty string; required by API |
| `HELLOMINDS_HUMAN_ID` | No | Not required for successful conversation creation (validated) |

---

## Approved synthetic messageText

Use **exactly** this string for Phase 39B message send — no client data:

```
lucient Evidence Mind connectivity ping. Synthetic test only. No client data.
```

---

## Manual curl — messaging endpoints

All requests use `X-Access-Key: ${HELLOMINDS_ACCESS_KEY}` and `Content-Type: application/json`.

### Step 1 — `POST /v1/messaging/conversation`

**Validated successful body shape:** `alias` + `mindId` (`humanId` not required).

```bash
curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
  -X POST \
  -H "X-Access-Key: ${HELLOMINDS_ACCESS_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "${HELLOMINDS_BASE_URL}/v1/messaging/conversation" \
  -d "$(cat <<EOF
{
  "alias": "${HELLOMINDS_CONVERSATION_ALIAS}",
  "mindId": "${HELLOMINDS_TARGET_MIND_ID}"
}
EOF
)"
```

**Validated failure without alias:** initial calls without `alias` returned HTTP **400**:

| Error field | Value |
|-------------|-------|
| type | `BAD_INPUT` |
| subtype | `VALIDATION_FAILED` |
| finding | `alias` is required and must be a non-empty string |

**Success (validated):** HTTP **200**; response fields `conversationId`, `alias`.

### Step 2 — `POST /v1/messaging/message`

**Validated successful body shape:** `alias`, `messageText`, `attachments: []`.

```bash
curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
  -X POST \
  -H "X-Access-Key: ${HELLOMINDS_ACCESS_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "${HELLOMINDS_BASE_URL}/v1/messaging/message" \
  -d "$(cat <<EOF
{
  "alias": "${HELLOMINDS_CONVERSATION_ALIAS}",
  "messageText": "lucient Evidence Mind connectivity ping. Synthetic test only. No client data.",
  "attachments": []
}
EOF
)"
```

**Success (validated):** HTTP **200**; response fields `conversationId`, `messageId`, `artifactIds`, `alias`; `artifactIds` returned as empty array `[]`.

### Step 3 — `GET /v1/messaging/history/{alias}`

```bash
curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
  -H "X-Access-Key: ${HELLOMINDS_ACCESS_KEY}" \
  -H "Accept: application/json" \
  "${HELLOMINDS_BASE_URL}/v1/messaging/history/${HELLOMINDS_CONVERSATION_ALIAS}"
```

**Success (validated):** HTTP **200**; response shape **top-level array**. Mind reply observed (`yes`). Observed history item was a Mind/**lucient** reply — not necessarily the outgoing user ping.

**Observed history item fields (field names only):** `fingerprint`, `conversationId`, `messageId`, `messageText`, `createdAt`, `partyId`, `partyType`, `senderName`, `senderEmail`, `mindId`, `mindName`, `mindEmail`, `attachments`, `conversationType`, `subject`.

---

## Do not run beyond Phase 39B scope

| Action | Reason |
|--------|--------|
| Additional HelloMinds endpoints | Out of scope after 39B closeout |
| lucient `/mind-handoffs/send` or UI send | Handoff delivery — later phase |
| Toggle `EXTERNAL_MIND_LIVE_SEND` or app external-send env | Would change app behavior |
| Send lucient `payload_json` as `messageText` | Adapter phase — not 39B |

---

## Redaction rules

**Do not commit or paste into docs/PRs:**

- Builder API key or `HELLOMINDS_ACCESS_KEY` values
- Full `humanId`
- Full curl transcripts with headers
- Full `conversationId`, `messageId`, or conversation alias (unless operator approves as non-sensitive)
- Client payloads or lucient handoff `payload_json`
- Unexpected message body content from history (note only that a Mind reply was observed)

**Safe to record:**

- Date (UTC), HTTP statuses, request/response **field names**
- Approved synthetic ping string (designed public-safe)
- mindId suffix `df11`, Mind name `lucient`
- Error type/subtype/finding for validation failures
- Boolean: Mind reply observed in history
- lucient app / Supabase / Vercel env impact: none

---

## Pass / fail checklist

### Pass (all required)

- [ ] Commands run locally only; no lucient deploy
- [ ] `EXTERNAL_MIND_LIVE_SEND` remains `false` (unchanged)
- [ ] App external-send env and sender unchanged
- [ ] `POST /v1/messaging/conversation` succeeds with `alias` + `mindId` (HTTP 200)
- [ ] `POST /v1/messaging/message` succeeds with synthetic ping only (HTTP 200)
- [ ] `GET /v1/messaging/history/{alias}` returns HTTP 200
- [ ] Auth confirmed as **`X-Access-Key`** on all messaging calls
- [ ] No lucient handoff payload sent
- [ ] Redacted validation record completed

### Fail (any one)

- [ ] 401 / 403 / 404 not resolved
- [ ] Conversation or message POST fails after validated body shape
- [ ] Non-synthetic or client-like content in `messageText`
- [ ] Any app, Supabase, or Vercel env change
- [ ] Secrets or full transcripts committed

---

## Production validation (completed)

Redacted validation record for the 2026-06-12 UTC local messaging smoke test.

| Field | Value |
|-------|-------|
| Phase | 39B |
| Result | **passed** |
| Date (UTC) | 2026-06-12 |
| Test type | local operator curl only |
| Content sent | synthetic ping only; no client data |
| Base URL | `https://api.build.hellominds.ai` |
| Auth scheme | `X-Access-Key` confirmed on messaging endpoints |
| Target Mind | lucient |
| Target mindId | confirmed; suffix `df11` only |
| Target `isEnabled` (from 39A) | `true` |
| Conversation alias | caller-supplied test alias (full value not recorded) |
| **POST /v1/messaging/conversation** | |
| Initial calls without alias | HTTP 400 |
| Error type | `BAD_INPUT` |
| Error subtype | `VALIDATION_FAILED` |
| Error finding | `alias` is required and must be a non-empty string |
| Successful body shape | `alias` + `mindId` |
| `humanId` required | **no** |
| Success HTTP result | 200 |
| Success response fields | `conversationId`, `alias` |
| **POST /v1/messaging/message** | |
| Body shape | `alias`, `messageText`, `attachments: []` |
| `messageText` | approved synthetic ping only |
| Success HTTP result | 200 |
| Success response fields | `conversationId`, `messageId`, `artifactIds`, `alias` |
| `artifactIds` | empty array `[]` |
| **GET /v1/messaging/history/{alias}** | |
| Success HTTP result | 200 |
| Response shape | top-level array |
| Mind reply observed | **yes** |
| History item fields observed | `fingerprint`, `conversationId`, `messageId`, `messageText`, `createdAt`, `partyId`, `partyType`, `senderName`, `senderEmail`, `mindId`, `mindName`, `mindEmail`, `attachments`, `conversationType`, `subject` |
| History note | observed item was Mind/lucient reply; not necessarily outgoing user ping |
| lucient app impact | none |
| Supabase impact | none |
| Vercel env impact | none |
| External live send | not enabled |
| `CURRENT_WATCH_PHASE` | remains `"37"` |
| `payload_version` | unchanged |
| lucient handoff payload sent | **no** |
| App sender or adapter changed | **no** |
| Next step | Phase 39C adapter design — **not implementation unless explicitly approved** |

---

## Next phase (not part of 39B)

**Phase 39C** (planned): HelloMinds transport adapter **design** — map lucient handoff delivery to `conversation` + `message` flow using validated shapes. Implementation requires explicit approval; no app changes until then.

---

## Related docs

- [hellominds-connectivity-phase-39a.md](./hellominds-connectivity-phase-39a.md) — Builder API list-Minds smoke test
- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md) — canonical phase status

# Phase 39A — HelloMinds Local Connectivity Smoke Test

**Status:** **PASS** — local connectivity validated (2026-06-12 UTC). See [Production validation (completed)](#production-validation-completed).

**Purpose:** Manually verify Builder API authentication and Mind inventory against HelloMinds, without changing lucient Evidence Mind application behavior.

**Phase marker:** `CURRENT_WATCH_PHASE` remains `"37"`. This procedure does not bump the watch phase or `payload_version`.

**Out of scope for Phase 39A:**

- App code, routes, sender logic, migrations, or UI changes
- HelloMinds transport adapter implementation
- `POST /v1/messaging/conversation`
- `POST /v1/messaging/message`
- Any lucient handoff send (`/mind-handoffs/send`, dry-run or live)
- Changes to production or local app env used by lucient external send

---

## Do not change these during Phase 39A

Leave the following **unchanged** in Vercel, Supabase, and application configuration:

| Setting | Required state |
|---------|----------------|
| `EXTERNAL_MIND_LIVE_SEND` | `false` (or unset) |
| `ENABLE_EXTERNAL_MIND_SEND` | unchanged from current production |
| `EXTERNAL_MIND_ENDPOINT_URL` | unchanged |
| `EXTERNAL_MIND_API_KEY` | unchanged |
| Vercel environment variables | no HelloMinds keys added for app send |
| Supabase schema / data | no migrations or handoff sends for this test |
| App code | no commits for sender, routes, or adapter |

HelloMinds credentials for this test live **only in your local shell session** (see [Environment variables](#environment-variables)). Do not write them into `.env.local` for lucient external send unless explicitly approved in a later phase.

---

## Why this phase exists

Phase 38 validated lucient dry-run guardrails using a generic HTTPS POST with `Authorization: Bearer`. HelloMinds exposes a **messaging API** authenticated with `X-Access-Key`. Phase 39A confirms Builder API access and lists Minds **before** any messaging or lucient integration work.

---

## Prerequisites

Obtain from an approved operator channel (password manager or secrets vault — never chat or email plaintext):

1. **Builder API key** — sent as `X-Access-Key` (not `Authorization: Bearer`)
2. **`humanId`** — scopes the Minds list endpoint
3. **`HELLOMINDS_TARGET_MIND_ID`** (optional) — if already known; otherwise discover from the list response

---

## Environment variables

Set these in your **local terminal only**. Use placeholders when sharing instructions; never commit real values.

```bash
export HELLOMINDS_BASE_URL="https://api.build.hellominds.ai"
export HELLOMINDS_ACCESS_KEY="<Builder API key>"
export HELLOMINDS_HUMAN_ID="<humanId>"
# Optional — set after first list call if unknown:
export HELLOMINDS_TARGET_MIND_ID="<mindId>"
```

| Variable | Required | Notes |
|----------|----------|-------|
| `HELLOMINDS_BASE_URL` | Yes | Default: `https://api.build.hellominds.ai` |
| `HELLOMINDS_ACCESS_KEY` | Yes | Builder API key; header `X-Access-Key` |
| `HELLOMINDS_HUMAN_ID` | Yes | From HelloMinds / operator |
| `HELLOMINDS_TARGET_MIND_ID` | No | For jq filter after discovery |

---

## Manual curl — list Minds

**Only endpoint documented for Phase 39A:** `GET /v1/humans/{humanId}/minds`

### Basic request

```bash
curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
  -H "X-Access-Key: ${HELLOMINDS_ACCESS_KEY}" \
  -H "Accept: application/json" \
  "${HELLOMINDS_BASE_URL}/v1/humans/${HELLOMINDS_HUMAN_ID}/minds"
```

### Optional: pretty-print JSON

```bash
curl -sS \
  -H "X-Access-Key: ${HELLOMINDS_ACCESS_KEY}" \
  -H "Accept: application/json" \
  "${HELLOMINDS_BASE_URL}/v1/humans/${HELLOMINDS_HUMAN_ID}/minds" \
  | jq .
```

### Optional: confirm target Mind is enabled

Run only after `HELLOMINDS_TARGET_MIND_ID` is set:

```bash
curl -sS \
  -H "X-Access-Key: ${HELLOMINDS_ACCESS_KEY}" \
  -H "Accept: application/json" \
  "${HELLOMINDS_BASE_URL}/v1/humans/${HELLOMINDS_HUMAN_ID}/minds" \
  | jq --arg id "${HELLOMINDS_TARGET_MIND_ID}" \
    '.minds[]? // .[]? | select(.id == $id or .mindId == $id)'
```

Inspect the matched object for an enabled/active flag (field name may vary — record the actual field on success).

---

## Do not run in Phase 39A

| Action | Reason |
|--------|--------|
| `POST /v1/messaging/conversation` | Messaging smoke test — Phase 39B |
| `POST /v1/messaging/message` | Messaging smoke test — Phase 39B |
| `GET /v1/messaging/history/{alias}` | Requires conversation alias — Phase 39B |
| `GET /v1/messaging/events` | Messaging — Phase 39B |
| lucient `/mind-handoffs/send` or UI send | Handoff delivery — later phase |
| Toggle `EXTERNAL_MIND_LIVE_SEND` or other app external-send env | Would change production/staging app behavior |

---

## Expected success response

Record the **actual** JSON shape on first success; HelloMinds schema may differ slightly. Typical patterns:

**Wrapped array:**

```json
{
  "minds": [
    {
      "id": "<mindId>",
      "name": "<display name>",
      "enabled": true
    }
  ]
}
```

**Top-level array:**

```json
[
  {
    "mindId": "<mindId>",
    "displayName": "<display name>",
    "enabled": true
  }
]
```

Success signals:

- HTTP status `200`
- Valid JSON with at least one Mind object
- Target Mind present with `enabled: true` or equivalent (`status: "active"`, etc.)

---

## HTTP error interpretation

| Status | Likely cause | Next step |
|--------|--------------|-----------|
| **401** | Missing/invalid key, or wrong header (`Bearer` instead of `X-Access-Key`) | Re-issue key; verify `X-Access-Key` header |
| **403** | Key valid but not authorized for this `humanId` | Confirm Builder scope and `humanId` with operator |
| **404** | Wrong `humanId`, base URL, or path typo | Verify `HELLOMINDS_BASE_URL` and path `/v1/humans/{humanId}/minds` |
| **429 / 5xx** | Rate limit or upstream error | Retry with backoff; escalate if persistent |
| **200, empty list** | Auth ok, no Minds provisioned | **Fail** — provision Mind before Phase 39B |

---

## Pass / fail checklist

### Pass (all required)

- [ ] Commands run locally only; no lucient deploy
- [ ] `EXTERNAL_MIND_LIVE_SEND` remains `false` in production (unchanged)
- [ ] `ENABLE_EXTERNAL_MIND_SEND`, `EXTERNAL_MIND_ENDPOINT_URL`, and `EXTERNAL_MIND_API_KEY` unchanged
- [ ] `GET /v1/humans/{humanId}/minds` returns HTTP **200**
- [ ] Response is valid JSON with ≥1 Mind
- [ ] Target Evidence Mind identified; enabled/active confirmed
- [ ] Auth confirmed as **`X-Access-Key`**, not `Authorization: Bearer`
- [ ] No messaging POSTs and no lucient handoff send attempted
- [ ] Validation record completed per [template](#validation-record-template) (redacted)

### Fail (any one)

- [ ] 401 / 403 / 404 not resolved after key, `humanId`, and header checks
- [ ] Empty Minds list with no provisioning path
- [ ] Target Mind missing or disabled
- [ ] Any production Vercel env, Supabase, or app code change made to aid testing
- [ ] Any lucient `animoca_mind` handoff send (dry-run or live)
- [ ] Secrets or full curl transcripts committed to the repo

---

## Redaction rules

**Do not commit or paste into docs/PRs:**

- Builder API key or `HELLOMINDS_ACCESS_KEY` values
- Curl transcripts that include the `X-Access-Key` header value
- `.env` / `.env.local` files containing real HelloMinds keys
- lucient handoff `payload_json` or workspace/client data
- Conversation aliases or message history (Phase 39B+)

**Safe to record:**

- Date (UTC), operator initials, HTTP status, Minds count
- `humanId` / `mindId` if operator approves (or last 4 characters only)
- Display name of target Mind if non-sensitive
- Confirmed auth scheme (`X-Access-Key`)
- Note that lucient app/env were unchanged

---

## Production validation (completed)

Redacted validation record for the 2026-06-12 UTC local smoke test. No API keys, full `humanId`, curl transcripts, handoff payloads, conversation aliases, or message history are recorded here.

| Field | Value |
|-------|-------|
| Phase | 39A |
| Result | **passed** |
| Date (UTC) | 2026-06-12 |
| Base URL | `https://api.build.hellominds.ai` |
| Auth scheme | `X-Access-Key` confirmed working |
| Endpoint tested | `GET /v1/humans/{humanId}/minds` |
| HTTP result | 200 |
| Response shape | top-level array |
| Minds count | 2 |
| Target Mind name | lucient |
| Target mindId | confirmed; suffix `df11` |
| Target model | `xiaomi/mimo-v2.5` |
| Target enabled field | `isEnabled` |
| Target enabled value | `true` |
| Target species | moca |
| hasTelegram | `true` |
| lucient app impact | none |
| Supabase impact | none |
| Vercel env impact | none |
| External live send | not enabled |
| `CURRENT_WATCH_PHASE` | remains `"37"` |
| `payload_version` | unchanged |
| lucient handoff payload sent | **no** |
| Messaging conversation created | **no** |
| Message sent | **no** |
| Gap noted | lucient sender uses Bearer + single POST; HelloMinds uses messaging API |
| Next step | Phase 39B messaging smoke test — **not yet started** |

---

## Validation record template

Use for future operator runs. **Placeholders only — no real secrets.**

```markdown
## Phase 39A validation record

| Field | Value |
|-------|-------|
| Date (UTC) | YYYY-MM-DD |
| Operator | <initials or name> |
| Phase | 39A |
| Base URL | https://api.build.hellominds.ai |
| Endpoint tested | GET /v1/humans/{humanId}/minds |
| HTTP status | 200 |
| Auth scheme | X-Access-Key (confirmed) |
| Target mindId | <suffix only, e.g. ...df11> |
| Target Mind name | <display name> |
| Target enabled | true (field: <e.g. isEnabled>) |
| Minds returned (count) | <N> |
| lucient app impact | None — no code/env/sender changes |
| EXTERNAL_MIND_LIVE_SEND | unchanged (false) |
| Gap noted | lucient sender uses Bearer + single POST; HelloMinds uses messaging API |
| Next step | Phase 39B — messaging connectivity smoke test |
```

---

## Next phase (not part of 39A)

**Phase 39B** (planned, not yet started): `POST /v1/messaging/conversation`, `POST /v1/messaging/message` with synthetic text only, and history/events reads — still without lucient app integration or handoff payloads.

---

## Related docs

- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md) — canonical phase status
- [magnesium-test.md](./magnesium-test.md) — lucient inbound API smoke test (opposite direction)

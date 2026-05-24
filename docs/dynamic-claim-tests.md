# Dynamic claim-risk tests

Purpose: verify that `POST /api/query` returns **deterministic, keyword-classified** claim-risk responses for integration testing. Responses are **POC placeholders** — not real evidence search or clinical recommendations.

**Important:** Use demo workspace IDs and synthetic queries only. Do **not** send real client-private data.

## Request schema

Same as [magnesium-test.md](./magnesium-test.md):

| Field | Required | Notes |
|-------|----------|-------|
| `workspace_id` | Yes | Echoed in response |
| `query` | Yes | Drives keyword-based `claim_analysis` |
| `mode` | No | If provided, must be `"evidence_brief"` |
| `filters` | No | Accepted but ignored in POC |
| `context` | No | Accepted but ignored in POC |

## Response additions

Each response includes `claim_analysis`:

```json
{
  "claim_analysis": {
    "claim_type": "detox",
    "detected_terms": ["detoxifies"],
    "is_measurable_health_claim": true,
    "human_review_required": true
  }
}
```

All other fields (`report_id`, `generated_at`, `evidence_summary`, `risk_assessment`, etc.) vary by detected claim pattern. `generated_at` and `lucient_meta.last_updated` are dynamic ISO timestamps.

## Detected claim patterns

| `claim_type` | Example keywords |
|--------------|------------------|
| `detox` | detox, detoxify, detoxifies |
| `immunity` | immunity, immune, boosts immunity |
| `inflammation` | inflammation, anti-inflammatory |
| `cortisol_hormone` | cortisol, hormone regulation |
| `anti_aging` | anti-aging, reverse aging, biological age |
| `pain_relief` | pain relief, relieves pain |
| `sleep` | sleep, insomnia |
| `stress_relaxation` | stress, de-stress, reduces stress |
| `experiential_wellness` | supports relaxation, feel restored, sense of calm, feel refreshed |

`claim_analysis.human_review_required` is `true` only when `risk_assessment.risk_level` is `medium`, `high`, or `critical`. Low-risk experiential claims return `false`.

When multiple patterns match, the highest-priority pattern sets `claim_type`; all matched terms appear in `detected_terms`.

## curl examples

Set your API key once:

```bash
export API_KEY="your-secret-api-key-here"
export BASE_URL="http://localhost:3000"
```

### 1. Detox claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-claims",
    "query": "This treatment detoxifies the body.",
    "mode": "evidence_brief",
    "context": "POC dynamic claim test."
  }' | jq '.claim_analysis, .risk_assessment.risk_level, .recommended_wording'
```

Expected `claim_type`: `detox`

### 2. Immunity claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-claims",
    "query": "This massage boosts immunity.",
    "mode": "evidence_brief",
    "context": "POC dynamic claim test."
  }' | jq '.claim_analysis, .risk_assessment.risk_level, .recommended_wording'
```

Expected `claim_type`: `immunity`

### 3. Inflammation claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-claims",
    "query": "This ritual reduces inflammation.",
    "mode": "evidence_brief",
    "context": "POC dynamic claim test."
  }' | jq '.claim_analysis, .risk_assessment.risk_level, .recommended_wording'
```

Expected `claim_type`: `inflammation`

### 4. Anti-aging claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-claims",
    "query": "This program reverses biological aging.",
    "mode": "evidence_brief",
    "context": "POC dynamic claim test."
  }' | jq '.claim_analysis, .risk_assessment.risk_level, .recommended_wording'
```

Expected `claim_type`: `anti_aging`

### 5. Experiential wellness claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-claims",
    "query": "This treatment supports relaxation and helps guests feel restored.",
    "mode": "evidence_brief",
    "context": "POC dynamic claim test."
  }' | jq '.claim_analysis, .risk_assessment.risk_level, .recommended_wording'
```

Expected:

- `claim_type`: `experiential_wellness`
- `claim_analysis.human_review_required`: `false`
- `risk_assessment.risk_level`: `low`

## Notes

- Evidence content and sources are **placeholder only**.
- `workspace_id` and `query` echo the request.
- Replace `$BASE_URL` with your Vercel deployment URL for remote testing.
- See [evidence-source-stubs.md](./evidence-source-stubs.md) for Phase 3 evidence stub schema and curl examples.
- See [real-evidence-object-shape.md](./real-evidence-object-shape.md) for Phase 4 nested evidence object schema.

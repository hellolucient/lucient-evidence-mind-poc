# Phase 3: Evidence source stubs

Purpose: provide **structured, claim-tailored evidence stubs** in `POST /api/query` responses so Animoca Mind has richer material for Evidence Brief artifacts.

**Important:** These are **POC placeholder stubs only** — not real PubMed, Cochrane, or clinical citations. Use demo workspace IDs and synthetic queries. Do **not** send real client-private data.

## What Phase 3 adds

- Richer `sources[]` objects with evidence level, relevance, support assessment, and summary
- New top-level `evidence_notes` field explaining stub status and next steps for real evidence retrieval
- One tailored stub per detected `claim_type` (detox, immunity, inflammation, anti-aging, pain relief, sleep, stress/relaxation, experiential wellness, etc.)

Existing response fields (`report_id`, `claim_analysis`, `evidence_summary`, `risk_assessment`, etc.) are unchanged.

## Source object schema

Each item in `sources`:

```json
{
  "source_id": "stub-detox-001",
  "source_type": "evidence_stub",
  "title": "POC stub: detoxification claim substantiation",
  "url": "https://example.com/poc-evidence-stub/detox/001",
  "publication_year": 2026,
  "evidence_level": "background",
  "relevance_to_claim": "indirect",
  "supports_claim": "no",
  "summary": "Claims about removing toxins from the body require specific substantiation..."
}
```

| Field | Values |
|-------|--------|
| `source_type` | Always `"evidence_stub"` in this POC |
| `evidence_level` | `systematic_review`, `clinical_trial`, `observational`, `guideline`, `background`, `unknown` |
| `relevance_to_claim` | `direct`, `indirect`, `background` |
| `supports_claim` | `yes`, `no`, `mixed`, `unclear` |

## Evidence notes schema

```json
{
  "evidence_notes": {
    "source_quality_note": "These are POC evidence stubs, not real citations.",
    "citation_status": "placeholder",
    "next_step_for_real_evidence": "Replace evidence stubs with retrieved sources from PubMed, Cochrane, clinical guidelines, or curated evidence databases."
  }
}
```

## curl examples

Set your API key once:

```bash
export API_KEY="your-secret-api-key-here"
export BASE_URL="http://localhost:3000"
```

### 1. High-risk detox claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-evidence",
    "query": "This treatment detoxifies the body.",
    "mode": "evidence_brief",
    "context": "POC Phase 3 evidence stub test."
  }' | jq '.claim_analysis.claim_type, .sources[0], .evidence_notes'
```

Expected:

- `claim_type`: `detox`
- `sources[0].supports_claim`: `no`
- `sources[0].relevance_to_claim`: `indirect`
- `evidence_notes.citation_status`: `placeholder`

### 2. Medium-risk inflammation claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-evidence",
    "query": "This ritual reduces inflammation.",
    "mode": "evidence_brief",
    "context": "POC Phase 3 evidence stub test."
  }' | jq '.sources[0].supports_claim, .sources[0].summary'
```

Expected:

- `supports_claim`: `mixed`
- Summary references measurable biological effects and cautious wording

### 3. Low-risk experiential wellness claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-evidence",
    "query": "This treatment supports relaxation and helps guests feel restored.",
    "mode": "evidence_brief",
    "context": "POC Phase 3 evidence stub test."
  }' | jq '.claim_analysis, .sources[0], .evidence_notes.source_quality_note'
```

Expected:

- `claim_type`: `experiential_wellness`
- `sources[0].supports_claim`: `yes`
- `sources[0].relevance_to_claim`: `background`
- `human_review_required`: `false`

## Related docs

- [dynamic-claim-tests.md](./dynamic-claim-tests.md) — claim classification and risk-level tests
- [magnesium-test.md](./magnesium-test.md) — base request/response schema

## Notes

- URLs point to `example.com` placeholder paths — not live citations.
- Replace stubs with real retrieval logic when moving beyond POC.
- `workspace_id` and `query` echo the request; timestamps are generated at request time.
- See [real-evidence-object-shape.md](./real-evidence-object-shape.md) for Phase 4 nested evidence object schema (`meta`, `methodology`, `analysis`, `regulatory_flags`).

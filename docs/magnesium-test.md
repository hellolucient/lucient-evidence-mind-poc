# Base API reference (Magnesium integration test)

Purpose: verify that an **Animoca Mind** can call the Lucient EIE POC API, authenticate with a Bearer API key, send a workspace + evidence query, and receive structured JSON for an **Evidence Brief** artifact.

**Important:** Use demo workspace IDs and synthetic queries only. Do **not** send real client-private data.

See [docs/README.md](./README.md) for the full documentation index and phase summary.

## Request schema

`POST /api/query`

### Headers

| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Yes | `Bearer <EIE_TOOL_API_KEY>` |

### Body

```json
{
  "workspace_id": "demo-magnesium",
  "query": "Magnesium for cortisol regulation",
  "mode": "evidence_brief",
  "filters": {
    "source_types": ["pubmed"],
    "recency_years": 10,
    "max_sources": 3,
    "use_real_pubmed": false
  },
  "context": "Animoca Mind integration test. No real client data."
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `workspace_id` | Yes | Echoed in response |
| `query` | Yes | Drives claim classification and PubMed search when enabled |
| `mode` | No | If provided, must be `"evidence_brief"` |
| `filters` | No | See [Filters](#filters) |
| `context` | No | Accepted; not used in POC logic |

### Filters

| Field | Default | Notes |
|-------|---------|-------|
| `source_types` | — | Include `"pubmed"` to enable PubMed path (with `use_real_pubmed`) |
| `use_real_pubmed` | `false` | When `true` + `source_types` includes `"pubmed"`, calls NCBI E-utilities |
| `max_sources` | `3` | Caps sources returned; hard max `5` |
| `recency_years` | none | PubMed publication date filter when set |

When `use_real_pubmed` is omitted or `false`, responses use **claim-tailored evidence stubs** regardless of `source_types`.

## Response schema

Successful `200` response (timestamps generated at request time):

```json
{
  "report_id": "demo-magnesium-1737654321000",
  "generated_at": "2026-05-23T00:00:00.000Z",
  "report_status": "preliminary",
  "workspace_id": "demo-magnesium",
  "query": "Magnesium for cortisol regulation",
  "claim_analysis": {
    "claim_type": "cortisol_hormone",
    "detected_terms": ["cortisol"],
    "is_measurable_health_claim": true,
    "human_review_required": true
  },
  "evidence_summary": { "overall_conclusion": "...", "effect_direction": "mixed" },
  "evidence_grade": { "overall": "low", "rationale": "..." },
  "risk_assessment": {
    "overall_risk_score": 45,
    "risk_level": "medium",
    "risk_flags": []
  },
  "recommended_wording": { "safer_claim": "...", "avoid": "..." },
  "sources": [],
  "evidence_notes": {
    "source_quality_note": "...",
    "citation_status": "placeholder",
    "next_step_for_real_evidence": "...",
    "real_evidence_fields_needed": []
  },
  "report_confidence": {
    "overall": "low",
    "score": 0.25,
    "rationale": "..."
  },
  "lucient_meta": {
    "cached": false,
    "last_updated": "2026-05-23T00:00:00.000Z",
    "engine": "Lucient EIE POC",
    "privacy_note": "Demo workspace only. No real client-private data.",
    "pubmed_fetch_status": "not_requested"
  }
}
```

### `lucient_meta.pubmed_fetch_status`

| Value | Meaning |
|-------|---------|
| `not_requested` | Stub mode; no PubMed call |
| `success` | PubMed sources returned |
| `failed_fallback_to_stub` | PubMed failed or empty; stubs used |

### Source object types

| `source_type` | When |
|---------------|------|
| `evidence_stub` | Default stub mode |
| `pubmed` | PubMed mode success |

Full source schema: [real-evidence-object-shape.md](./real-evidence-object-shape.md). PubMed sources also include `abstract`, `appraisal`, and `appraisal.appraisal_debug` — see [pubmed-abstract-appraisal.md](./pubmed-abstract-appraisal.md) and [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md).

## Error responses

| Status | Condition |
|--------|-----------|
| `400` | Invalid JSON, missing `workspace_id`, missing `query`, invalid `mode` |
| `401` | Missing or invalid `Authorization` header |
| `500` | `EIE_TOOL_API_KEY` not configured on the server |

## curl examples

### Health check

```bash
curl -s http://localhost:3000/api/health
```

Expected:

```json
{
  "ok": true,
  "service": "lucient-evidence-mind-poc"
}
```

### Stub mode query

```bash
curl -s -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "mode": "evidence_brief",
    "context": "Animoca Mind integration test. No real client data."
  }'
```

### PubMed mode query

```bash
curl -s -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "mode": "evidence_brief",
    "filters": {
      "source_types": ["pubmed"],
      "use_real_pubmed": true,
      "max_sources": 3,
      "recency_years": 10
    },
    "context": "PubMed test. No real client data."
  }'
```

Replace `your-secret-api-key-here` with `EIE_TOOL_API_KEY` from `.env.local` or Vercel settings.

## Related docs

- [dynamic-claim-tests.md](./dynamic-claim-tests.md) — claim classification examples
- [pubmed-retrieval-test.md](./pubmed-retrieval-test.md) — PubMed retrieval details
- [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md) — Phase 7 appraisal rules

## Notes

- `report_id` = `{workspace_id}-{timestamp}` for traceability.
- Claim content varies by detected `claim_type`; see [dynamic-claim-tests.md](./dynamic-claim-tests.md).
- PubMed retrieval does **not** substantiate claims.

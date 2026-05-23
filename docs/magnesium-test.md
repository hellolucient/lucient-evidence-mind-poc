# Magnesium integration test

Purpose of this test document: verify that an **Animoca Mind** can call the Lucient EIE POC API via `HTTP_Execute`, authenticate with a Bearer API key, send a workspace + evidence query, and receive structured JSON suitable for an **Evidence Brief** artifact.

**Important:** All responses from `/api/query` are **dummy/static** evidence output for integration testing only. Do **not** use real client-private data.

## Request schema

`POST /api/query`

**Headers**

| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Yes | `Bearer <EIE_TOOL_API_KEY>` |

**Body**

```json
{
  "workspace_id": "demo-magnesium",
  "query": "Magnesium for cortisol regulation",
  "mode": "evidence_brief",
  "filters": {
    "source_types": ["pubmed"],
    "recency_years": 10
  },
  "context": "Animoca Mind integration test. No real client data."
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `workspace_id` | Yes | Demo workspace identifier |
| `query` | Yes | Natural-language evidence question |
| `mode` | No | If provided, must be `"evidence_brief"` |
| `filters` | No | Optional filter hints (ignored in POC) |
| `context` | No | Optional caller context string |

## Response schema

Successful `200` response (fields echo request where noted; timestamps are generated at request time):

```json
{
  "report_id": "demo-magnesium-1737654321000",
  "generated_at": "2026-05-23T00:00:00.000Z",
  "report_status": "preliminary",
  "workspace_id": "demo-magnesium",
  "query": "Magnesium for cortisol regulation",
  "evidence_summary": {
    "overall_conclusion": "...",
    "effect_direction": "mixed"
  },
  "evidence_grade": {
    "overall": "low",
    "rationale": "..."
  },
  "risk_assessment": {
    "overall_risk_score": 45,
    "risk_level": "medium",
    "risk_flags": []
  },
  "sources": [],
  "recommended_wording": {
    "safer_claim": "...",
    "avoid": "..."
  },
  "lucient_meta": {
    "cached": false,
    "last_updated": "2026-05-23T00:00:00.000Z",
    "engine": "Lucient EIE POC",
    "privacy_note": "Demo workspace only. No real client-private data."
  }
}
```

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

### Evidence query (Magnesium test)

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
      "recency_years": 10
    },
    "context": "Animoca Mind integration test. No real client data."
  }'
```

Replace `your-secret-api-key-here` with the value of `EIE_TOOL_API_KEY` from your `.env.local` (local) or Vercel project settings (deployed).

## Notes

- Evidence content is **placeholder only** — not a systematic review or clinical recommendation.
- Use demo workspace IDs and synthetic context only; no real client data.
- `report_id` is generated from `workspace_id` plus a timestamp for traceability in tests.

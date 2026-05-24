# Phase 4: Real evidence object shape

Purpose: extend `POST /api/query` source objects so they resemble **future real research records**, while still using **stubbed/static POC data**.

**Important:** These are **not real citations**. `pmid` and `doi` are `null`; `meta.citation` reads `"POC placeholder, not a real citation."` Use demo workspace IDs and synthetic queries only. Do **not** send real client-private data.

Phase 5 may add real retrieval from PubMed, Cochrane, or curated databases.

## What Phase 4 adds

Building on [Phase 3 evidence source stubs](./evidence-source-stubs.md):

- Nested `meta` — citation identifiers and bibliographic fields (stubbed/null)
- Nested `methodology` — study design, sample size, population, duration
- Nested `analysis` — outcomes, effect summary, claim alignment, relevance score
- `regulatory_flags[]` — per-source regulatory notes with severity
- Expanded `evidence_notes.real_evidence_fields_needed` — fields to populate when moving to real retrieval

Top-level response fields are unchanged.

## Full source object schema

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
  "summary": "Claims about removing toxins from the body require specific substantiation...",
  "meta": {
    "pmid": null,
    "doi": null,
    "journal": "POC Regulatory Review (placeholder)",
    "publication_date": null,
    "citation": "POC placeholder, not a real citation."
  },
  "methodology": {
    "study_design": "background",
    "sample_size": null,
    "population": "General wellness marketing context (POC stub)",
    "duration": null
  },
  "analysis": {
    "outcomes": ["toxin elimination", "subjective refreshment"],
    "effect_summary": "No stub evidence supports measurable body detoxification...",
    "claim_alignment": "contradicts",
    "relevance_score": 0.35
  },
  "regulatory_flags": [
    {
      "flag": "detox_claim",
      "severity": "high",
      "note": "Detoxification claims imply measurable physiological effects..."
    }
  ]
}
```

| Nested field | Notes |
|--------------|-------|
| `meta.pmid` / `meta.doi` | Always `null` in POC |
| `meta.citation` | Always `"POC placeholder, not a real citation."` |
| `methodology.study_design` | `systematic_review`, `randomized_controlled_trial`, `observational`, `guideline`, `background`, `unknown` |
| `analysis.claim_alignment` | `supports`, `contradicts`, `mixed`, `insufficient`, `background` |
| `analysis.relevance_score` | Number between `0` and `1` |
| `regulatory_flags[].severity` | `low`, `medium`, `high`, `critical` |

## Evidence notes (Phase 4)

```json
{
  "evidence_notes": {
    "source_quality_note": "These are structured POC evidence objects, not real citations.",
    "citation_status": "placeholder",
    "next_step_for_real_evidence": "Replace evidence stubs with retrieved sources from PubMed, Cochrane, clinical guidelines, or curated evidence databases.",
    "real_evidence_fields_needed": [
      "pmid",
      "doi",
      "journal",
      "publication_date",
      "study_design",
      "sample_size",
      "population",
      "outcomes",
      "effect_summary",
      "claim_alignment"
    ]
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
    "context": "POC Phase 4 evidence object test."
  }' | jq '.sources[0].meta, .sources[0].analysis, .sources[0].regulatory_flags, .evidence_notes'
```

Expected:

- `meta.pmid` and `meta.doi`: `null`
- `meta.citation`: `"POC placeholder, not a real citation."`
- `analysis.claim_alignment`: `"contradicts"`
- `regulatory_flags` includes `detox_claim` with `severity: "high"`

### 2. Low-risk relaxation claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-evidence",
    "query": "This treatment supports relaxation and helps guests feel restored.",
    "mode": "evidence_brief",
    "context": "POC Phase 4 evidence object test."
  }' | jq '.claim_analysis, .sources[0].analysis, .sources[0].regulatory_flags'
```

Expected:

- `claim_type`: `experiential_wellness`
- `analysis.claim_alignment`: `"background"`
- `analysis.relevance_score`: ~`0.82`
- `regulatory_flags`: `[]` (empty for low-risk experiential)

## Related docs

- [evidence-source-stubs.md](./evidence-source-stubs.md) — Phase 3 base stub schema
- [dynamic-claim-tests.md](./dynamic-claim-tests.md) — claim classification tests
- [magnesium-test.md](./magnesium-test.md) — base request/response schema

## Notes

- One tailored source object per detected `claim_type` (detox, immunity, inflammation, cortisol/hormone, anti-aging, pain relief, sleep, stress/relaxation, experiential wellness).
- URLs remain `example.com` placeholder paths.
- Phase 5 may replace stubs with real PubMed/Cochrane retrieval — no retrieval is implemented in Phase 4.

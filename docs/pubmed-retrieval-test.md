# Phase 5: PubMed retrieval test

Purpose: verify a **real evidence retrieval path** using NCBI E-utilities (`esearch` + `esummary`), while preserving the Phase 4.5 source object schema.

**Important:**

- PubMed retrieval **does not equal substantiation**.
- Phases 6–7 extend this path with abstract fetch and skeptical appraisal — see [pubmed-abstract-appraisal.md](./pubmed-abstract-appraisal.md) and [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md).
- Use demo workspace IDs and synthetic queries only. Do **not** send real client-private data.

See [docs/README.md](./README.md) for the full documentation index.

## When PubMed retrieval runs

PubMed is called only when **both** conditions are met:

```json
{
  "filters": {
    "source_types": ["pubmed"],
    "use_real_pubmed": true
  }
}
```

Optional filters:

| Field | Default | Notes |
|-------|---------|-------|
| `max_sources` | `3` | Hard max `5` |
| `recency_years` | none | Adds PubMed publication date filter when set |

If `use_real_pubmed` is `false` or omitted, the API returns Phase 4.5 **evidence stubs** as before.

## Request example

```bash
export API_KEY="your-secret-api-key-here"
export BASE_URL="http://localhost:3000"

curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "mode": "evidence_brief",
    "filters": {
      "source_types": ["pubmed"],
      "recency_years": 10,
      "max_sources": 3,
      "use_real_pubmed": true
    },
    "context": "POC Phase 5 PubMed retrieval test. No real client data."
  }' | jq '{
    pubmed_fetch_status: .lucient_meta.pubmed_fetch_status,
    citation_status: .evidence_notes.citation_status,
    report_confidence,
    sources: [.sources[] | {source_id, source_type, title, meta.pmid, source_rank}]
  }'
```

## Response explanation

On **success** (Phases 6–7 active — abstracts + appraisal):

- `lucient_meta.pubmed_fetch_status`: `"success"`
- `evidence_notes.citation_status`: `"abstracts_retrieved_not_fully_appraised"`
- `sources[].source_type`: `"pubmed"`
- `sources[].meta.pmid`: real PubMed ID
- `sources[]` include `abstract` and `appraisal` (with `appraisal_debug` in Phase 7)
- `report_confidence.overall`: typically `"low"` — automated appraisal is conservative

On **failure or empty results**:

- Falls back to POC evidence stubs
- `lucient_meta.pubmed_fetch_status`: `"failed_fallback_to_stub"`
- `evidence_notes.citation_status`: `"placeholder"`

When PubMed is not requested:

- `lucient_meta.pubmed_fetch_status`: `"not_requested"`

## PubMed source object

Each retrieved record maps into the Phase 4.5 source schema. With Phases 6–7 active, sources also include:

- `abstract.available`, `abstract.text`, `abstract.excerpt`
- `appraisal` — species, study design, intervention/outcome match, exclusion flags
- `appraisal.appraisal_debug` — Phase 7 inspectability fields

Default appraisal values remain conservative:

- `evidence_level`: often `"unknown"` until design is detected
- `supports_claim`: usually `"unclear"`; `"no"` when clearly irrelevant
- `analysis.claim_alignment`: usually `"insufficient"`
- `regulatory_flags` and `regulatory_context`: empty arrays for PubMed sources

## Warning

**Retrieving PubMed records does not mean the claim is supported.** The API finds potentially relevant citations and applies conservative automated appraisal; it does not determine whether they substantiate marketing or wellness claims. Always review sources before using them in client-facing Evidence Briefs.

## Related docs

- [real-evidence-object-shape.md](./real-evidence-object-shape.md) — Phase 4/4.5 source schema
- [pubmed-abstract-appraisal.md](./pubmed-abstract-appraisal.md) — Phase 6 abstracts + basic appraisal
- [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md) — Phase 7 skeptical appraisal rules
- [magnesium-test.md](./magnesium-test.md) — base request/response schema
- [dynamic-claim-tests.md](./dynamic-claim-tests.md) — claim classification tests

## Notes

- NCBI E-utilities: `esearch`, `esummary`, `efetch` (Phases 5–6). No API key required; requests are limited to `max_sources` (default 3, max 5).
- Fallback to POC stubs when PubMed fails or returns no records.

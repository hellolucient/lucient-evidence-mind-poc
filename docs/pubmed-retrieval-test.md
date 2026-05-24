# Phase 5: PubMed retrieval test

Purpose: verify a **tiny real evidence retrieval path** using NCBI E-utilities (`esearch` + `esummary`), while preserving the existing Phase 4.5 source object schema.

**Important:**

- PubMed retrieval **does not equal substantiation**. Phase 5 returns metadata only — no abstract appraisal, study design extraction, or effect-size analysis.
- Use demo workspace IDs and synthetic queries only. Do **not** send real client-private data.

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

On **success**:

- `lucient_meta.pubmed_fetch_status`: `"success"`
- `evidence_notes.citation_status`: `"metadata_retrieved_not_appraised"`
- `sources[].source_type`: `"pubmed"`
- `sources[].meta.pmid`: real PubMed ID
- `report_confidence.overall`: `"low"` (metadata-only, not appraised)

On **failure or empty results**:

- Falls back to POC evidence stubs
- `lucient_meta.pubmed_fetch_status`: `"failed_fallback_to_stub"`
- `evidence_notes.citation_status`: `"placeholder"`

When PubMed is not requested:

- `lucient_meta.pubmed_fetch_status`: `"not_requested"`

## PubMed source object (Phase 5)

Each retrieved record maps into the existing source schema with metadata-only defaults:

- `evidence_level`: `"unknown"`
- `supports_claim`: `"unclear"`
- `analysis.claim_alignment`: `"insufficient"`
- `analysis.alignment_confidence`: `0.25`
- `study_limitations` includes Phase 5 metadata-only caveats
- `regulatory_flags` and `regulatory_context`: empty arrays

## Warning

**Retrieving PubMed records does not mean the claim is supported.** Phase 5 finds potentially relevant citations; it does not determine whether they substantiate marketing or wellness claims. Always review sources before using them in client-facing Evidence Briefs.

## Related docs

- [real-evidence-object-shape.md](./real-evidence-object-shape.md) — Phase 4/4.5 source schema
- [magnesium-test.md](./magnesium-test.md) — base request/response schema
- [dynamic-claim-tests.md](./dynamic-claim-tests.md) — claim classification tests

## Notes

- NCBI E-utilities are called without an API key for this POC; requests include a tool name and are limited to `max_sources` (default 3, max 5).
- No abstracts or full-text extraction in Phase 5.
- Phase 7 tightens skeptical appraisal rules — see [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md).

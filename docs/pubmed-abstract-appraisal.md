# Phase 6: PubMed abstract retrieval + basic appraisal

Purpose: extend Phase 5 PubMed retrieval with **abstract fetching** and a **basic automated relevance/appraisal layer** using title + abstract text.

**Important:**

- This is **not full claim substantiation**. Phase 6 applies deterministic rules only — not clinical grading or effect-size extraction.
- Use demo workspace IDs and synthetic queries only. Do **not** send real client-private data.

## What Phase 6 adds

Building on [Phase 5 PubMed retrieval](./pubmed-retrieval-test.md):

- NCBI `efetch` abstract retrieval (XML parse)
- `abstract.available`, `abstract.text`, `abstract.excerpt` (excerpt truncated to ~600 characters)
- `appraisal` object with species, study design, directness, intervention/outcome match, exclusion flags
- Updated `analysis.relevance_score` based on appraisal penalties/boosts
- `evidence_notes.citation_status`: `"abstracts_retrieved_not_fully_appraised"`
- `report_confidence` rationale reflects abstract retrieval and irrelevant-source detection

## When PubMed retrieval runs

Same as Phase 5 — both required:

```json
{
  "filters": {
    "source_types": ["pubmed"],
    "use_real_pubmed": true,
    "max_sources": 3,
    "recency_years": 10
  }
}
```

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
    "context": "POC Phase 6 abstract appraisal test. No real client data."
  }' | jq '{
    pubmed_fetch_status: .lucient_meta.pubmed_fetch_status,
    citation_status: .evidence_notes.citation_status,
    report_confidence,
    sources: [.sources[] | {
      source_id,
      title,
      abstract: .abstract.available,
      appraisal: .appraisal,
      relevance_score: .analysis.relevance_score
    }]
  }'
```

## Appraisal fields

| Field | Values | Notes |
|-------|--------|-------|
| `species_relevance` | `human`, `animal`, `mixed`, `unclear` | Animal terms (goats, rats, mice, etc.) trigger `animal` |
| `study_design_detected` | `systematic_review`, `review`, `randomized_controlled_trial`, `observational`, `case_report`, `animal_study`, `unknown` | Detected from title/abstract keywords |
| `directness_to_claim` | `direct`, `partial`, `indirect`, `irrelevant` | Wrong intervention or animal-only often → `irrelevant` |
| `intervention_match` | `direct`, `partial`, `wrong_intervention`, `unclear` | Magnesium query vs chromium-only record → `wrong_intervention` |
| `outcome_match` | `direct`, `partial`, `missing`, `unclear` | Cortisol query without cortisol/HPA terms → `missing` |
| `exclusion_flags` | e.g. `animal_only`, `wrong_intervention`, `case_report`, `no_cortisol_endpoint` | Drives relevance_score penalties |

### Automated rules (Phase 6)

- **Animal-only:** goats, rats, mice, bovine, etc. → `animal_only`, lower relevance
- **Case report:** "case report" in text → `case_report` flag
- **Wrong intervention:** magnesium query but chromium/other nutrient without magnesium → `wrong_intervention`
- **Missing cortisol endpoint:** cortisol query but no cortisol/HPA/stress-hormone terms → `no_cortisol_endpoint`
- **Boost:** magnesium + cortisol/stress terms in human/mixed context → slight relevance increase

`supports_claim` remains `"unclear"` unless obviously irrelevant (`"no"`). `claim_alignment` stays `"insufficient"` in Phase 6.

## Warning

**Abstract retrieval and automated appraisal do not prove a claim is supported.** Records may mention related terms without substantiating marketing or wellness claims. Always review sources before client-facing use.

## Response signals

| Signal | Meaning |
|--------|---------|
| `citation_status: "abstracts_retrieved_not_fully_appraised"` | Abstracts fetched; basic appraisal applied |
| `report_confidence.score: 0.4` | Abstracts retrieved, appraisal weak/incomplete |
| `report_confidence.score: 0.25` | All sources flagged indirect/irrelevant |
| `lucient_meta.pubmed_fetch_status: "success"` | PubMed path succeeded (may still be low confidence) |

## Related docs

- [pubmed-retrieval-test.md](./pubmed-retrieval-test.md) — Phase 5 base PubMed path
- [real-evidence-object-shape.md](./real-evidence-object-shape.md) — source object schema
- [magnesium-test.md](./magnesium-test.md) — base request/response schema

## Notes

- NCBI calls: `esearch`, `esummary`, `efetch` (XML abstracts). No API key required; requests are limited to `max_sources` (default 3, max 5).
- Fallback to POC stubs unchanged when PubMed fails or returns no records.

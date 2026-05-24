# Phase 4 / 4.5: Real evidence object shape

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

## What Phase 4.5 adds

Refinements based on Lucient Evidence Mind feedback:

- `analysis.alignment_confidence` — confidence score (0–1) for the `claim_alignment` assessment
- `study_limitations[]` — explicit limitations of the source record
- `regulatory_context[]` — jurisdiction-aware regulatory framing (US/FTC, EU/EFSA, etc.)
- `source_rank` — rank order when multiple sources are returned (1 = highest relevance)
- Source count cap — default **3** sources; `filters.max_sources` respected up to hard max **5**

Mind integrations should request **3–5 sources max** to keep Evidence Brief payloads compact.

Top-level response fields are unchanged.

## Full source object schema (Phase 4.5)

```json
{
  "source_id": "stub-detox-001",
  "source_type": "evidence_stub",
  "source_rank": 1,
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
    "alignment_confidence": 0.88,
    "relevance_score": 0.35
  },
  "study_limitations": [
    "POC placeholder — not a real citation",
    "No linked pmid or doi",
    "No clinical biomarker data for toxin elimination"
  ],
  "regulatory_flags": [
    {
      "flag": "detox_claim",
      "severity": "high",
      "note": "Detoxification claims imply measurable physiological effects..."
    }
  ],
  "regulatory_context": [
    {
      "jurisdiction": "US",
      "framework": "FTC",
      "risk_note": "Detox claims require competent and reliable scientific evidence...",
      "severity": "high"
    }
  ]
}
```

| Field | Notes |
|-------|-------|
| `source_rank` | Integer starting at `1`; lower rank = higher priority |
| `meta.pmid` / `meta.doi` | Always `null` in POC |
| `meta.citation` | Always `"POC placeholder, not a real citation."` |
| `analysis.claim_alignment` | `supports`, `contradicts`, `mixed`, `insufficient`, `background` |
| `analysis.alignment_confidence` | Number `0`–`1` — how confident the stub assessment is in the alignment label |
| `analysis.relevance_score` | Number `0`–`1` — how relevant the source is to the claim |
| `regulatory_context[].jurisdiction` | `US`, `EU`, `UK`, `AU`, `TH`, `GLOBAL` |
| `regulatory_context[].framework` | `FTC`, `FDA`, `EFSA`, `ASA`, `TGA`, `Thai FDA`, `General marketing substantiation` |

### alignment_confidence

`alignment_confidence` expresses how strongly the evidence object supports its `claim_alignment` label. For example, a detox stub with `claim_alignment: "contradicts"` and `alignment_confidence: 0.88` indicates high confidence that the claim is not supported. Low-risk experiential stubs with `claim_alignment: "background"` typically have higher confidence (~0.85–0.92) because the alignment is straightforward.

This field will be populated by real retrieval/ranking logic in a future phase.

### regulatory_context

`regulatory_context` provides jurisdiction-specific framing separate from `regulatory_flags`. Each entry names a jurisdiction, applicable framework, risk note, and severity. This helps Mind artifacts explain *where* a claim may face scrutiny (e.g. US/FTC for detox claims, EU/EFSA for immunity claims).

### Source count limit

| Setting | Value |
|---------|-------|
| Default max sources | `3` |
| Hard max | `5` |
| Request override | `filters.max_sources` (capped at 5) |

```json
{
  "filters": {
    "max_sources": 3
  }
}
```

The POC currently returns one stub per claim type, so the cap has little effect until Phase 5 adds real multi-source retrieval.

## Evidence notes (Phase 4.5)

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
      "claim_alignment",
      "alignment_confidence",
      "study_limitations",
      "regulatory_context",
      "jurisdiction",
      "source_rank"
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
    "filters": { "max_sources": 3 },
    "context": "POC Phase 4.5 evidence object test."
  }' | jq '.sources[0] | {source_rank, analysis, study_limitations, regulatory_context}'
```

Expected:

- `source_rank`: `1`
- `analysis.claim_alignment`: `"contradicts"`
- `analysis.alignment_confidence`: ~`0.88`
- `regulatory_context` includes US/FTC entry with `severity: "high"`

### 2. Low-risk relaxation claim

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-evidence",
    "query": "This treatment supports relaxation and helps guests feel restored.",
    "mode": "evidence_brief",
    "filters": { "max_sources": 3 },
    "context": "POC Phase 4.5 evidence object test."
  }' | jq '.claim_analysis.claim_type, .sources[0].analysis, .sources[0].regulatory_context'
```

Expected:

- `claim_type`: `experiential_wellness`
- `analysis.claim_alignment`: `"background"`
- `analysis.alignment_confidence`: ~`0.92`
- `regulatory_context` severity: `"low"`

## Related docs

- [evidence-source-stubs.md](./evidence-source-stubs.md) — Phase 3 base stub schema
- [dynamic-claim-tests.md](./dynamic-claim-tests.md) — claim classification tests
- [magnesium-test.md](./magnesium-test.md) — base request/response schema

## Notes

- One tailored source object per detected `claim_type` in the POC (detox, immunity, inflammation, cortisol/hormone, anti-aging, pain relief, sleep, stress/relaxation, experiential wellness).
- URLs remain `example.com` placeholder paths.
- Mind calls should cap sources at **3–5** via `filters.max_sources`.
- Phase 5 may replace stubs with real PubMed/Cochrane retrieval — not implemented here.

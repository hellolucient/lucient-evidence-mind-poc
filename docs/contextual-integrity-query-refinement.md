# Contextual integrity and query refinement (Phase 9.5)

Phase 9 proved manual live watchlist checks work, but exposed **retrieval noise**: animal/veterinary papers, psychiatric biomarker reviews, and pathological case reports matched because they mention magnesium and cortisol in passing.

Phase 9.5 improves **contextual integrity** before autonomous scheduling by:

1. **Structured PubMed queries** for known watch topics
2. **Contextual appraisal fields** on each source
3. **Context gates** that cap scores and block material alerts for noisy records

Existing endpoints unchanged in default behavior:

- `POST /api/query`
- `POST /api/watch/check`

## Why Phase 9.5 exists

| Phase 9 problem | Phase 9.5 response |
|-----------------|-------------------|
| Goat/chromium paper matched on keyword overlap | Structured query excludes veterinary terms; context gate fails animal records |
| Buffalo/endometritis paper matched | Same — veterinary exclusion + `context_gate: fail` |
| ADHD biomarker paper matched | Psychiatric domain + `context_gate: caution`, score cap 0.35 |
| Alcohol abuse case report matched | Clinical/pathological context + score cap 0.20 |

## Structured query strategy

### Filter

| Filter | `/api/watch/check` default | `/api/query` default |
|--------|------------------------------|----------------------|
| `use_structured_query` | `true` (when unset) | `false` (when unset) |

Set `use_structured_query: false` to force raw keyword search.

### Watch topic: `watch-magnesium-cortisol`

When `watch_topic_id = "watch-magnesium-cortisol"` or `claim_family = "magnesium_cortisol_stress"` and structured query is enabled:

```
(("magnesium"[Title/Abstract] OR "magnesium supplementation"[Title/Abstract])
AND
("cortisol"[Title/Abstract] OR "hypothalamic-pituitary-adrenal"[Title/Abstract] OR "HPA axis"[Title/Abstract] OR "stress physiology"[Title/Abstract])
AND
("humans"[MeSH Terms] OR "adult"[MeSH Terms] OR "clinical trial"[Publication Type] OR "randomized controlled trial"[Publication Type] OR "systematic review"[Publication Type] OR "meta-analysis"[Publication Type])
NOT
("animals"[MeSH Terms] NOT "humans"[MeSH Terms])
NOT
(goat*[Title/Abstract] OR cow*[Title/Abstract] OR buffalo*[Title/Abstract] OR bovine[Title/Abstract] OR veterinary[Title/Abstract]))
```

### Fallback

If PubMed rejects the structured query (network/parse error), the API falls back to the raw query and records:

```json
{
  "query_strategy": {
    "mode": "raw",
    "fallback_used": true,
    "fallback_reason": "Structured PubMed query failed; fell back to raw query."
  }
}
```

### Response metadata: `query_strategy`

```json
{
  "query_strategy": {
    "mode": "structured",
    "raw_query": "Magnesium for cortisol regulation",
    "structured_query": "(\"magnesium\"[Title/Abstract] OR ...)",
    "watch_topic_id": "watch-magnesium-cortisol",
    "query_intent": "Human-focused magnesium supplementation and cortisol/stress physiology evidence for wellness claim monitoring.",
    "exclusion_terms_applied": ["animals without humans", "goat*", "cow*", "buffalo*", "bovine", "veterinary"]
  }
}
```

Present on `/api/watch/check` responses. Also on `/api/query` when `filters.use_structured_query: true`.

## Contextual appraisal fields

Each PubMed source `appraisal` object includes Phase 9.5 fields:

| Field | Values |
|-------|--------|
| `population_type` | `human`, `animal`, `mixed`, `unclear` |
| `domain_context` | `wellness`, `clinical`, `psychiatric`, `veterinary`, `unrelated`, `unclear` |
| `exposure_role` | `tested_intervention`, `biomarker`, `background_mention`, `unrelated`, `unclear` |
| `outcome_role` | `primary_outcome`, `secondary_outcome`, `biomarker_mention`, `background_mention`, `unclear` |
| `contextual_relevance` | `direct`, `partial`, `weak`, `irrelevant` |
| `context_gate` | `pass`, `caution`, `fail` |

## Context gate rules

### 1. Veterinary / animal-only papers

- `population_type = animal`, `domain_context = veterinary`
- `context_gate = fail`, `contextual_relevance = irrelevant`
- `relevance_score` capped at **0.10**
- Exclusion flag: `context_gate_fail`

### 2. Human pathological case reports

- `domain_context = clinical`, `study_design_detected = case_report`
- `context_gate = caution` or `fail`
- `relevance_score` capped at **0.20**
- Exclusion flag: `pathological_context`

### 3. Psychiatric / ADHD biomarker papers

- `domain_context = psychiatric`
- `exposure_role = background_mention` unless magnesium is clearly tested
- `context_gate = caution`, `relevance_score` capped at **0.35**
- Exclusion flag: `outside_wellness_context`

### 4. Direct human RCT / systematic review

- `population_type = human`, `exposure_role = tested_intervention`
- `outcome_role = primary_outcome` or `secondary_outcome`
- `context_gate = pass`, `contextual_relevance = direct` or `partial`
- Eligible for `human_review` alert when new and not in baseline

## Updated `/api/watch/check` evidence delta logic

| New source profile | `change_level` | `alert_type` |
|--------------------|----------------|--------------|
| No new PMIDs | `none` | `none` |
| All new sources `context_gate = fail` | `none` | `none` |
| Weak/indirect or `caution` without strong RCT/SR | `minor` | `monitor` |
| `context_gate = pass` + human RCT/SR + strong exposure/outcome | `possible_material` | `human_review` |

`context_gate = fail` sources **never** contribute to `possible_material`.

## Acceptance tests

| # | Record | Expected |
|---|--------|----------|
| 1 | Goat/chromium (`37737441`) | `animal`/`veterinary`, `context_gate: fail`, score ≤ 0.10 |
| 2 | Buffalo/endometritis (`39195794`) | `animal`/`veterinary`, `context_gate: fail`, score ≤ 0.10 |
| 3 | ADHD paper (`41200630`) | `psychiatric`, `context_gate: caution`, score ≤ 0.35, not `human_review` |
| 4 | Alcohol case report (`29450857`) | `clinical`, `context_gate: caution/fail`, score ≤ 0.20 |
| 5 | Known baseline (all current PMIDs) | Valid no-change response |
| 6 | Empty baseline | New sources returned and appraised |
| 7 | Weak new records | `alert_type: monitor` or `none`, not `human_review` |
| 8 | Structured query enabled | `query_strategy.mode = structured` |
| 9 | Structured query fallback | `fallback_used: true` visible when needed |
| 10 | Build | `npm run build` passes |

## Limitations

- Structured queries exist only for `watch-magnesium-cortisol` / `magnesium_cortisol_stress` in this POC
- Context gates use keyword/heuristic rules — not ML or full-text NLP
- PubMed search window still capped at `max_sources` (5)
- Fallback to raw query may re-introduce noise
- No persistent baseline storage
- Demo/synthetic data only

## How this enables scheduling later

1. Scheduler calls `/api/watch/check` with stored baseline PMIDs
2. Structured query reduces noise **before** appraisal
3. Context gates prevent false `human_review` alerts
4. Only `context_gate: pass` material sources trigger client mapping in the app
5. App merges approved PMIDs into baseline after human review

## Source files

| File | Role |
|------|------|
| `lib/structured-query.ts` | Structured query builder + `query_strategy` |
| `lib/contextual-appraisal.ts` | Context gates and score caps |
| `lib/pubmed-retrieval.ts` | `searchPubMedWithStrategy`, contextual appraisal wiring |
| `lib/watch-check.ts` | Updated delta logic + default structured query |
| `lib/pubmed-appraisal.ts` | Extended `SourceAppraisal` + exclusion flags |

## Related docs

- [watch-check-endpoint.md](./watch-check-endpoint.md) — Phase 9 manual check
- [pubmed-appraisal-rules.md](./pubmed-appraisal-rules.md) — Phase 7 base appraisal
- [evidence-watchlist-architecture.md](./evidence-watchlist-architecture.md) — Phase 7.5 watch topics

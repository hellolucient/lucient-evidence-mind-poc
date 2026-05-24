# Phase 7: PubMed appraisal rules

Purpose: tighten Phase 6 automated appraisal so the POC does **not** treat “mentioned in the paper” as “the intervention being tested.”

**Important:** Phase 7 is still **not claim substantiation**. Most sources should remain `supports_claim: "unclear"` and `claim_alignment: "insufficient"`.

Use demo queries only. Do **not** send real client-private data.

## What Phase 7 adds

- Skeptical **intervention matching** (tested vs biomarker vs background vs wrong intervention)
- Improved **study design detection** (case report, RCT, review, animal study, etc.)
- Conservative **directness** and **outcome** rules
- **Relevance score caps** for weak evidence contexts
- `appraisal_debug` on each PubMed source for inspectability

## Intervention matching

For a query like **“Magnesium for cortisol regulation”**:

| `intervention_match` | When |
|----------------------|------|
| `direct` | Magnesium supplementation, intake, treatment, or intervention appears to be the **tested exposure** |
| `partial` | Magnesium is mentioned without clear intervention focus |
| `background` | Magnesium appears only as a measured mineral, lab value, or secondary mention |
| `wrong_intervention` | Another intervention is clearly the subject (chromium, zinc, exercise, sauna, alcohol abuse, animal primary subject, etc.) |
| `unclear` | Insufficient text signal |

**Do not** assign `direct` when magnesium is only a measured biomarker in a chromium/goat/alcohol paper.

## Study design detection

Detected from title + abstract keywords (priority order):

1. `systematic_review` — systematic review, meta-analysis
2. `case_report` — case report, a case of, patient was diagnosed, single patient
3. `randomized_controlled_trial` — randomized, placebo-controlled, double-blind, clinical trial
4. `review` — review
5. `observational` — cohort, cross-sectional, observational
6. `animal_study` — animal terms dominate
7. `unknown` / `background`

## Outcome matching (cortisol queries)

| `outcome_match` | When |
|-----------------|------|
| `direct` | Cortisol, HPA axis, stress hormone, glucocorticoid measured or central |
| `partial` | Stress physiology discussed without clear cortisol endpoint |
| `missing` | No relevant outcome terms |
| `unclear` | Insufficient signal |

## Directness to claim

| Value | When |
|-------|------|
| `direct` | Human (or mixed) + direct intervention + direct outcome + RCT |
| `partial` | One element matches but context is narrow (e.g. case report, partial outcome) |
| `indirect` | Review/background/mechanistic |
| `irrelevant` | Animal-only, wrong intervention, background intervention without direct outcome |

## Relevance score caps

| Context | Cap / rule |
|---------|------------|
| `animal_only` + `wrong_intervention` | max **0.25** |
| `case_report` (+ pathological context) | max **0.35** |
| Review / background / indirect | max **0.55** unless highly direct human RCT |
| Direct human RCT + matching intervention + outcome | can reach **0.75+** |

Penalties also apply for exclusion flags before caps are enforced.

## Example expected appraisals

### Chromium / goat study

Synthetic example:

> *Effects of chromium supplementation on cortisol in dairy goats.* Goats received chromium picolinate. Serum magnesium was measured. Cortisol levels were assessed.

Expected:

- `species_relevance`: `animal`
- `study_design_detected`: `animal_study`
- `intervention_match`: `wrong_intervention`
- `outcome_match`: `direct`
- `directness_to_claim`: `irrelevant`
- `exclusion_flags`: `animal_only`, `wrong_intervention`
- `supports_claim`: `no`
- `relevance_score`: **≤ 0.25**

### Pseudo-Cushing case report

Synthetic example:

> *Case report: pseudo-Cushing syndrome associated with alcohol abuse.* A patient was diagnosed… cortisol elevated… alcohol abuse primary focus… magnesium levels noted in lab work.

Expected:

- `species_relevance`: `human`
- `study_design_detected`: `case_report`
- `intervention_match`: `background` or `partial`
- `exclusion_flags`: `case_report`, `not_human_wellness_context`
- `supports_claim`: `unclear`
- `relevance_score`: **≤ 0.35**

### Broad nutrient review

Synthetic example:

> *Review of micronutrients and stress physiology.* Discusses magnesium, zinc, and cortisol pathways generally.

Expected:

- `study_design_detected`: `review`
- `intervention_match`: `background`
- `directness_to_claim`: `indirect`
- `relevance_score`: **≤ 0.55**

## appraisal_debug

Each PubMed source may include:

```json
{
  "appraisal_debug": {
    "intervention_terms_found": ["chromium", "serum magnesium"],
    "outcome_terms_found": ["cortisol"],
    "study_design_terms_found": ["animal context"],
    "downgrade_reasons": ["cap: animal_only + wrong_intervention -> max 0.25"]
  }
}
```

## Request example

```bash
curl -s -X POST "$BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "workspace_id": "demo-magnesium",
    "query": "Magnesium for cortisol regulation",
    "filters": {
      "source_types": ["pubmed"],
      "use_real_pubmed": true,
      "max_sources": 3,
      "recency_years": 10
    }
  }' | jq '.sources[] | {title, appraisal, analysis: .analysis.relevance_score, debug: .appraisal.appraisal_debug}'
```

## Related docs

- [pubmed-abstract-appraisal.md](./pubmed-abstract-appraisal.md) — Phase 6 base
- [pubmed-retrieval-test.md](./pubmed-retrieval-test.md) — PubMed path

## Notes

- `supports_claim: "yes"` is intentionally rare in Phase 7.
- Live PubMed titles vary; use `appraisal_debug` to inspect automated decisions.

# Delta attribution and alert auditability (Phase 9.6)

Phase 9.5 structured queries and context gates correctly filter retrieval noise and can trigger `human_review` when a relevant human RCT appears. Phase 9.6 makes **which source caused the delta and alert** explicit and auditable.

## Purpose of Phase 9.6

Watchtower / Mind operators need to answer:

- Which new PubMed record triggered `possible_material`?
- Which records were screened out and why?
- Why did the check result in `human_review` vs `monitor` vs `none`?

Without attribution, alert routing is a black box — unacceptable before autonomous scheduling.

## Why attribution is needed before scheduling

| Without attribution | With Phase 9.6 |
|---------------------|----------------|
| Alert fires with no cited source | `contributing_sources_to_delta` lists PMIDs and roles |
| Noise suppression invisible | `non_contributing_sources` explains gated records |
| Threshold logic opaque | `alert_threshold_explanation` + `alert_reason_codes` |

Scheduled checks must be **reviewable** by humans and **debuggable** when false positives occur.

## New fields on `evidence_delta` (`POST /api/watch/check`)

```json
{
  "evidence_delta": {
    "change_level": "possible_material",
    "direction": "unclear",
    "delta_summary": "...",
    "delta_confidence": 0.65,
    "contributing_sources_to_delta": [
      {
        "source_id": "pubmed-39534260",
        "pmid": "39534260",
        "title": "Effects of magnesium and potassium supplementation on insomnia and sleep hormone...",
        "contribution_level": "possible_material",
        "reason": "Human RCT or systematic review with context_gate pass, tested_intervention, and primary/secondary outcome role.",
        "context_gate": "pass",
        "study_design_detected": "randomized_controlled_trial",
        "exposure_role": "tested_intervention",
        "outcome_role": "primary_outcome",
        "relevance_score": 0.46
      }
    ],
    "non_contributing_sources": [
      {
        "source_id": "pubmed-32124007",
        "pmid": "32124007",
        "title": "Physiological mechanisms determining eccrine sweat composition.",
        "reason": "Context gate caution with background or weak exposure/outcome; does not meet human_review threshold.",
        "context_gate": "caution",
        "exclusion_flags": []
      }
    ],
    "alert_reason_codes": [
      "NEW_PMIDS_FOUND",
      "POSSIBLE_MATERIAL_EVIDENCE",
      "CONTEXT_GATE_PASS_HUMAN_RCT",
      "TESTED_INTERVENTION_PRIMARY_OUTCOME",
      "HUMAN_REVIEW_THRESHOLD_MET"
    ],
    "alert_threshold_explanation": "PMID 39534260 (randomized_controlled_trial, context_gate pass, tested_intervention, primary_outcome) crossed the possible_material human_review threshold."
  }
}
```

## Contributing vs non-contributing logic

| Source profile | Bucket | Typical `contribution_level` |
|----------------|--------|------------------------------|
| `context_gate: fail` | `non_contributing_sources` | — |
| `context_gate: caution` + background/weak exposure or outcome | `non_contributing_sources` | — |
| `context_gate: caution` + partial relevance | `contributing_sources_to_delta` | `minor` |
| `context_gate: pass` + human RCT/SR + tested_intervention + primary/secondary outcome | `contributing_sources_to_delta` | `possible_material` |
| `context_gate: pass` but insufficient design/roles | `non_contributing_sources` | — |

**Rules:**

1. Fail-gated sources never contribute to `possible_material`.
2. Weak sweat-composition / background papers are **non-contributing**, not main contributors.
3. `human_review` requires at least one `possible_material` contributor; explanation names the PMID(s).
4. `monitor` / `none` explanations state why no source crossed the human_review threshold.

## Alert reason codes (examples)

| Code | Meaning |
|------|---------|
| `NO_NEW_PMIDS` | Baseline covers all search results |
| `NEW_PMIDS_FOUND` | At least one unseen PMID |
| `POSSIBLE_MATERIAL_EVIDENCE` | Material contributor identified |
| `CONTEXT_GATE_PASS_HUMAN_RCT` | Pass-gated human RCT/SR contributor |
| `TESTED_INTERVENTION_PRIMARY_OUTCOME` | Strong exposure + outcome roles |
| `HUMAN_REVIEW_THRESHOLD_MET` | Alert type is `human_review` |
| `NO_HUMAN_REVIEW_THRESHOLD_MET` | No material contributor |
| `MINOR_CONTRIBUTION_ONLY` | Only minor contributors |
| `ALL_SOURCES_CONTEXT_GATE_FAIL` | All new sources failed gates |
| `NON_CONTRIBUTING_SOURCES_PRESENT` | Gated/weak sources excluded |
| `DELTA_NONE_AFTER_GATING` | New PMIDs but delta none after gating |

## Example: empty baseline, magnesium/cortisol watch topic

Request: `known_pmids: []`, structured query enabled.

- **Main contributor:** PMID `39534260` → `possible_material`, triggers `human_review`
- **Non-contributing:** PMID `32124007` (sweat composition background), `28178022` (SR with background exposure), etc.

## Limitations

- Attribution is computed per request; not persisted
- Single-pass heuristic rules — not a full audit log
- Only `/api/watch/check` includes delta attribution (not `/api/query` evidence_monitoring simulation)
- Demo/synthetic data only

## Source files

| File | Role |
|------|------|
| `lib/delta-attribution.ts` | Classify sources, reason codes, threshold explanations |
| `lib/watch-check.ts` | Merges attribution into `evidence_delta` |

## Related docs

- [contextual-integrity-query-refinement.md](./contextual-integrity-query-refinement.md) — Phase 9.5 context gates
- [watch-check-endpoint.md](./watch-check-endpoint.md) — Phase 9 manual check

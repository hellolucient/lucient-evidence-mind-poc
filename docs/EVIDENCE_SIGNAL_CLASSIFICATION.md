# Evidence Signal Classification

Phase 16 adds a conservative, explainable appraisal layer on top of Phase 15 search profiles. Search profiles define **what Evidence Mind watches**; signal classification describes **what newly detected evidence means** for a claim family.

## Why conservative classification matters

Wellness evidence monitoring should **under-alert rather than over-alert**. A new PubMed record can mention magnesium and cortisol without substantiating a marketing claim. Phase 16 v1 therefore uses explicit rule-based classification with reason codes and confidence scores, without changing existing alert thresholds, cron behavior, or Supabase schemas.

## Phase 16 signal categories

| Signal | Meaning |
|--------|---------|
| `strengthens_claim` | Direct human evidence plausibly supports the monitored claim relationship (conservative threshold). |
| `weakens_claim` | Direct evidence suggests null, mixed, or weaker support. |
| `contradicts_claim` | Evidence may oppose the monitored claim relationship. |
| `no_material_change` | No new candidate evidence to classify. |
| `irrelevant_noise` | Retrieval noise, animal/veterinary context, incidental mentions, or context-gate failure. |
| `monitor_only` | Some relevance, but not enough for review or delta contribution. |
| `human_review_required` | Conservative escalation for direct human RCT/review-style findings. |
| `client_claim_re_review_required` | Human review plus potential private client claim mapping (no client data sent to Mind). |

Each classified candidate includes:

- `signal`, `confidence`, `severity`
- `reason_codes`, `explanation`
- `human_review_required`, `client_claim_re_review_required`
- `contributes_to_evidence_delta`
- `relevance_gate` (`pass` | `caution` | `fail`)
- `evidence_direction`

## How this differs from Phase 15 search profiles

| Phase 15 | Phase 16 |
|----------|----------|
| Defines intervention/outcome terms and PubMed query strategy | Interprets retrieved records after detection |
| Versioned search profile (`magnesium_cortisol_stress@v1`) | Rule-based signal classifier (`MAGNESIUM_CORTISOL_V1_RULES`) |
| Controls retrieval breadth/noise filters | Controls meaning/appraisal categories |
| Stored in code profile module | Enriches watch responses and `evidence_alerts.raw_payload` |

## Where classification appears

- `lib/watch/evidence-signal-classifier.ts` — core classifier
- `lib/watch/watch-signal-enrichment.ts` — aggregates per-source classifications for watch checks
- `lib/watch-check.ts` — enriches `evidence_delta`, `evidence_change_alert`, and `signal_classifications`
- `lib/watch-run-due.ts` — passes classifications through scheduled watch results
- `lib/watch/evidence-alert-store.ts` — stores per-alert classification in `raw_payload`

## Magnesium / cortisol v1 rules (summary)

- Animal/veterinary-only papers → `irrelevant_noise`
- Sweat biomarker / cortisol without magnesium intervention → `monitor_only`
- Incidental co-mentions of magnesium and cortisol → `irrelevant_noise`
- Direct null-effect human trials → `weakens_claim` or `monitor_only`
- Direct supportive human RCT/systematic review language → `human_review_required` (and sometimes `strengthens_claim` when context gate passes)
- Contradictory language with direct relationship → `contradicts_claim`

## Known limitations (v1)

- Rule-based only; no ML or LLM appraisal.
- Only `magnesium_cortisol_stress` has detailed rules; other claim families default to `monitor_only`.
- Classification **does not change** existing `alert_required` thresholds from Phase 7–9.6.
- No database migration; classification lives in API payloads and JSON `raw_payload`.
- Narrative reviews and weak abstracts remain conservative by design.

## Tests

```bash
npm test -- lib/watch/evidence-signal-classifier.test.ts
```

## Future work (Phase 17+)

- Link classified signals to private client claim review queues
- Richer cross-source aggregation and audit trails
- Additional claim family rule packs aligned with Phase 15 profiles

# Phase 46A — Live Mind Extraction Parsing Hardening

**Status:** Implemented (POC)  
**Scope:** Mind claim extraction JSON parser and operator re-parse behavior only

## Production validation outcome

Live Mind extraction validation in production confirmed:

| Step | Result |
|------|--------|
| Live Mind send | Succeeded |
| Fetch response | Succeeded |
| First parse | Failed |

The fetched response used `contract_version='mind_claim_extraction_json_v1'` and appeared structurally correct. The first parse failed because live Mind returned **confidence labels** (for example `"high"`) instead of numeric `0–1` values.

The prior parser surfaced unhelpful Zod messages such as repeated `Invalid input`, which made operator diagnosis difficult.

## Phase 46A changes

### Improved parse diagnostics

`lib/watch/mind-json-parser.ts` now formats Zod validation issues with field paths and safe received values, for example:

```text
claims[0].confidence expected number, received string "high"
claims[2].claim_type expected one of ["experiential" | ...], received string "bogus"
```

Improved messages are stored in `mind_claim_extraction_jobs.parse_error` and shown in `/source-intake`.

### Safe confidence normalization

Before final schema validation, `lib/watch/mind-claim-extraction-confidence.ts` normalizes confidence when safe:

| Input | Normalized value |
|-------|------------------|
| numeric `0–1` | unchanged |
| numeric slightly outside `0–1` (±0.05 formatting tolerance) | clamped to `0` or `1` |
| `"very high"` | `0.95` |
| `"high"` | `0.9` |
| `"medium"` / `"moderate"` | `0.6` |
| `"low"` | `0.3` |
| `"very low"` | `0.15` |
| unknown string | validation fails with path + received value |

### Strict enum validation preserved

The following fields remain strictly validated against allowed contract values:

- `contract_version`
- `claim_type`
- `evidence_sensitivity`
- `risk_level`
- `regulatory_sensitivity`
- `suggested_review_status`

### Re-parse after `parse_failed`

Existing `parse_failed` extraction jobs remain re-parsable when `mind_response_text` is present. Operators do not need to fetch again. Re-parse is idempotent and does not create duplicate `candidate_claims` when claims already exist.

## Unchanged safety constraints

- `EXTERNAL_MIND_LIVE_SEND=false` default preserved
- No polling, cron, batch send, or scheduled parse behavior added
- No fixture response path changes
- No external transport changes

## Tests

- `lib/watch/mind-claim-extraction-confidence.ts` normalization cases
- `lib/watch/mind-claim-extraction-contract.test.ts` parser diagnostics and live-style magnesium response
- `lib/watch/mind-claim-extraction-job-service.test.ts` `parse_failed` re-parse idempotency

## Related docs

- [phase-45-mind-centered-claim-intelligence.md](./phase-45-mind-centered-claim-intelligence.md)
- [evidence-mind-roadmap.md](./evidence-mind-roadmap.md)

---

# Phase 46B — Live Mind Risk Brief Parsing Hardening

**Status:** Implemented (POC)  
**Scope:** Mind claim risk brief JSON parser normalization for `searches_performed[].source` only

## Production validation outcome

Live Mind risk brief validation in production confirmed:

| Step | Result |
|------|--------|
| Live Mind send | Succeeded |
| Fetch response | Succeeded |
| Mind response stored | Succeeded |
| First parse | Failed |

The first parse failed because live Mind returned extended source labels in `searches_performed[].source`, for example:

```text
PubMed (via NCBI E-utilities, executed 2026-06-24 in prior cycle)
```

The contract requires `source` to be exactly one of: `"PubMed" | "Other" | "Not searched"`.

## Phase 46B changes

### Safe source normalization (pre-validation)

Before final schema validation, `lib/watch/mind-claim-risk-brief-search-source.ts` normalizes search source labels:

- Exact match allowed values → preserved
- Contains `pubmed` / `ncbi` / `e-utilities` (case-insensitive) → `"PubMed"`
- Contains `not searched` (case-insensitive) → `"Not searched"`
- Other non-empty label-like strings → `"Other"` (conservative heuristic)
- Empty or non-string → parse fails with useful path-level diagnostics

### Strict substantive validation preserved

No broad loosening was applied. These fields remain strict:

- `contract_version`
- `evidence_posture`
- `evidence_strength`
- `risk_level`
- `regulatory_sensitivity`
- `operator_recommendation`

### Retry parsing after `parse_failed`

Risk brief jobs remain re-parsable when `mind_response_text` exists. Operators do not need to fetch again. Re-parse is idempotent and does not create duplicate `mind_claim_risk_briefs`.

## Unchanged safety constraints

- No polling, cron, batch send, or scheduled parse behavior added
- External transport unchanged
- No live-send behavior changes


# Claim Family Search Profiles

Phase 15 introduces explicit, versioned search profiles for Evidence Mind watch topics. A profile defines **what a claim family is watching** in PubMed and related sources — separate from whether an alert is material, whether a run succeeded, or how alerts are persisted.

## Why this matters

Before Phase 15, the magnesium/cortisol watch used a structured PubMed query embedded in code. That worked for the POC, but the search strategy was implicit and hard to review.

Search profiles make the strategy:

- **Explicit** — intervention, outcome, mechanism, inclusion, and exclusion concepts are documented in one place
- **Versioned** — e.g. `magnesium_cortisol_stress@v1`
- **Testable** — generated PubMed queries can be validated in unit tests
- **Extensible** — future claim families can add profiles without scattering query strings

Phase 15 does **not** change cron scheduling, `watch_runs`, `evidence_alerts`, alert deduplication, or known-PMID baseline behavior.

## What a profile contains

Each `ClaimFamilySearchProfile` includes:

| Section | Purpose |
|---------|---------|
| Identity | `claim_family_id`, `display_name`, `description`, linked `watch_topic_ids` |
| Intervention | Core terms and synonyms (magnesium, supplementation, deficiency, etc.) |
| Outcomes | Stress/cortisol/HPA/anxiety/relaxation terms and synonyms |
| Mechanisms | HPA-axis and neuroendocrine context |
| Concepts | Included and excluded conceptual boundaries |
| Publication preferences | Preferred vs lower-priority study types |
| Filters | Human study filters, animal exclusions, noise terms |
| Source priority | PubMed first; future sources listed for later phases |
| Query version | Stable identifier such as `magnesium_cortisol_stress@v1` |
| PubMed builder spec | Structured fields used to generate the live PubMed query |
| Notes | Relevance and appraisal guidance for humans and future automation |

Code location: `lib/watch/claim-family-search-profiles.ts`

Key helpers:

- `getClaimFamilySearchProfile(claimFamilyId)`
- `getClaimFamilySearchProfileByWatchTopic(watchTopicId)`
- `buildPubMedQueryFromProfile(profile)`
- `listClaimFamilySearchProfiles()`

`lib/structured-query.ts` resolves profiles when building structured watch query strategies.

## `magnesium_cortisol_stress` (v1)

**Claim family ID:** `magnesium_cortisol_stress`

**Watch topic ID:** `watch-magnesium-cortisol`

**Query version:** `magnesium_cortisol_stress@v1`

**Intent:** Track human evidence linking magnesium or magnesium supplementation to cortisol, HPA-axis activity, stress physiology, and related wellness stress outcomes.

The profile stores a **broader** set of outcome concepts (anxiety, sleep quality, relaxation, etc.) for review and future query versions. The **v1 PubMed query intentionally uses a conservative subset** (magnesium + cortisol/HPA/stress physiology + human study filters + animal/veterinary exclusions) so production watch behavior matches the pre-Phase-15 structured query.

### Current generated PubMed query

The v1 query is built from `pubmed_query_spec` and validated against the preserved production string in tests. See `MAGNESIUM_CORTISOL_STRESS_V1_PUBMED_QUERY` in the profile module.

## What improves in later phases

| Phase | Improvement |
|-------|-------------|
| **Phase 15 (continued)** | Additional claim families, profile review workflow, optional Supabase-backed profile storage |
| **Phase 16** | Use profile metadata to improve appraisal: strengthens / weakens / contradicts / noise / monitor-only |
| **Phase 17** | Map claim families and alerts to private client workspaces and review queues |

## Tests

```bash
npm test -- lib/watch/claim-family-search-profiles.test.ts
```

Or run the full suite:

```bash
npm test
```

Tests verify profile existence, magnesium/cortisol/HPA terms in the generated query, animal/veterinary exclusions, and stable v1 query output.

## Limitations (Phase 15 foundation)

- Only one claim family profile exists today (`magnesium_cortisol_stress`).
- Profiles live in code, not Supabase.
- Broader outcome terms in the profile are metadata only until a future `@v2` query version.
- Appraisal and alert classification still use Phase 7–9.6 logic; profiles do not yet drive signal classification.

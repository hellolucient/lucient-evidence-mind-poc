/**
 * Phase 44A — rule-based wellness claim extraction from source text.
 *
 * SAFETY: Deterministic heuristic extraction only. No LLM calls, no HelloMinds,
 * no evidence research, and no evidence brief creation.
 */
import type {
  CandidateClaimStrength,
  CandidateEvidenceSensitivity,
} from "@/lib/review/claim-extraction-constants";

export type ExtractedWellnessClaim = {
  claim_text: string;
  normalized_claim_text: string;
  source_excerpt: string;
  source_location: string | null;
  claim_type: string;
  claim_family: string;
  subject: string | null;
  predicate: string;
  object: string | null;
  claim_strength: CandidateClaimStrength;
  evidence_sensitivity: CandidateEvidenceSensitivity;
  is_direct_claim: boolean;
  needs_research: boolean;
};

type ClaimPattern = {
  pattern_id: string;
  regex: RegExp;
  claim_text: string;
  claim_type: string;
  claim_family: string;
  predicate: string;
  object: string | null;
  claim_strength: CandidateClaimStrength;
  evidence_sensitivity: CandidateEvidenceSensitivity;
  is_direct_claim: boolean;
  needs_research: boolean;
};

const CLAIM_PATTERNS: ClaimPattern[] = [
  {
    pattern_id: "calm_nervous_system",
    regex: /\bcalm(?:s|ing)?(?:\s+the)?\s+nervous\s+system\b/i,
    claim_text: "calms the nervous system",
    claim_type: "stress_relaxation",
    claim_family: "nervous_system_calm",
    predicate: "calms nervous system",
    object: "nervous system",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "support_deep_sleep",
    regex: /\bsupport(?:s|ing)?\s+(?:deep\s+)?sleep\b/i,
    claim_text: "supports deep sleep",
    claim_type: "sleep",
    claim_family: "sleep_support",
    predicate: "supports sleep",
    object: "sleep",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "improve_sleep",
    regex: /\b(?:improve|improves|improving)\s+(?:deep\s+)?sleep(?:\s+quality)?\b/i,
    claim_text: "improves sleep",
    claim_type: "sleep",
    claim_family: "sleep_support",
    predicate: "improves sleep",
    object: "sleep",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "reduce_stress_hormones",
    regex: /\breduce(?:s|ing)?\s+stress\s+hormones?\b/i,
    claim_text: "reduces stress hormones",
    claim_type: "cortisol_hormone",
    claim_family: "stress_hormone_balance",
    predicate: "reduces stress hormones",
    object: "stress hormones",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "reduce_stress",
    regex: /\breduce(?:s|ing)?\s+stress\b/i,
    claim_text: "reduces stress",
    claim_type: "stress_relaxation",
    claim_family: "stress_reduction",
    predicate: "reduces stress",
    object: "stress",
    claim_strength: "soft",
    evidence_sensitivity: "low",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "restore_balance",
    regex: /\brestore(?:s|ing)?\s+balance\b/i,
    claim_text: "restores balance",
    claim_type: "experiential_wellness",
    claim_family: "holistic_balance",
    predicate: "restores balance",
    object: "balance",
    claim_strength: "soft",
    evidence_sensitivity: "low",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "balance_hormones",
    regex: /\bbalance(?:s|ing)?\s+hormones?\b/i,
    claim_text: "balances hormones",
    claim_type: "cortisol_hormone",
    claim_family: "hormone_balance",
    predicate: "balances hormones",
    object: "hormones",
    claim_strength: "moderate",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "boost_immunity",
    regex: /\b(?:boost(?:s|ing)?|strengthen(?:s|ing)?)\s+(?:immunity|immune\s+(?:system|function|response))\b/i,
    claim_text: "boosts immunity",
    claim_type: "immunity",
    claim_family: "immune_support",
    predicate: "boosts immunity",
    object: "immune function",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "detoxify",
    regex: /\b(?:detoxif(?:y|ies|ying)|detox(?:es|ing)?|detoxification)\b/i,
    claim_text: "detoxifies",
    claim_type: "detox",
    claim_family: "detoxification",
    predicate: "detoxifies",
    object: "toxins",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "reduce_inflammation",
    regex: /\breduce(?:s|ing)?\s+inflammation\b/i,
    claim_text: "reduces inflammation",
    claim_type: "inflammation",
    claim_family: "anti_inflammatory",
    predicate: "reduces inflammation",
    object: "inflammation",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "support_recovery",
    regex: /\bsupport(?:s|ing)?\s+recovery\b/i,
    claim_text: "supports recovery",
    claim_type: "experiential_wellness",
    claim_family: "recovery_support",
    predicate: "supports recovery",
    object: "recovery",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "improve_circulation",
    regex: /\b(?:improve|improves|improving|enhance(?:s|ing)?)\s+circulation\b/i,
    claim_text: "improves circulation",
    claim_type: "experiential_wellness",
    claim_family: "circulation",
    predicate: "improves circulation",
    object: "circulation",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "support_collagen",
    regex: /\bsupport(?:s|ing)?\s+collagen(?:\s+production)?\b/i,
    claim_text: "supports collagen",
    claim_type: "anti_aging",
    claim_family: "collagen_support",
    predicate: "supports collagen",
    object: "collagen",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "improve_skin_barrier",
    regex: /\b(?:improve|improves|improving|strengthen(?:s|ing)?)\s+(?:the\s+)?skin\s+barrier\b/i,
    claim_text: "improves skin barrier",
    claim_type: "anti_aging",
    claim_family: "skin_barrier",
    predicate: "improves skin barrier",
    object: "skin barrier",
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "regulate_cortisol",
    regex: /\b(?:regulate|regulates|regulating|balance(?:s|ing)?)\s+cortisol\b/i,
    claim_text: "regulates cortisol",
    claim_type: "cortisol_hormone",
    claim_family: "cortisol_regulation",
    predicate: "regulates cortisol",
    object: "cortisol",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "enhance_cellular_repair",
    regex: /\b(?:enhance|enhances|enhancing|support(?:s|ing)?)\s+cellular\s+repair\b/i,
    claim_text: "enhances cellular repair",
    claim_type: "anti_aging",
    claim_family: "cellular_repair",
    predicate: "enhances cellular repair",
    object: "cellular repair",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "relieve_pain",
    regex: /\b(?:relieve|relieves|relieving|reduce(?:s|ing)?|alleviate(?:s|ing)?)\s+pain\b/i,
    claim_text: "relieves pain",
    claim_type: "pain_relief",
    claim_family: "pain_relief",
    predicate: "relieves pain",
    object: "pain",
    claim_strength: "strong",
    evidence_sensitivity: "high",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "improve_mood",
    regex: /\b(?:improve|improves|improving|enhance(?:s|ing)?|elevate(?:s|ing)?)\s+mood\b/i,
    claim_text: "improves mood",
    claim_type: "experiential_wellness",
    claim_family: "mood_support",
    predicate: "improves mood",
    object: "mood",
    claim_strength: "soft",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  },
  {
    pattern_id: "deeply_relaxing",
    regex: /\bdeeply\s+relaxing\b/i,
    claim_text: "deeply relaxing",
    claim_type: "stress_relaxation",
    claim_family: "relaxation",
    predicate: "promotes relaxation",
    object: null,
    claim_strength: "soft",
    evidence_sensitivity: "low",
    is_direct_claim: false,
    needs_research: false,
  },
];

export function normalizeClaimText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractSubject(sourceText: string): string | null {
  const colonMatch = sourceText.match(/^([^:\n]{3,80}):/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  const ingredientMatch = sourceText.match(
    /\b(magnesium|collagen|infrared sauna|massage|sauna|aromatherapy|cbd|ashwagandha)\b/i
  );
  if (ingredientMatch) {
    return ingredientMatch[1].toLowerCase();
  }

  return null;
}

function buildSourceExcerpt(sourceText: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(sourceText.length, matchIndex + matchLength + 40);
  const excerpt = sourceText.slice(start, end).trim();

  if (start > 0) {
    return `…${excerpt}`;
  }

  if (end < sourceText.length) {
    return `${excerpt}…`;
  }

  return excerpt;
}

function resolveSourceLocation(sourceText: string, matchIndex: number): string | null {
  const prefix = sourceText.slice(0, matchIndex);
  const lineNumber = prefix.split("\n").length;
  return `line ${lineNumber}`;
}

export function extractWellnessClaimsFromSourceText(sourceText: string): ExtractedWellnessClaim[] {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    return [];
  }

  const subject = extractSubject(trimmed);
  const seen = new Set<string>();
  const candidates: ExtractedWellnessClaim[] = [];

  for (const pattern of CLAIM_PATTERNS) {
    const match = pattern.regex.exec(trimmed);
    if (!match || match.index === undefined) {
      continue;
    }

    const dedupeKey = `${pattern.pattern_id}:${match.index}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const claimText = pattern.claim_text;
    candidates.push({
      claim_text: claimText,
      normalized_claim_text: normalizeClaimText(claimText),
      source_excerpt: buildSourceExcerpt(trimmed, match.index, match[0].length),
      source_location: resolveSourceLocation(trimmed, match.index),
      claim_type: pattern.claim_type,
      claim_family: pattern.claim_family,
      subject,
      predicate: pattern.predicate,
      object: pattern.object,
      claim_strength: pattern.claim_strength,
      evidence_sensitivity: pattern.evidence_sensitivity,
      is_direct_claim: pattern.is_direct_claim,
      needs_research: pattern.needs_research,
    });
  }

  return candidates.sort((a, b) => a.claim_text.localeCompare(b.claim_text));
}

const STATEMENT_FALLBACK_CLAIM_TEXT_MAX = 240;
const STATEMENT_FALLBACK_EXCERPT_MAX = 280;

function truncateStatement(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildStatementFallbackClaim(sourceText: string): ExtractedWellnessClaim | null {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    return null;
  }

  const claimText = truncateStatement(trimmed, STATEMENT_FALLBACK_CLAIM_TEXT_MAX);

  return {
    claim_text: claimText,
    normalized_claim_text: normalizeClaimText(claimText),
    source_excerpt: truncateStatement(trimmed, STATEMENT_FALLBACK_EXCERPT_MAX),
    source_location: "line 1",
    claim_type: "unclassified_statement",
    claim_family: "unclassified_statement",
    subject: extractSubject(trimmed),
    predicate: "states",
    object: null,
    claim_strength: "moderate",
    evidence_sensitivity: "medium",
    is_direct_claim: true,
    needs_research: true,
  };
}

/**
 * Assessment-oriented extraction: use matched wellness claim patterns when present,
 * otherwise treat the pasted text as a single candidate claim so a user can check
 * a free-form statement without hitting a known spa/product pattern.
 */
export function extractWellnessClaimsForAssessment(sourceText: string): ExtractedWellnessClaim[] {
  const extracted = extractWellnessClaimsFromSourceText(sourceText);
  if (extracted.length > 0) {
    return extracted;
  }

  const fallback = buildStatementFallbackClaim(sourceText);
  return fallback ? [fallback] : [];
}

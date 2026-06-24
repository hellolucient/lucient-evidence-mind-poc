import { z } from "zod";

import {
  MIND_CLAIM_EXTRACTION_CONTRACT_VERSION,
  MIND_CLAIM_TYPES,
  MIND_SENSITIVITY_LEVELS,
  MIND_SUGGESTED_REVIEW_STATUSES,
} from "@/lib/review/mind-claim-intelligence-constants";
import {
  parseMindJsonWithSchema,
  truncateMindField,
  truncateMindStringArray,
  type MindJsonParseResult,
} from "@/lib/watch/mind-json-parser";

const extractionClaimSchema = z.object({
  claim_id: z.string(),
  claim_text: z.string(),
  exact_source_phrase: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object_or_outcome: z.string(),
  claim_family: z.string(),
  claim_type: z.enum(MIND_CLAIM_TYPES),
  evidence_sensitivity: z.enum(MIND_SENSITIVITY_LEVELS),
  risk_level: z.enum(MIND_SENSITIVITY_LEVELS),
  regulatory_sensitivity: z.enum(MIND_SENSITIVITY_LEVELS),
  confidence: z.number().min(0).max(1),
  reason_for_extraction: z.string(),
  suggested_review_status: z.enum(MIND_SUGGESTED_REVIEW_STATUSES),
});

const extractionCostReportSchema = z.object({
  reported_by_mind: z.boolean(),
  summary: z.string(),
});

export const mindClaimExtractionOutputSchema = z.object({
  contract_version: z.literal(MIND_CLAIM_EXTRACTION_CONTRACT_VERSION),
  source_summary: z.string(),
  claims: z.array(extractionClaimSchema),
  implied_claims_policy_applied: z.boolean(),
  notes: z.string(),
  cost_report: extractionCostReportSchema,
});

export type MindClaimExtractionOutput = z.infer<typeof mindClaimExtractionOutputSchema>;
export type MindClaimExtractionClaim = z.infer<typeof extractionClaimSchema>;

export type ParsedMindClaimExtractionCandidate = {
  external_claim_id: string;
  claim_text: string;
  exact_source_phrase: string | null;
  subject: string | null;
  predicate: string | null;
  object_or_outcome: string | null;
  claim_family: string | null;
  claim_type: string | null;
  evidence_sensitivity: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  confidence: number | null;
  reason_for_extraction: string | null;
  suggested_review_status: string | null;
};

export type ParsedMindClaimExtractionResult = {
  source_summary: string;
  claims: ParsedMindClaimExtractionCandidate[];
  implied_claims_policy_applied: boolean;
  notes: string | null;
  cost_report: {
    reported_by_mind: boolean;
    summary: string;
  } | null;
};

const EXTRACTION_DOCTRINE = `
EXTRACTION DOCTRINE (high-recall wellness claim extraction):

When a stronger physiological, structure/function, or disease-related claim is reasonably read to also imply a softer experiential, behavioral, or functional-wellness outcome, extract BOTH as separate claims.

Apply four tests for each candidate claim:
1. Mechanism test — does the copy imply a biological or experiential mechanism?
2. Evidence test — would substantiation require clinical, mechanistic, or experiential evidence?
3. Regulation test — could this claim attract FTC/FDA/TGA-style scrutiny?
4. Editing test — would a cautious editor flag or soften this phrase?

For spa/wellness copy, prefer high recall: extract explicit and reasonably implied claims as separate entries.
Use claim_id values like C1, C2, C3 in source order.
`.trim();

export function buildMindClaimExtractionPrompt(input: {
  sourceText: string;
  sourceTitle?: string | null;
  sourceType?: string | null;
}): string {
  const titleLine = input.sourceTitle?.trim()
    ? `Source title: ${input.sourceTitle.trim()}`
    : "Source title: (not provided)";
  const typeLine = input.sourceType?.trim()
    ? `Source type: ${input.sourceType.trim()}`
    : "Source type: spa_wellness_copy";

  return [
    "You are the external Mind intelligence layer for lucient Evidence Mind.",
    "Return ONLY valid JSON matching contract_version mind_claim_extraction_json_v1.",
    "Do not include markdown fences, commentary, or HTML.",
    "",
    EXTRACTION_DOCTRINE,
    "",
    titleLine,
    typeLine,
    "",
    "SOURCE COPY:",
    input.sourceText.trim(),
    "",
    "Required JSON shape:",
    JSON.stringify(
      {
        contract_version: MIND_CLAIM_EXTRACTION_CONTRACT_VERSION,
        source_summary: "string",
        claims: [
          {
            claim_id: "C1",
            claim_text: "string",
            exact_source_phrase: "string",
            subject: "string",
            predicate: "string",
            object_or_outcome: "string",
            claim_family: "string",
            claim_type: "experiential|structure_function|physiological|disease_related|general_wellness|other",
            evidence_sensitivity: "low|medium|high",
            risk_level: "low|medium|high",
            regulatory_sensitivity: "low|medium|high",
            confidence: 0.0,
            reason_for_extraction: "string",
            suggested_review_status: "accept|edit|reject|operator_review",
          },
        ],
        implied_claims_policy_applied: true,
        notes: "string",
        cost_report: {
          reported_by_mind: true,
          summary: "string",
        },
      },
      null,
      2
    ),
  ].join("\n");
}

function mapExtractionClaim(claim: MindClaimExtractionClaim): ParsedMindClaimExtractionCandidate {
  return {
    external_claim_id: truncateMindField(claim.claim_id),
    claim_text: truncateMindField(claim.claim_text),
    exact_source_phrase: truncateMindField(claim.exact_source_phrase),
    subject: truncateMindField(claim.subject),
    predicate: truncateMindField(claim.predicate),
    object_or_outcome: truncateMindField(claim.object_or_outcome),
    claim_family: truncateMindField(claim.claim_family),
    claim_type: claim.claim_type,
    evidence_sensitivity: claim.evidence_sensitivity,
    risk_level: claim.risk_level,
    regulatory_sensitivity: claim.regulatory_sensitivity,
    confidence: claim.confidence,
    reason_for_extraction: truncateMindField(claim.reason_for_extraction),
    suggested_review_status: claim.suggested_review_status,
  };
}

export function parseMindClaimExtractionResponse(
  rawText: string
): MindJsonParseResult<ParsedMindClaimExtractionResult> {
  const parsed = parseMindJsonWithSchema({
    rawText,
    expectedContractVersion: MIND_CLAIM_EXTRACTION_CONTRACT_VERSION,
    schema: mindClaimExtractionOutputSchema,
  });

  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    data: {
      source_summary: truncateMindField(parsed.data.source_summary),
      claims: parsed.data.claims.map(mapExtractionClaim),
      implied_claims_policy_applied: parsed.data.implied_claims_policy_applied,
      notes: parsed.data.notes ? truncateMindField(parsed.data.notes) : null,
      cost_report: parsed.data.cost_report
        ? {
            reported_by_mind: parsed.data.cost_report.reported_by_mind,
            summary: truncateMindField(parsed.data.cost_report.summary),
          }
        : null,
    },
  };
}

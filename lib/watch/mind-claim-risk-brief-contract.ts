import { z } from "zod";

import {
  MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION,
  MIND_CLAIM_RISK_BRIEF_LIVE_RESEARCH_CONTRACT_VERSION,
  MIND_EVIDENCE_POSTURES,
  MIND_EVIDENCE_STRENGTHS,
  MIND_OPERATOR_RECOMMENDATIONS,
  MIND_SENSITIVITY_LEVELS,
} from "@/lib/review/mind-claim-intelligence-constants";
import {
  parseMindJsonWithSchema,
  truncateMindField,
  type MindJsonParseResult,
} from "@/lib/watch/mind-json-parser";
import { normalizeMindRiskBriefSearchSource } from "@/lib/watch/mind-claim-risk-brief-search-source";

const searchPerformedSchema = z.object({
  source: z.enum(["PubMed", "Other", "Not searched"]),
  query: z.string(),
  date_performed: z.string(),
  result_count: z.number().nullable().optional(),
  results_summary: z.string(),
  search_url_or_endpoint: z.string().optional(),
});

const evidenceFoundSchemaV1 = z.object({
  title: z.string(),
  authors: z.string(),
  journal: z.string(),
  year: z.string(),
  pmid: z.string(),
  doi: z.string(),
  url: z.string(),
  evidence_category: z.enum([
    "ingredient",
    "delivery_route",
    "treatment",
    "branded_ritual",
    "background",
    "other",
  ]),
  relevance_to_claim: z.enum(["direct", "indirect", "weak", "not_relevant"]),
  summary: z.string(),
});

const evidenceFoundSchemaV2 = evidenceFoundSchemaV1.extend({
  verification_status: z.string().optional(),
  verification_note: z.string().optional(),
  delivery_route: z.string().optional(),
  intervention_match: z.string().optional(),
  outcome_type: z.string().optional(),
});

const evidenceNotFoundSchema = z.object({
  gap: z.string(),
  importance: z.string(),
  searches_supporting_gap: z.array(z.string()).optional(),
});

const riskBriefCostReportSchemaV1 = z.object({
  reported_by_mind: z.boolean(),
  summary: z.string(),
  search_count: z.number(),
  abstracts_fetched: z.number(),
});

const riskBriefCostReportSchemaV2 = riskBriefCostReportSchemaV1.extend({
  full_texts_fetched: z.number().optional(),
});

const verificationSummarySchema = z
  .object({
    total_pubmed_items_returned: z.number(),
    verified_pubmed_items: z.number(),
    unverified_items: z.number(),
    non_pubmed_items: z.number(),
    verification_method: z.string(),
  })
  .partial();

function preprocessMindClaimRiskBriefRecord(
  record: Record<string, unknown>
): MindJsonParseResult<Record<string, unknown>> {
  const searches = record.searches_performed;
  if (!Array.isArray(searches)) {
    return { ok: false, error: "schema_validation_failed", message: "searches_performed expected array" };
  }

  const normalizedSearches: Record<string, unknown>[] = [];

  for (let index = 0; index < searches.length; index += 1) {
    const item = searches[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        ok: false,
        error: "schema_validation_failed",
        message: `searches_performed[${index}] expected object`,
      };
    }

    const itemRecord = { ...(item as Record<string, unknown>) };
    const normalized = normalizeMindRiskBriefSearchSource(itemRecord.source);
    if (!normalized.ok) {
      return {
        ok: false,
        error: "schema_validation_failed",
        message: `searches_performed[${index}].source ${normalized.message}`,
      };
    }

    // Preserve the strict source enum; any original detail is not persisted without schema expansion.
    itemRecord.source = normalized.source;
    normalizedSearches.push(itemRecord);
  }

  return { ok: true, data: { ...record, searches_performed: normalizedSearches } };
}

export const mindClaimRiskBriefOutputSchema = z.object({
  contract_version: z.literal(MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION),
  claim_text: z.string(),
  source_context: z.string(),
  search_capability_statement: z.string(),
  searches_performed: z.array(searchPerformedSchema),
  evidence_found: z.array(evidenceFoundSchemaV1),
  evidence_not_found: z.array(evidenceNotFoundSchema),
  evidence_posture: z.enum(MIND_EVIDENCE_POSTURES),
  evidence_strength: z.enum(MIND_EVIDENCE_STRENGTHS),
  risk_level: z.enum(MIND_SENSITIVITY_LEVELS),
  regulatory_sensitivity: z.enum(MIND_SENSITIVITY_LEVELS),
  key_evidence_risk_insight: z.string(),
  safer_wording: z.string(),
  operator_recommendation: z.enum(MIND_OPERATOR_RECOMMENDATIONS),
  limitations: z.string(),
  cost_report: riskBriefCostReportSchemaV1,
});

export type MindClaimRiskBriefOutput = z.infer<typeof mindClaimRiskBriefOutputSchema>;

export const mindClaimRiskBriefOutputSchemaV2 = z.object({
  contract_version: z.literal(MIND_CLAIM_RISK_BRIEF_LIVE_RESEARCH_CONTRACT_VERSION),
  claim_text: z.string(),
  source_context: z.string(),
  search_capability_statement: z.string(),
  searches_performed: z.array(searchPerformedSchema),
  evidence_found: z.array(evidenceFoundSchemaV2),
  evidence_not_found: z.array(evidenceNotFoundSchema),
  evidence_posture: z.enum(MIND_EVIDENCE_POSTURES),
  evidence_strength: z.enum(MIND_EVIDENCE_STRENGTHS),
  risk_level: z.enum(MIND_SENSITIVITY_LEVELS),
  regulatory_sensitivity: z.enum(MIND_SENSITIVITY_LEVELS),
  key_evidence_risk_insight: z.string(),
  safer_wording: z.string(),
  operator_recommendation: z.enum(MIND_OPERATOR_RECOMMENDATIONS),
  limitations: z.string(),
  pmids: z.array(z.string()).optional(),
  dois: z.array(z.string()).optional(),
  urls: z.array(z.string()).optional(),
  verification_summary: verificationSummarySchema.optional(),
  cost_report: riskBriefCostReportSchemaV2,
});

export type MindClaimRiskBriefOutputV2 = z.infer<typeof mindClaimRiskBriefOutputSchemaV2>;

export type ParsedMindClaimRiskBrief = {
  contract_version: string;
  claim_text: string;
  source_context: string | null;
  search_capability_statement: string | null;
  searches_performed: MindClaimRiskBriefOutput["searches_performed"];
  evidence_found: unknown[];
  evidence_not_found: MindClaimRiskBriefOutput["evidence_not_found"];
  evidence_posture: string | null;
  evidence_strength: string | null;
  risk_level: string | null;
  regulatory_sensitivity: string | null;
  key_evidence_risk_insight: string | null;
  safer_wording: string | null;
  operator_recommendation: string | null;
  limitations: string | null;
  pmids: string[];
  dois: string[];
  urls: string[];
  cost_report: Record<string, unknown> | null;
  verification_summary?: Record<string, unknown> | null;
};

const RISK_BRIEF_DOCTRINE = `
RISK BRIEF DOCTRINE:

Distinguish clearly between:
- ingredient evidence vs treatment evidence vs delivery-route evidence vs branded ritual evidence
- direct evidence vs indirect evidence
- evidence found vs evidence not found

For magnesium/spa claims, explicitly distinguish:
- oral magnesium evidence
- topical/transdermal magnesium evidence
- massage/aromatherapy/spa treatment evidence
- branded ritual evidence

Key insight pattern: oral magnesium evidence ≠ topical magnesium evidence ≠ branded ritual evidence.
`.trim();

export function buildMindClaimRiskBriefPrompt(input: {
  claimText: string;
  sourceContext?: string | null;
  claimFamily?: string | null;
  promptVariant?: "v1" | "live_research_v2";
}): string {
  const contextLine = input.sourceContext?.trim()
    ? `Source context: ${input.sourceContext.trim()}`
    : "Source context: (not provided)";
  const familyLine = input.claimFamily?.trim()
    ? `Claim family: ${input.claimFamily.trim()}`
    : "Claim family: (not provided)";

  if (input.promptVariant === "live_research_v2") {
    return [
      "You are the external Mind intelligence layer for lucient Evidence Mind.",
      `Return ONLY valid JSON matching contract_version ${MIND_CLAIM_RISK_BRIEF_LIVE_RESEARCH_CONTRACT_VERSION}.`,
      "Do not include markdown fences, commentary, or HTML.",
      "",
      "LIVE EVIDENCE RESEARCH REQUIREMENTS:",
      "- Conduct live evidence searches if you have live search capability (PubMed / NCBI E-utilities preferred).",
      "- If you cannot perform live searches, state this clearly in search_capability_statement and proceed with best-effort reasoning without fabricating results.",
      "- Include exact search queries, result_count where available, and a search_url_or_endpoint for each search.",
      "- For each evidence_found PubMed item: verify the PMID by resolving the PubMed URL and confirm title match; set verification_status and verification_note.",
      "- Distinguish direct/indirect/weak/not_relevant evidence, and categorize ingredient/delivery_route/treatment/branded_ritual/background/other.",
      "- Distinguish subjective outcomes vs physiological/biomarker outcomes (outcome_type).",
      "- Identify negative searches and evidence gaps (evidence_not_found) and link gaps to searches_supporting_gap where possible.",
      "- Avoid overclaiming. Return table-ready JSON.",
      "",
      RISK_BRIEF_DOCTRINE,
      "",
      `Claim text: ${input.claimText.trim()}`,
      contextLine,
      familyLine,
      "",
      "Required JSON shape:",
      JSON.stringify(
        {
          contract_version: MIND_CLAIM_RISK_BRIEF_LIVE_RESEARCH_CONTRACT_VERSION,
          claim_text: "string",
          source_context: "string",
          search_capability_statement: "string",
          searches_performed: [
            {
              source: "PubMed|Other|Not searched",
              query: "string",
              date_performed: "YYYY-MM-DD",
              result_count: null,
              results_summary: "string",
              search_url_or_endpoint: "string",
            },
          ],
          evidence_found: [
            {
              title: "string",
              authors: "string",
              journal: "string",
              year: "string",
              pmid: "string",
              doi: "string",
              url: "string",
              verification_status: "verified|unverified|not_checked|non_pubmed|error|unknown",
              verification_note: "string",
              evidence_category:
                "ingredient|delivery_route|treatment|branded_ritual|background|other",
              relevance_to_claim: "direct|indirect|weak|not_relevant",
              delivery_route: "string",
              intervention_match: "string",
              outcome_type: "subjective|biomarker|clinical|mixed|unknown",
              summary: "string",
            },
          ],
          evidence_not_found: [
            { gap: "string", importance: "string", searches_supporting_gap: ["string"] },
          ],
          evidence_posture:
            "supported|partially_supported|weak_indirect|unsupported|contradicted|unclear",
          evidence_strength: "low|moderate|high",
          risk_level: "low|medium|high",
          regulatory_sensitivity: "low|medium|high",
          key_evidence_risk_insight: "string",
          safer_wording: "string",
          operator_recommendation: "accept|soften|reject|escalate|needs_more_review",
          limitations: "string",
          pmids: ["string"],
          dois: ["string"],
          urls: ["string"],
          verification_summary: {
            total_pubmed_items_returned: 0,
            verified_pubmed_items: 0,
            unverified_items: 0,
            non_pubmed_items: 0,
            verification_method: "string",
          },
          cost_report: {
            reported_by_mind: true,
            summary: "string",
            search_count: 0,
            abstracts_fetched: 0,
            full_texts_fetched: 0,
          },
        },
        null,
        2
      ),
    ].join("\n");
  }

  return [
    "You are the external Mind intelligence layer for lucient Evidence Mind.",
    "Return ONLY valid JSON matching contract_version mind_claim_risk_brief_json_v1.",
    "Do not include markdown fences, commentary, or HTML.",
    "",
    RISK_BRIEF_DOCTRINE,
    "",
    `Claim text: ${input.claimText.trim()}`,
    contextLine,
    familyLine,
    "",
    "Required JSON shape:",
    JSON.stringify(
      {
        contract_version: MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION,
        claim_text: "string",
        source_context: "string",
        search_capability_statement: "string",
        searches_performed: [
          {
            source: "PubMed|Other|Not searched",
            query: "string",
            date_performed: "YYYY-MM-DD",
            results_summary: "string",
          },
        ],
        evidence_found: [
          {
            title: "string",
            authors: "string",
            journal: "string",
            year: "string",
            pmid: "string",
            doi: "string",
            url: "string",
            evidence_category:
              "ingredient|delivery_route|treatment|branded_ritual|background|other",
            relevance_to_claim: "direct|indirect|weak|not_relevant",
            summary: "string",
          },
        ],
        evidence_not_found: [{ gap: "string", importance: "string" }],
        evidence_posture:
          "supported|partially_supported|weak_indirect|unsupported|contradicted|unclear",
        evidence_strength: "low|moderate|high",
        risk_level: "low|medium|high",
        regulatory_sensitivity: "low|medium|high",
        key_evidence_risk_insight: "string",
        safer_wording: "string",
        operator_recommendation: "accept|soften|reject|escalate|needs_more_review",
        limitations: "string",
        cost_report: {
          reported_by_mind: true,
          summary: "string",
          search_count: 0,
          abstracts_fetched: 0,
        },
      },
      null,
      2
    ),
  ].join("\n");
}

function collectPmids(evidence: MindClaimRiskBriefOutput["evidence_found"]): string[] {
  return evidence
    .map((entry) => entry.pmid?.trim())
    .filter((value): value is string => Boolean(value));
}

function collectDois(evidence: MindClaimRiskBriefOutput["evidence_found"]): string[] {
  return evidence
    .map((entry) => entry.doi?.trim())
    .filter((value): value is string => Boolean(value));
}

function collectUrls(evidence: MindClaimRiskBriefOutput["evidence_found"]): string[] {
  return evidence
    .map((entry) => entry.url?.trim())
    .filter((value): value is string => Boolean(value));
}

export function parseMindClaimRiskBriefResponse(
  rawText: string
): MindJsonParseResult<ParsedMindClaimRiskBrief> {
  const parsedV2 = parseMindJsonWithSchema({
    rawText,
    expectedContractVersion: MIND_CLAIM_RISK_BRIEF_LIVE_RESEARCH_CONTRACT_VERSION,
    schema: mindClaimRiskBriefOutputSchemaV2,
    preprocess: preprocessMindClaimRiskBriefRecord,
  });

  if (parsedV2.ok) {
    const data = parsedV2.data;
    const evidence = data.evidence_found as unknown[];
    const pmids = Array.isArray(data.pmids)
      ? data.pmids.map((value) => value.trim()).filter(Boolean)
      : collectPmids(data.evidence_found as unknown as MindClaimRiskBriefOutput["evidence_found"]);
    const dois = Array.isArray(data.dois)
      ? data.dois.map((value) => value.trim()).filter(Boolean)
      : collectDois(data.evidence_found as unknown as MindClaimRiskBriefOutput["evidence_found"]);
    const urls = Array.isArray(data.urls)
      ? data.urls.map((value) => value.trim()).filter(Boolean)
      : collectUrls(data.evidence_found as unknown as MindClaimRiskBriefOutput["evidence_found"]);

    return {
      ok: true,
      data: {
        contract_version: data.contract_version,
        claim_text: truncateMindField(data.claim_text),
        source_context: data.source_context ? truncateMindField(data.source_context) : null,
        search_capability_statement: truncateMindField(data.search_capability_statement),
        searches_performed: data.searches_performed,
        evidence_found: evidence,
        evidence_not_found: data.evidence_not_found,
        evidence_posture: data.evidence_posture,
        evidence_strength: data.evidence_strength,
        risk_level: data.risk_level,
        regulatory_sensitivity: data.regulatory_sensitivity,
        key_evidence_risk_insight: truncateMindField(data.key_evidence_risk_insight),
        safer_wording: truncateMindField(data.safer_wording),
        operator_recommendation: data.operator_recommendation,
        limitations: truncateMindField(data.limitations),
        pmids,
        dois,
        urls,
        cost_report: data.cost_report,
        verification_summary:
          data.verification_summary && typeof data.verification_summary === "object"
            ? (data.verification_summary as Record<string, unknown>)
            : null,
      },
    };
  }

  const parsed = parseMindJsonWithSchema({
    rawText,
    expectedContractVersion: MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION,
    schema: mindClaimRiskBriefOutputSchema,
    preprocess: preprocessMindClaimRiskBriefRecord,
  });

  if (!parsed.ok) {
    return parsed;
  }

  const data = parsed.data;

  return {
    ok: true,
    data: {
      contract_version: data.contract_version,
      claim_text: truncateMindField(data.claim_text),
      source_context: data.source_context ? truncateMindField(data.source_context) : null,
      search_capability_statement: truncateMindField(data.search_capability_statement),
      searches_performed: data.searches_performed,
      evidence_found: data.evidence_found,
      evidence_not_found: data.evidence_not_found,
      evidence_posture: data.evidence_posture,
      evidence_strength: data.evidence_strength,
      risk_level: data.risk_level,
      regulatory_sensitivity: data.regulatory_sensitivity,
      key_evidence_risk_insight: truncateMindField(data.key_evidence_risk_insight),
      safer_wording: truncateMindField(data.safer_wording),
      operator_recommendation: data.operator_recommendation,
      limitations: truncateMindField(data.limitations),
      pmids: collectPmids(data.evidence_found),
      dois: collectDois(data.evidence_found),
      urls: collectUrls(data.evidence_found),
      cost_report: data.cost_report,
      verification_summary: null,
    },
  };
}

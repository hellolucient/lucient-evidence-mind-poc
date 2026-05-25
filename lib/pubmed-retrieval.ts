import {
  resolveMaxSources,
  type EvidenceAbstract,
  type EvidenceSource,
  type StudyDesign,
} from "./evidence-stubs";
import {
  appraisePubMedRecord,
  isObviouslyIrrelevant,
  type SourceAppraisal,
  type StudyDesignDetected,
} from "./pubmed-appraisal";
import { applyContextualAppraisal } from "./contextual-appraisal";
import {
  buildQueryStrategy,
  resolveUseStructuredQuery,
  type QueryStrategy,
} from "./structured-query";

const ESEARCH_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const ESUMMARY_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
const EFETCH_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const NCBI_TOOL = "lucient-evidence-mind-poc";
const NCBI_EMAIL = "poc@example.com";
const FETCH_TIMEOUT_MS = 10000;
const ABSTRACT_EXCERPT_MAX = 600;

const PHASE6_LIMITATIONS = [
  "Phase 7 metadata and abstract retrieval",
  "Automated appraisal with conservative substantiation rules",
  "No effect-size extraction yet",
  "Not final evidence grading",
];

export type PubMedFetchFilters = {
  source_types?: string[];
  recency_years?: number;
  max_sources?: number;
  use_real_pubmed?: boolean;
  use_structured_query?: boolean;
};

export type PubMedSearchResult = {
  pmids: string[];
  query_strategy: QueryStrategy;
};

export function shouldUsePubMed(filters?: PubMedFetchFilters): boolean {
  return (
    filters?.use_real_pubmed === true &&
    Array.isArray(filters.source_types) &&
    filters.source_types.includes("pubmed")
  );
}

function buildSearchTerm(query: string, recencyYears?: number): string {
  if (
    typeof recencyYears !== "number" ||
    !Number.isFinite(recencyYears) ||
    recencyYears <= 0
  ) {
    return query;
  }

  const startYear = new Date().getFullYear() - Math.floor(recencyYears);
  return `${query} AND ("${startYear}"[Date - Publication] : "3000"[Date - Publication])`;
}

function ncbiParams(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    tool: NCBI_TOOL,
    email: NCBI_EMAIL,
    ...params,
  });
}

async function fetchNcbi(url: string, expectJson: boolean): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: expectJson ? { Accept: "application/json" } : undefined,
    });

    if (!response.ok) {
      throw new Error(`NCBI request failed with status ${response.status}`);
    }

    return expectJson ? response.json() : response.text();
  } finally {
    clearTimeout(timeout);
  }
}

type ESearchResponse = {
  esearchresult?: {
    idlist?: string[];
  };
};

type ESummaryArticle = {
  uid?: string;
  title?: string;
  pubdate?: string;
  epubdate?: string;
  source?: string;
  fulljournalname?: string;
  authors?: Array<{ name?: string }>;
  articleids?: Array<{ idtype?: string; value?: string }>;
  elocationid?: string;
};

type ESummaryResponse = {
  result?: Record<string, ESummaryArticle | string[]> & {
    uids?: string[];
  };
};

export async function searchPubMedPmids(
  query: string,
  maxResults: number,
  recencyYears?: number
): Promise<string[]> {
  const params = ncbiParams({
    db: "pubmed",
    term: buildSearchTerm(query, recencyYears),
    retmax: String(maxResults),
    retmode: "json",
    sort: "relevance",
  });

  const data = (await fetchNcbi(`${ESEARCH_URL}?${params}`, true)) as ESearchResponse;
  return data.esearchresult?.idlist ?? [];
}

export async function searchPubMedWithStrategy(
  rawQuery: string,
  maxResults: number,
  recencyYears: number | undefined,
  options: {
    watch_topic_id?: string | null;
    claim_family?: string | null;
    use_structured_query?: boolean;
    default_structured_query_when_unset?: boolean;
  }
): Promise<PubMedSearchResult> {
  const useStructured = resolveUseStructuredQuery(
    { use_structured_query: options.use_structured_query },
    options.default_structured_query_when_unset ?? false
  );

  const strategy = buildQueryStrategy(
    rawQuery,
    options.watch_topic_id ?? null,
    options.claim_family ?? null,
    useStructured
  );

  if (strategy.mode === "structured" && strategy.structured_query) {
    try {
      const pmids = await searchPubMedPmids(
        strategy.structured_query,
        maxResults,
        recencyYears
      );
      return {
        pmids,
        query_strategy: {
          ...strategy,
          fallback_used: false,
          fallback_reason: null,
        },
      };
    } catch {
      const pmids = await searchPubMedPmids(rawQuery, maxResults, recencyYears);
      return {
        pmids,
        query_strategy: {
          ...strategy,
          mode: "raw",
          fallback_used: true,
          fallback_reason:
            "Structured PubMed query failed; fell back to raw query.",
        },
      };
    }
  }

  const pmids = await searchPubMedPmids(rawQuery, maxResults, recencyYears);
  return {
    pmids,
    query_strategy: {
      ...strategy,
      fallback_used: false,
      fallback_reason: null,
    },
  };
}

async function fetchPubMedSummaries(pmids: string[]): Promise<ESummaryArticle[]> {
  if (pmids.length === 0) {
    return [];
  }

  const params = ncbiParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "json",
  });

  const data = (await fetchNcbi(`${ESUMMARY_URL}?${params}`, true)) as ESummaryResponse;
  const result = data.result;
  if (!result) {
    return [];
  }

  return pmids
    .map((pmid) => result[pmid])
    .filter((article): article is ESummaryArticle =>
      Boolean(article && typeof article === "object")
    );
}

function parseAbstractsFromXml(xml: string): Record<string, string> {
  const abstracts: Record<string, string> = {};
  const articleBlocks = xml.split(/<\/PubmedArticle>/i);

  for (const block of articleBlocks) {
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/i);
    if (!pmidMatch) {
      continue;
    }

    const parts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)]
      .map((match) =>
        match[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean);

    if (parts.length > 0) {
      abstracts[pmidMatch[1]] = parts.join(" ");
    }
  }

  return abstracts;
}

async function fetchPubMedAbstracts(
  pmids: string[]
): Promise<Record<string, string>> {
  if (pmids.length === 0) {
    return {};
  }

  const params = ncbiParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
  });

  const xml = (await fetchNcbi(`${EFETCH_URL}?${params}`, false)) as string;
  return parseAbstractsFromXml(xml);
}

function extractDoi(article: ESummaryArticle): string | null {
  const fromArticleIds = article.articleids?.find(
    (id) => id.idtype?.toLowerCase() === "doi"
  )?.value;
  if (fromArticleIds) {
    return fromArticleIds;
  }

  if (article.elocationid?.toLowerCase().startsWith("doi:")) {
    return article.elocationid.slice(4).trim();
  }

  return null;
}

function parsePublicationYear(pubdate?: string): number | null {
  if (!pubdate) {
    return null;
  }

  const match = pubdate.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function buildCitation(article: ESummaryArticle): string {
  const authors =
    article.authors
      ?.slice(0, 3)
      .map((author) => author.name)
      .filter(Boolean)
      .join(", ") ?? "Unknown authors";
  const suffix = (article.authors?.length ?? 0) > 3 ? ", et al." : "";
  const journal = article.fulljournalname ?? article.source ?? "Unknown journal";
  const pubdate = article.pubdate ?? article.epubdate ?? "Unknown date";
  const title = article.title ?? "Untitled";

  return `${authors}${suffix}. ${title}. ${journal}. ${pubdate}.`;
}

function relevanceScoreForRank(rank: number, total: number): number {
  if (total <= 1) {
    return 0.65;
  }

  const base = 0.7;
  const step = 0.12;
  return Math.max(0.35, base - (rank - 1) * step);
}

function buildAbstract(text: string | undefined): EvidenceAbstract {
  if (!text?.trim()) {
    return {
      available: false,
      text: null,
      excerpt: null,
    };
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  const excerpt =
    normalized.length > ABSTRACT_EXCERPT_MAX
      ? `${normalized.slice(0, ABSTRACT_EXCERPT_MAX).trim()}…`
      : normalized;

  return {
    available: true,
    text: normalized,
    excerpt,
  };
}

function mapDetectedStudyDesign(detected: StudyDesignDetected): StudyDesign {
  switch (detected) {
    case "systematic_review":
      return "systematic_review";
    case "randomized_controlled_trial":
      return "randomized_controlled_trial";
    case "observational":
    case "case_report":
    case "animal_study":
      return "observational";
    case "review":
    case "background":
      return "background";
    default:
      return "unknown";
  }
}

function mapDirectnessToRelevance(
  directness: SourceAppraisal["directness_to_claim"],
  intervention: SourceAppraisal["intervention_match"]
): EvidenceSource["relevance_to_claim"] {
  if (intervention === "background" || directness === "irrelevant") {
    return "background";
  }

  switch (directness) {
    case "direct":
      return "direct";
    case "partial":
      return "indirect";
    case "indirect":
      return "indirect";
    default:
      return "indirect";
  }
}

function mapSummaryToSource(
  article: ESummaryArticle,
  rank: number,
  total: number,
  query: string,
  abstractText: string | undefined
): EvidenceSource | null {
  const pmid = article.uid;
  if (!pmid) {
    return null;
  }

  const publication_year = parsePublicationYear(article.pubdate ?? article.epubdate);
  const doi = extractDoi(article);
  const journal = article.fulljournalname ?? article.source ?? null;
  const publication_date = article.pubdate ?? article.epubdate ?? null;
  const title = article.title?.trim() || `PubMed record ${pmid}`;
  const abstract = buildAbstract(abstractText);
  const baseAppraisal = appraisePubMedRecord(
    query,
    title,
    abstract.text,
    relevanceScoreForRank(rank, total)
  );
  const { appraisal, analysis } = applyContextualAppraisal(
    title,
    abstract.text,
    baseAppraisal.appraisal,
    baseAppraisal.analysis
  );

  return {
    source_id: `pubmed-${pmid}`,
    source_type: "pubmed",
    source_rank: rank,
    title,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    publication_year,
    evidence_level: "unknown",
    relevance_to_claim: mapDirectnessToRelevance(
      appraisal.directness_to_claim,
      appraisal.intervention_match
    ),
    supports_claim: analysis.supports_claim,
    summary: appraisal.appraisal_summary,
    meta: {
      pmid,
      doi,
      journal,
      publication_date,
      citation: buildCitation(article),
    },
    methodology: {
      study_design: mapDetectedStudyDesign(analysis.study_design),
      sample_size: null,
      population:
        appraisal.species_relevance === "animal"
          ? "Animal study context (auto-detected)"
          : appraisal.species_relevance === "human"
            ? "Human study context (auto-detected)"
            : null,
      duration: null,
    },
    analysis: {
      outcomes: analysis.outcomes,
      effect_summary: analysis.effect_summary,
      claim_alignment: analysis.claim_alignment,
      alignment_confidence: analysis.alignment_confidence,
      relevance_score: analysis.relevance_score,
    },
    study_limitations: [...PHASE6_LIMITATIONS],
    regulatory_flags: [],
    regulatory_context: [],
    abstract,
    appraisal,
  };
}

export type PubMedReportConfidence = {
  overall: "low" | "medium" | "high";
  score: number;
  rationale: string;
};

export function buildPubMedReportConfidence(
  sources: EvidenceSource[]
): PubMedReportConfidence {
  const pubmedSources = sources.filter((source) => source.source_type === "pubmed");

  if (pubmedSources.length === 0) {
    return {
      overall: "low",
      score: 0.35,
      rationale:
        "Real PubMed metadata was retrieved, but sources have not yet been appraised for study design, outcomes, or direct claim support.",
    };
  }

  const allIrrelevant = pubmedSources.every(
    (source) => source.appraisal && isObviouslyIrrelevant(source.appraisal)
  );

  if (allIrrelevant) {
    return {
      overall: "low",
      score: 0.25,
      rationale:
        "PubMed abstracts were retrieved, but automated appraisal flagged all sources as indirect or irrelevant to the claim.",
    };
  }

  const hasAbstracts = pubmedSources.some((source) => source.abstract?.available);

  return {
    overall: "low",
    score: hasAbstracts ? 0.4 : 0.35,
    rationale:
      "PubMed abstracts were retrieved and basic automated appraisal was applied, but sources have not been fully graded for claim substantiation.",
  };
}

export async function fetchPubMedSourcesForPmids(
  query: string,
  pmids: string[]
): Promise<EvidenceSource[]> {
  if (pmids.length === 0) {
    return [];
  }

  const [summaries, abstracts] = await Promise.all([
    fetchPubMedSummaries(pmids),
    fetchPubMedAbstracts(pmids),
  ]);

  return summaries
    .map((article, index) =>
      mapSummaryToSource(
        article,
        index + 1,
        summaries.length,
        query,
        article.uid ? abstracts[article.uid] : undefined
      )
    )
    .filter((source): source is EvidenceSource => source !== null);
}

export async function fetchPubMedSources(
  query: string,
  maxSources?: number,
  recencyYears?: number
): Promise<EvidenceSource[]> {
  const limit = resolveMaxSources(maxSources);
  const pmids = await searchPubMedPmids(query, limit, recencyYears);

  if (pmids.length === 0) {
    return [];
  }

  return fetchPubMedSourcesForPmids(query, pmids.slice(0, limit));
}

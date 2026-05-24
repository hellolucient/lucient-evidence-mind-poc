import {
  resolveMaxSources,
  type EvidenceSource,
} from "./evidence-stubs";

const ESEARCH_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const ESUMMARY_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
const NCBI_TOOL = "lucient-evidence-mind-poc";
const NCBI_EMAIL = "poc@example.com";
const FETCH_TIMEOUT_MS = 8000;

const PHASE5_LIMITATIONS = [
  "Phase 5 metadata-only retrieval",
  "No abstract appraisal yet",
  "No study design extraction yet",
  "No effect-size extraction yet",
];

export type PubMedFetchFilters = {
  source_types?: string[];
  recency_years?: number;
  max_sources?: number;
  use_real_pubmed?: boolean;
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

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`NCBI request failed with status ${response.status}`);
    }

    return response.json();
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

async function searchPubMedPmids(
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

  const data = (await fetchJson(`${ESEARCH_URL}?${params}`)) as ESearchResponse;
  return data.esearchresult?.idlist ?? [];
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

  const data = (await fetchJson(`${ESUMMARY_URL}?${params}`)) as ESummaryResponse;
  const result = data.result;
  if (!result) {
    return [];
  }

  return pmids
    .map((pmid) => result[pmid])
    .filter((article): article is ESummaryArticle => Boolean(article && typeof article === "object"));
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
  const suffix =
    (article.authors?.length ?? 0) > 3 ? ", et al." : "";
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

function mapSummaryToSource(
  article: ESummaryArticle,
  rank: number,
  total: number
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

  return {
    source_id: `pubmed-${pmid}`,
    source_type: "pubmed",
    source_rank: rank,
    title,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    publication_year,
    evidence_level: "unknown",
    relevance_to_claim: "indirect",
    supports_claim: "unclear",
    summary:
      "Retrieved from PubMed as a potentially relevant record. Not yet critically appraised.",
    meta: {
      pmid,
      doi,
      journal,
      publication_date,
      citation: buildCitation(article),
    },
    methodology: {
      study_design: "unknown",
      sample_size: null,
      population: null,
      duration: null,
    },
    analysis: {
      outcomes: [],
      effect_summary: "Not yet extracted in Phase 5.",
      claim_alignment: "insufficient",
      alignment_confidence: 0.25,
      relevance_score: relevanceScoreForRank(rank, total),
    },
    study_limitations: [...PHASE5_LIMITATIONS],
    regulatory_flags: [],
    regulatory_context: [],
  };
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

  const summaries = await fetchPubMedSummaries(pmids.slice(0, limit));

  return summaries
    .map((article, index) => mapSummaryToSource(article, index + 1, summaries.length))
    .filter((source): source is EvidenceSource => source !== null);
}

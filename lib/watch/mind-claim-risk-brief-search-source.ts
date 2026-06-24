const ALLOWED_SOURCES = ["PubMed", "Other", "Not searched"] as const;
export type MindRiskBriefSearchSource = (typeof ALLOWED_SOURCES)[number];

export type MindRiskBriefSearchSourceNormalizationResult =
  | { ok: true; source: MindRiskBriefSearchSource }
  | { ok: false; message: string };

function looksLikeGeneralSourceLabel(value: string): boolean {
  // Keep conservative: treat short label-like strings as "Other", but avoid normalizing URLs or long freeform sentences.
  if (value.length > 120) {
    return false;
  }

  const lower = value.toLowerCase();
  if (lower.includes("http://") || lower.includes("https://") || lower.includes("www.")) {
    return false;
  }

  return /^[\w\s\-./(),:]+$/.test(value);
}

export function normalizeMindRiskBriefSearchSource(
  value: unknown
): MindRiskBriefSearchSourceNormalizationResult {
  if (typeof value !== "string") {
    return { ok: false, message: `expected string, received ${typeof value}` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: 'expected non-empty string, received empty string ""' };
  }

  if ((ALLOWED_SOURCES as readonly string[]).includes(trimmed)) {
    return { ok: true, source: trimmed as MindRiskBriefSearchSource };
  }

  const lower = trimmed.toLowerCase();

  if (lower.includes("not searched")) {
    return { ok: true, source: "Not searched" };
  }

  if (lower.includes("pubmed") || lower.includes("ncbi") || lower.includes("e-utilities")) {
    return { ok: true, source: "PubMed" };
  }

  if (looksLikeGeneralSourceLabel(trimmed)) {
    return { ok: true, source: "Other" };
  }

  return { ok: false, message: `unrecognized source label \"${trimmed}\"` };
}


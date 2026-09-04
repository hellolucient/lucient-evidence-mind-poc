export const STATEMENT_ASSESS_SOURCE_TYPE = "other" as const;
export const STATEMENT_ASSESS_EXAMPLE_TEXT =
  "Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance.";

const STATEMENT_TITLE_MAX = 80;

export function buildStatementTitle(sourceText: string): string {
  const firstLine = sourceText.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!firstLine) {
    return "Wellness statement";
  }

  if (firstLine.length <= STATEMENT_TITLE_MAX) {
    return firstLine;
  }

  return `${firstLine.slice(0, STATEMENT_TITLE_MAX - 1).trimEnd()}…`;
}

import { z } from "zod";

export const MIND_JSON_FIELD_MAX_LENGTH = 10_000;
export const MIND_JSON_ARRAY_MAX_ITEMS = 100;

export type MindJsonParseError = {
  ok: false;
  error: string;
  message: string;
};

export type MindJsonParseSuccess<T> = {
  ok: true;
  data: T;
};

export type MindJsonParseResult<T> = MindJsonParseSuccess<T> | MindJsonParseError;

const JSON_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

export function stripMarkdownJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(JSON_FENCE_PATTERN);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  return trimmed;
}

export function extractFirstJsonObject(text: string): string | null {
  const stripped = stripMarkdownJsonFences(text);
  const start = stripped.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < stripped.length; i += 1) {
    const char = stripped[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return stripped.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function truncateMindField(value: string, maxLength = MIND_JSON_FIELD_MAX_LENGTH): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function truncateMindStringArray(values: string[]): string[] {
  return values.slice(0, MIND_JSON_ARRAY_MAX_ITEMS).map((value) => truncateMindField(value));
}

export function parseMindJsonWithSchema<T>(input: {
  rawText: string;
  expectedContractVersion: string;
  schema: z.ZodType<T>;
  contractVersionField?: string;
}): MindJsonParseResult<T> {
  const jsonText = extractFirstJsonObject(input.rawText);
  if (!jsonText) {
    return {
      ok: false,
      error: "json_not_found",
      message: "No valid JSON object found in Mind response.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error: "malformed_json",
      message: "Mind response JSON is malformed.",
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      ok: false,
      error: "invalid_json_shape",
      message: "Mind response must be a JSON object.",
    };
  }

  const record = parsed as Record<string, unknown>;
  const versionField = input.contractVersionField ?? "contract_version";
  const contractVersion = record[versionField];

  if (contractVersion !== input.expectedContractVersion) {
    return {
      ok: false,
      error: "wrong_contract_version",
      message: `Expected contract_version=${input.expectedContractVersion}, received ${String(contractVersion)}.`,
    };
  }

  const validated = input.schema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: "schema_validation_failed",
      message: validated.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  return { ok: true, data: validated.data };
}

export function sanitizeMindParseError(error: unknown): string {
  if (typeof error === "string") {
    return truncateMindField(error);
  }

  if (error instanceof Error) {
    return truncateMindField(error.message);
  }

  return "parse_failed";
}

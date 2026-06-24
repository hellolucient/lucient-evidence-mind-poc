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

const RECEIVED_VALUE_DISPLAY_MAX_LENGTH = 120;

export function formatMindJsonPath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "(root)";
  }

  let result = String(path[0]);
  for (let index = 1; index < path.length; index += 1) {
    const segment = path[index];
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      result += `.${String(segment)}`;
    }
  }

  return result;
}

export function getValueAtJsonPath(input: unknown, path: PropertyKey[]): unknown {
  let current = input;

  for (const segment of path) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<PropertyKey, unknown>)[segment];
  }

  return current;
}

function formatReceivedValue(value: unknown): string {
  if (typeof value === "string") {
    const display =
      value.length > RECEIVED_VALUE_DISPLAY_MAX_LENGTH
        ? `${value.slice(0, RECEIVED_VALUE_DISPLAY_MAX_LENGTH - 1)}…`
        : value;
    return `string "${display}"`;
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > RECEIVED_VALUE_DISPLAY_MAX_LENGTH) {
        return `${serialized.slice(0, RECEIVED_VALUE_DISPLAY_MAX_LENGTH - 1)}…`;
      }
      return serialized;
    } catch {
      return "[object]";
    }
  }

  return String(value);
}

export function formatZodValidationIssue(issue: z.ZodIssue, input: unknown): string {
  const path = formatMindJsonPath(issue.path);
  const received = getValueAtJsonPath(input, issue.path);
  const receivedLabel = formatReceivedValue(received);

  if (issue.code === "invalid_type") {
    return `${path} expected ${issue.expected}, received ${receivedLabel}`;
  }

  if (issue.code === "invalid_value") {
    const allowed = "values" in issue && Array.isArray(issue.values) ? issue.values : [];
    const allowedLabel =
      allowed.length > 0 ? allowed.map((value) => JSON.stringify(value)).join(" | ") : "allowed value";
    return `${path} expected one of [${allowedLabel}], received ${receivedLabel}`;
  }

  if (issue.code === "too_small" || issue.code === "too_big") {
    return `${path} ${issue.message}; received ${receivedLabel}`;
  }

  return `${path} ${issue.message}; received ${receivedLabel}`;
}

export function formatZodValidationIssues(error: z.ZodError, input: unknown): string {
  return error.issues.map((issue) => formatZodValidationIssue(issue, input)).join("; ");
}

export function validateMindJsonObject<T>(input: {
  parsed: unknown;
  expectedContractVersion: string;
  schema: z.ZodType<T>;
  contractVersionField?: string;
  preprocess?: (record: Record<string, unknown>) => MindJsonParseResult<Record<string, unknown>>;
}): MindJsonParseResult<T> {
  if (!input.parsed || typeof input.parsed !== "object" || Array.isArray(input.parsed)) {
    return {
      ok: false,
      error: "invalid_json_shape",
      message: "Mind response must be a JSON object.",
    };
  }

  let record = input.parsed as Record<string, unknown>;
  const versionField = input.contractVersionField ?? "contract_version";
  const contractVersion = record[versionField];

  if (contractVersion !== input.expectedContractVersion) {
    return {
      ok: false,
      error: "wrong_contract_version",
      message: `Expected contract_version=${input.expectedContractVersion}, received ${String(contractVersion)}.`,
    };
  }

  if (input.preprocess) {
    const preprocessed = input.preprocess(record);
    if (!preprocessed.ok) {
      return preprocessed;
    }
    record = preprocessed.data;
  }

  const validated = input.schema.safeParse(record);
  if (!validated.success) {
    return {
      ok: false,
      error: "schema_validation_failed",
      message: formatZodValidationIssues(validated.error, record),
    };
  }

  return { ok: true, data: validated.data };
}

export function parseMindJsonWithSchema<T>(input: {
  rawText: string;
  expectedContractVersion: string;
  schema: z.ZodType<T>;
  contractVersionField?: string;
  preprocess?: (record: Record<string, unknown>) => MindJsonParseResult<Record<string, unknown>>;
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

  return validateMindJsonObject({
    parsed,
    expectedContractVersion: input.expectedContractVersion,
    schema: input.schema,
    contractVersionField: input.contractVersionField,
    preprocess: input.preprocess,
  });
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

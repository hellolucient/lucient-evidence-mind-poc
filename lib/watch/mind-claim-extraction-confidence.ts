const CONFIDENCE_LABEL_MAP: Record<string, number> = {
  "very high": 0.95,
  high: 0.9,
  medium: 0.6,
  moderate: 0.6,
  low: 0.3,
  "very low": 0.15,
};

const NUMERIC_CONFIDENCE_CLAMP_TOLERANCE = 0.05;

export type MindExtractionConfidenceNormalizationResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

function normalizeNumericConfidence(value: number): MindExtractionConfidenceNormalizationResult {
  if (!Number.isFinite(value)) {
    return { ok: false, message: `expected number between 0 and 1, received ${String(value)}` };
  }

  if (value >= 0 && value <= 1) {
    return { ok: true, value };
  }

  if (value > 1 && value <= 1 + NUMERIC_CONFIDENCE_CLAMP_TOLERANCE) {
    return { ok: true, value: 1 };
  }

  if (value < 0 && value >= -NUMERIC_CONFIDENCE_CLAMP_TOLERANCE) {
    return { ok: true, value: 0 };
  }

  return { ok: false, message: `expected number between 0 and 1, received ${value}` };
}

export function normalizeMindExtractionConfidence(
  value: unknown
): MindExtractionConfidenceNormalizationResult {
  if (typeof value === "number") {
    return normalizeNumericConfidence(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { ok: false, message: 'expected confidence label or number, received empty string ""' };
    }

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && trimmed !== "") {
      return normalizeNumericConfidence(asNumber);
    }

    const label = trimmed.toLowerCase();
    const mapped = CONFIDENCE_LABEL_MAP[label];
    if (mapped !== undefined) {
      return { ok: true, value: mapped };
    }

    return {
      ok: false,
      message: `expected confidence label or number, received string "${trimmed}"`,
    };
  }

  return {
    ok: false,
    message: `expected confidence label or number, received ${typeof value}`,
  };
}

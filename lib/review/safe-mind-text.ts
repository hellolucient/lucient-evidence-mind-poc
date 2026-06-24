import { convertHelloMindsMessageTextToPlainText } from "@/lib/watch/external-mind-hellominds-message-format";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeMindDisplayText(text: string): string {
  return text.replace(/[&<>"]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

function decodeHarmlessHtmlEntities(text: string): string {
  // Minimal, safe decoding for operator display only.
  // We intentionally do not interpret markup; callers still escape <, >, &, ".
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
  };

  let decoded = text.replace(/&(amp|lt|gt|quot|apos);|&#39;/g, (match) => named[match] ?? match);

  // Decode numeric entities like &#x27; and &#8217; for common punctuation.
  decoded = decoded.replace(/&#(x[0-9a-fA-F]+|\d+);/g, (_match, raw) => {
    const value =
      typeof raw === "string" && raw.startsWith("x")
        ? Number.parseInt(raw.slice(1), 16)
        : Number.parseInt(String(raw), 10);
    if (!Number.isFinite(value) || value <= 0 || value > 0x10ffff) {
      return _match;
    }
    try {
      return String.fromCodePoint(value);
    } catch {
      return _match;
    }
  });

  return decoded;
}

/**
 * Safe plain text for display in React text nodes (e.g. <pre>{text}</pre>).
 *
 * React will escape markup characters for us, so we do not pre-escape quotes here.
 * We still strip tags and decode harmless entities to improve operator readability.
 */
export function toMindDisplayPlainText(text: string | null | undefined): string {
  if (!text?.trim()) {
    return "";
  }

  const plain = convertHelloMindsMessageTextToPlainText(text);
  return decodeHarmlessHtmlEntities(plain);
}

export function toSafeMindPlainText(text: string | null | undefined): string {
  if (!text?.trim()) {
    return "";
  }

  const decoded = toMindDisplayPlainText(text);
  return escapeMindDisplayText(decoded);
}

export function toSafeMindMarkdownText(text: string | null | undefined): string {
  const plain = toSafeMindPlainText(text);
  return plain
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function renderSafeMindTextBlock(text: string | null | undefined): string {
  return toSafeMindPlainText(text);
}

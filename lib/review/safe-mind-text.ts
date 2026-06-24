import { convertHelloMindsMessageTextToPlainText } from "@/lib/watch/external-mind-hellominds-message-format";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeMindDisplayText(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function toSafeMindPlainText(text: string | null | undefined): string {
  if (!text?.trim()) {
    return "";
  }

  return escapeMindDisplayText(convertHelloMindsMessageTextToPlainText(text));
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

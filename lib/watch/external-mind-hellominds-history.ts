import {
  containsHelloMindsSensitiveEnvValue,
  getHelloMindsAccessKey,
  getHelloMindsBaseUrl,
  getHelloMindsSendTimeoutMs,
  isHelloMindsReadApiConfigured,
} from "@/lib/watch/external-mind-hellominds-send-config";

export const HELLOMINDS_PARTY_TYPE_MIND = 0;
export const HELLOMINDS_PARTY_TYPE_HUMAN = 1;

export const HELLOMINDS_HISTORY_RESPONSE_SOURCE = "hellominds_history_api" as const;

import {
  buildHelloMindsMindReplyExcerpts,
  HELLOMINDS_MIND_REPLY_MAIN_EXCERPT_MAX_LENGTH,
} from "@/lib/watch/external-mind-hellominds-message-format";

export type HelloMindsHistoryAttachmentMetadata = {
  artifactId?: string;
  mimeType?: string;
  extension?: string;
  slug?: string;
  logicalType?: string;
};

export type HelloMindsHistoryMessageRecord = {
  alias?: string;
  conversationId?: string;
  messageId?: string;
  messageText?: string;
  createdAt?: string;
  fingerprint?: string;
  partyType?: number;
  mindId?: string;
  mindName?: string;
  mindEmail?: string;
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  attachments?: HelloMindsHistoryAttachmentMetadata[];
};

export type HelloMindsHistoryFetchResult =
  | {
      ok: true;
      httpStatus: number;
      messages: HelloMindsHistoryMessageRecord[];
    }
  | {
      ok: false;
      httpStatus?: number;
      error:
        | "read_api_not_configured"
        | "conversation_not_found"
        | "auth_failed"
        | "http_error"
        | "timeout"
        | "network"
        | "invalid_response";
      message: string;
    };

export type HelloMindsHistoryKeyDiagnostics = {
  key: string;
  url: string;
  http_status: number | null;
  json_parsed: boolean;
  json_parse_error: string | null;
  raw_top_level_type: "array" | "object" | "other" | "null";
  raw_top_level_keys: string[];
  raw_message_count: number;
  parsed_message_count: number;
  raw_first_3_messages: string[];
  raw_last_3_messages: string[];
};

export type HelloMindsHistoryMultiKeyDiagnostics = {
  checked_keys: string[];
  results: HelloMindsHistoryKeyDiagnostics[];
};

export type HelloMindsHistorySummary = {
  message_count: number;
  latest_fingerprint: string | null;
  latest_mind_reply: HelloMindsHistoryMessageRecord | null;
  latest_mind_reply_created_at: string | null;
  response_excerpt: string | null;
  cost_report_present: boolean;
  cost_report_excerpt: string | null;
  cost_report_truncated: boolean;
  attachment_count: number;
  attachment_metadata: HelloMindsHistoryAttachmentMetadata[];
  mind_reply_state: "mind_reply_found" | "no_reply_yet";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseAttachmentMetadata(value: unknown): HelloMindsHistoryAttachmentMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const metadata: HelloMindsHistoryAttachmentMetadata = {};
  const artifactId = readString(value, "artifactId");
  const mimeType = readString(value, "mimeType");
  const extension = readString(value, "extension");
  const slug = readString(value, "slug");
  const logicalType = readString(value, "logicalType");

  if (artifactId) metadata.artifactId = artifactId;
  if (mimeType) metadata.mimeType = mimeType;
  if (extension) metadata.extension = extension;
  if (slug) metadata.slug = slug;
  if (logicalType) metadata.logicalType = logicalType;

  return Object.keys(metadata).length > 0 ? metadata : null;
}

export function parseHelloMindsHistoryMessages(parsed: unknown): HelloMindsHistoryMessageRecord[] {
  const rawMessages = resolveHelloMindsHistoryMessageArray(parsed);
  if (rawMessages.length === 0) return [];

  return rawMessages
    .map(parseHelloMindsHistoryMessageRecord)
    .filter((item): item is HelloMindsHistoryMessageRecord => item !== null);
}

function truncateForDiagnostics(value: unknown, maxLen = 500): string {
  let text = "";
  try {
    text = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…(truncated ${text.length - maxLen} chars)`;
}

function readAnyString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function resolveHelloMindsHistoryMessageArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];

  // Some deployments may wrap history in an object.
  const candidates = ["messages", "history", "items", "data"];
  for (const key of candidates) {
    const value = parsed[key];
    if (Array.isArray(value)) return value;
  }

  // Common alternate wrapper shapes: { data: { messages: [] } }
  const data = parsed.data;
  if (isRecord(data)) {
    for (const key of candidates) {
      const value = data[key];
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

export function buildPrivacySafeHelloMindsMessageExcerpt(
  messageText: string | undefined,
  maxLength = HELLOMINDS_MIND_REPLY_MAIN_EXCERPT_MAX_LENGTH
): string | null {
  return buildHelloMindsMindReplyExcerpts({ messageText, mainMaxLength: maxLength }).response_excerpt;
}

function compareCreatedAtDesc(
  left: HelloMindsHistoryMessageRecord,
  right: HelloMindsHistoryMessageRecord
): number {
  const leftTime = left.createdAt ? Date.parse(left.createdAt) : Number.NaN;
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : Number.NaN;

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  if (Number.isFinite(leftTime) && !Number.isFinite(rightTime)) {
    return -1;
  }

  if (!Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return 1;
  }

  return 0;
}

export function summarizeHelloMindsHistoryMessages(
  messages: HelloMindsHistoryMessageRecord[]
): HelloMindsHistorySummary {
  const sorted = [...messages].sort(compareCreatedAtDesc);
  const latestMessage = sorted[0] ?? null;
  const mindReplies = sorted.filter((message) => message.partyType === HELLOMINDS_PARTY_TYPE_MIND);
  const latestMindReply = mindReplies[0] ?? null;

  const attachmentMetadata = (latestMindReply?.attachments ?? []).slice();
  const attachmentCount = attachmentMetadata.length;
  const excerpts = buildHelloMindsMindReplyExcerpts({
    messageText: latestMindReply?.messageText,
  });

  return {
    message_count: messages.length,
    latest_fingerprint: latestMessage?.fingerprint ?? null,
    latest_mind_reply: latestMindReply,
    latest_mind_reply_created_at: latestMindReply?.createdAt ?? null,
    response_excerpt: excerpts.response_excerpt,
    cost_report_present: excerpts.cost_report_present,
    cost_report_excerpt: excerpts.cost_report_excerpt,
    cost_report_truncated: excerpts.cost_report_truncated,
    attachment_count: attachmentCount,
    attachment_metadata: attachmentMetadata,
    mind_reply_state: latestMindReply ? "mind_reply_found" : "no_reply_yet",
  };
}

function buildHistoryErrorMessage(
  error: Extract<HelloMindsHistoryFetchResult, { ok: false }>["error"]
): string {
  switch (error) {
    case "read_api_not_configured":
      return "HelloMinds read API is not configured. Set EXTERNAL_MIND_HELLOMINDS_BASE_URL and EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY.";
    case "conversation_not_found":
      return "Conversation not found.";
    case "auth_failed":
      return "HelloMinds read API authentication failed. Check HelloMinds access key configuration.";
    case "timeout":
      return "HelloMinds history request timed out.";
    case "network":
      return "HelloMinds history request failed due to a network error.";
    case "invalid_response":
      return "HelloMinds history response was invalid.";
    default:
      return "HelloMinds history request failed.";
  }
}

export async function fetchHelloMindsConversationHistory(input: {
  conversationAlias: string;
  after?: string;
  limit?: number;
}): Promise<HelloMindsHistoryFetchResult> {
  if (!isHelloMindsReadApiConfigured()) {
    return {
      ok: false,
      error: "read_api_not_configured",
      message: buildHistoryErrorMessage("read_api_not_configured"),
    };
  }

  const baseUrl = getHelloMindsBaseUrl();
  const accessKey = getHelloMindsAccessKey();
  if (!baseUrl || !accessKey) {
    return {
      ok: false,
      error: "read_api_not_configured",
      message: buildHistoryErrorMessage("read_api_not_configured"),
    };
  }

  const limit = typeof input.limit === "number" && input.limit > 0 ? input.limit : 50;
  const params = new URLSearchParams({ limit: String(limit) });
  if (input.after?.trim()) {
    params.set("after", input.after.trim());
  }

  const url = `${baseUrl.replace(/\/$/, "")}/v1/messaging/history/${encodeURIComponent(input.conversationAlias)}?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getHelloMindsSendTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Access-Key": accessKey,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "auth_failed",
        message: buildHistoryErrorMessage("auth_failed"),
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "conversation_not_found",
        message: buildHistoryErrorMessage("conversation_not_found"),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "http_error",
        message: buildHistoryErrorMessage("http_error"),
      };
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return {
        ok: false,
        httpStatus: response.status,
        error: "invalid_response",
        message: buildHistoryErrorMessage("invalid_response"),
      };
    }

    const messages = parseHelloMindsHistoryMessages(parsed);
    const serialized = JSON.stringify(messages);
    if (containsHelloMindsSensitiveEnvValue(serialized)) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "invalid_response",
        message: buildHistoryErrorMessage("invalid_response"),
      };
    }

    return {
      ok: true,
      httpStatus: response.status,
      messages,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "timeout",
        message: buildHistoryErrorMessage("timeout"),
      };
    }

    return {
      ok: false,
      error: "network",
      message: buildHistoryErrorMessage("network"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchHelloMindsConversationHistoryWithDiagnostics(input: {
  conversationAlias: string;
  after?: string;
  limit?: number;
}): Promise<
  | { ok: true; httpStatus: number; messages: HelloMindsHistoryMessageRecord[]; diagnostics: HelloMindsHistoryKeyDiagnostics }
  | { ok: false; httpStatus?: number; error: HelloMindsHistoryFetchResult extends { ok: false; error: infer E } ? E : string; message: string; diagnostics: HelloMindsHistoryKeyDiagnostics }
> {
  if (!isHelloMindsReadApiConfigured()) {
    const baseUrl = getHelloMindsBaseUrl() ?? "";
    const url = `${baseUrl.replace(/\/$/, "")}/v1/messaging/history/${encodeURIComponent(input.conversationAlias)}`;
    return {
      ok: false,
      error: "read_api_not_configured",
      message: buildHistoryErrorMessage("read_api_not_configured"),
      diagnostics: {
        key: input.conversationAlias,
        url,
        http_status: null,
        json_parsed: false,
        json_parse_error: null,
        raw_top_level_type: "null",
        raw_top_level_keys: [],
        raw_message_count: 0,
        parsed_message_count: 0,
        raw_first_3_messages: [],
        raw_last_3_messages: [],
      },
    };
  }

  const baseUrl = getHelloMindsBaseUrl();
  const accessKey = getHelloMindsAccessKey();
  if (!baseUrl || !accessKey) {
    const url = `${(baseUrl ?? "").replace(/\/$/, "")}/v1/messaging/history/${encodeURIComponent(input.conversationAlias)}`;
    return {
      ok: false,
      error: "read_api_not_configured",
      message: buildHistoryErrorMessage("read_api_not_configured"),
      diagnostics: {
        key: input.conversationAlias,
        url,
        http_status: null,
        json_parsed: false,
        json_parse_error: null,
        raw_top_level_type: "null",
        raw_top_level_keys: [],
        raw_message_count: 0,
        parsed_message_count: 0,
        raw_first_3_messages: [],
        raw_last_3_messages: [],
      },
    };
  }

  const limit = typeof input.limit === "number" && input.limit > 0 ? input.limit : 50;
  const params = new URLSearchParams({ limit: String(limit) });
  if (input.after?.trim()) {
    params.set("after", input.after.trim());
  }
  const url = `${baseUrl.replace(/\/$/, "")}/v1/messaging/history/${encodeURIComponent(input.conversationAlias)}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getHelloMindsSendTimeoutMs());

  let httpStatus: number | null = null;
  let parsed: unknown = null;
  let jsonParsed = false;
  let jsonParseError: string | null = null;

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Access-Key": accessKey,
      },
    });

    httpStatus = response.status;

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "auth_failed",
        message: buildHistoryErrorMessage("auth_failed"),
        diagnostics: {
          key: input.conversationAlias,
          url,
          http_status: response.status,
          json_parsed: false,
          json_parse_error: null,
          raw_top_level_type: "null",
          raw_top_level_keys: [],
          raw_message_count: 0,
          parsed_message_count: 0,
          raw_first_3_messages: [],
          raw_last_3_messages: [],
        },
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "conversation_not_found",
        message: buildHistoryErrorMessage("conversation_not_found"),
        diagnostics: {
          key: input.conversationAlias,
          url,
          http_status: response.status,
          json_parsed: false,
          json_parse_error: null,
          raw_top_level_type: "null",
          raw_top_level_keys: [],
          raw_message_count: 0,
          parsed_message_count: 0,
          raw_first_3_messages: [],
          raw_last_3_messages: [],
        },
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "http_error",
        message: buildHistoryErrorMessage("http_error"),
        diagnostics: {
          key: input.conversationAlias,
          url,
          http_status: response.status,
          json_parsed: false,
          json_parse_error: null,
          raw_top_level_type: "null",
          raw_top_level_keys: [],
          raw_message_count: 0,
          parsed_message_count: 0,
          raw_first_3_messages: [],
          raw_last_3_messages: [],
        },
      };
    }

    try {
      parsed = await response.json();
      jsonParsed = true;
    } catch (err) {
      jsonParseError = err instanceof Error ? err.message : "json_parse_failed";
      return {
        ok: false,
        httpStatus: response.status,
        error: "invalid_response",
        message: buildHistoryErrorMessage("invalid_response"),
        diagnostics: {
          key: input.conversationAlias,
          url,
          http_status: response.status,
          json_parsed: false,
          json_parse_error: jsonParseError,
          raw_top_level_type: "null",
          raw_top_level_keys: [],
          raw_message_count: 0,
          parsed_message_count: 0,
          raw_first_3_messages: [],
          raw_last_3_messages: [],
        },
      };
    }

    const rawMessages = resolveHelloMindsHistoryMessageArray(parsed);
    const rawTopLevelType: HelloMindsHistoryKeyDiagnostics["raw_top_level_type"] = parsed === null
      ? "null"
      : Array.isArray(parsed)
        ? "array"
        : typeof parsed === "object"
          ? "object"
          : "other";
    const rawTopLevelKeys = isRecord(parsed) ? Object.keys(parsed).slice(0, 50) : [];
    const rawFirst3 = rawMessages.slice(0, 3).map((m) => truncateForDiagnostics(m, 500));
    const rawLast3 = rawMessages.slice(Math.max(0, rawMessages.length - 3)).map((m) =>
      truncateForDiagnostics(m, 500)
    );

    const messages = parseHelloMindsHistoryMessages(parsed);
    const serialized = JSON.stringify(messages);
    if (containsHelloMindsSensitiveEnvValue(serialized)) {
      return {
        ok: false,
        httpStatus: response.status,
        error: "invalid_response",
        message: buildHistoryErrorMessage("invalid_response"),
        diagnostics: {
          key: input.conversationAlias,
          url,
          http_status: response.status,
          json_parsed: jsonParsed,
          json_parse_error: jsonParseError,
          raw_top_level_type: rawTopLevelType,
          raw_top_level_keys: rawTopLevelKeys,
          raw_message_count: rawMessages.length,
          parsed_message_count: messages.length,
          raw_first_3_messages: rawFirst3,
          raw_last_3_messages: rawLast3,
        },
      };
    }

    return {
      ok: true,
      httpStatus: response.status,
      messages,
      diagnostics: {
        key: input.conversationAlias,
        url,
        http_status: response.status,
        json_parsed: jsonParsed,
        json_parse_error: jsonParseError,
        raw_top_level_type: rawTopLevelType,
        raw_top_level_keys: rawTopLevelKeys,
        raw_message_count: rawMessages.length,
        parsed_message_count: messages.length,
        raw_first_3_messages: rawFirst3,
        raw_last_3_messages: rawLast3,
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : null;
    if (err && err.name === "AbortError") {
      return {
        ok: false,
        error: "timeout",
        message: buildHistoryErrorMessage("timeout"),
        diagnostics: {
          key: input.conversationAlias,
          url,
          http_status: httpStatus,
          json_parsed: jsonParsed,
          json_parse_error: jsonParseError,
          raw_top_level_type: "null",
          raw_top_level_keys: [],
          raw_message_count: 0,
          parsed_message_count: 0,
          raw_first_3_messages: [],
          raw_last_3_messages: [],
        },
      };
    }

    return {
      ok: false,
      error: "network",
      message: buildHistoryErrorMessage("network"),
      diagnostics: {
        key: input.conversationAlias,
        url,
        http_status: httpStatus,
        json_parsed: jsonParsed,
        json_parse_error: jsonParseError,
        raw_top_level_type: "null",
        raw_top_level_keys: [],
        raw_message_count: 0,
        parsed_message_count: 0,
        raw_first_3_messages: [],
        raw_last_3_messages: [],
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function extractHelloMindsMessageTextLoose(message: HelloMindsHistoryMessageRecord): string | null {
  // Parsed messages already normalize messageText, but this helper makes intent explicit.
  return message.messageText?.trim() ? message.messageText.trim() : null;
}

export function parseHelloMindsHistoryMessageRecord(value: unknown): HelloMindsHistoryMessageRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const record: HelloMindsHistoryMessageRecord = {};
  const alias = readString(value, "alias");
  const conversationId = readAnyString(value, ["conversationId", "conversation_id", "threadId", "thread_id"]);
  const messageId = readAnyString(value, ["messageId", "message_id", "id"]);
  const messageText = readAnyString(value, ["messageText", "text", "body", "content", "message"]);
  const createdAt = readAnyString(value, ["createdAt", "created_at", "timestamp", "date", "sentAt", "sent_at"]);
  const fingerprint = readString(value, "fingerprint");
  const partyType = readNumber(value, "partyType") ?? readNumber(value, "party_type");
  const mindId = readAnyString(value, ["mindId", "mind_id"]);
  const mindName = readAnyString(value, ["mindName", "mind_name"]);
  const mindEmail = readAnyString(value, ["mindEmail", "mind_email"]);
  const senderName = readAnyString(value, ["senderName", "sender_name", "fromName", "from_name"]);
  const senderEmail = readAnyString(value, ["senderEmail", "sender_email", "fromEmail", "from_email"]);
  const subject = readAnyString(value, ["subject", "title"]);

  if (alias) record.alias = alias;
  if (conversationId) record.conversationId = conversationId;
  if (messageId) record.messageId = messageId;
  if (messageText) record.messageText = messageText;
  if (createdAt) record.createdAt = createdAt;
  if (fingerprint) record.fingerprint = fingerprint;
  if (typeof partyType === "number") record.partyType = partyType;
  if (mindId) record.mindId = mindId;
  if (mindName) record.mindName = mindName;
  if (mindEmail) record.mindEmail = mindEmail;
  if (senderName) record.senderName = senderName;
  if (senderEmail) record.senderEmail = senderEmail;
  if (subject) record.subject = subject;

  if (Array.isArray(value.attachments)) {
    const attachments = value.attachments
      .map(parseAttachmentMetadata)
      .filter((item): item is HelloMindsHistoryAttachmentMetadata => item !== null);
    if (attachments.length > 0) {
      record.attachments = attachments;
    }
  }

  return Object.keys(record).length > 0 ? record : null;
}

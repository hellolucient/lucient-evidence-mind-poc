import {
  getHelloMindsAccessKey,
  getHelloMindsBaseUrl,
  getHelloMindsConversationAliasPrefix,
  getHelloMindsSendTimeoutMs,
  isHelloMindsReadApiConfigured,
} from "@/lib/watch/external-mind-hellominds-send-config";

export type HelloMindsConversationRecord = {
  conversationId?: string;
  alias?: string;
  mindId?: string;
};

export type HelloMindsConversationListDiagnostics = {
  url: string;
  http_status: number | null;
  json_parsed: boolean;
  conversation_count: number;
  conversations_sample: string[];
};

export type HelloMindsConversationGetDiagnostics = {
  key: string;
  url: string;
  http_status: number | null;
  json_parsed: boolean;
  conversation: HelloMindsConversationRecord | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseHelloMindsConversationRecord(value: unknown): HelloMindsConversationRecord | null {
  if (!isRecord(value)) return null;

  const record: HelloMindsConversationRecord = {};
  const conversationId = readString(value, "conversationId");
  const alias = readString(value, "alias");
  const mindId = readString(value, "mindId");

  if (conversationId) record.conversationId = conversationId;
  if (alias) record.alias = alias;
  if (mindId) record.mindId = mindId;

  return Object.keys(record).length > 0 ? record : null;
}

function parseHelloMindsConversationList(parsed: unknown): HelloMindsConversationRecord[] {
  if (Array.isArray(parsed)) {
    return parsed
      .map(parseHelloMindsConversationRecord)
      .filter((item): item is HelloMindsConversationRecord => item !== null);
  }

  if (!isRecord(parsed)) return [];

  for (const key of ["conversations", "items", "data"]) {
    const value = parsed[key];
    if (Array.isArray(value)) {
      return value
        .map(parseHelloMindsConversationRecord)
        .filter((item): item is HelloMindsConversationRecord => item !== null);
    }
  }

  return [];
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

/** Builder API history is keyed by conversation alias, not mindId suffix or email channel id. */
export function isHelloMindsMessagingHistoryAlias(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  const prefix = getHelloMindsConversationAliasPrefix();
  return (
    trimmed.startsWith(`${prefix}-mrb-`) ||
    trimmed.startsWith(`${prefix}-mce-`) ||
    trimmed.startsWith(`${prefix}-ho-`)
  );
}

export function getHelloMindsEmailChannelProbeIds(): string[] {
  const value = process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID?.trim();
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function fetchHelloMindsJson(input: {
  url: string;
  accessKey: string;
  method?: "GET";
}): Promise<{ httpStatus: number; parsed: unknown | null; jsonParsed: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getHelloMindsSendTimeoutMs());

  try {
    const response = await fetch(input.url, {
      method: input.method ?? "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Access-Key": input.accessKey,
      },
    });

    let parsed: unknown = null;
    let jsonParsed = false;
    try {
      parsed = await response.json();
      jsonParsed = true;
    } catch {
      parsed = null;
    }

    return { httpStatus: response.status, parsed, jsonParsed };
  } finally {
    clearTimeout(timeout);
  }
}

export async function listHelloMindsConversationsWithDiagnostics(): Promise<{
  conversations: HelloMindsConversationRecord[];
  diagnostics: HelloMindsConversationListDiagnostics;
}> {
  const emptyDiagnostics: HelloMindsConversationListDiagnostics = {
    url: "",
    http_status: null,
    json_parsed: false,
    conversation_count: 0,
    conversations_sample: [],
  };

  if (!isHelloMindsReadApiConfigured()) {
    return { conversations: [], diagnostics: emptyDiagnostics };
  }

  const baseUrl = getHelloMindsBaseUrl();
  const accessKey = getHelloMindsAccessKey();
  if (!baseUrl || !accessKey) {
    return { conversations: [], diagnostics: emptyDiagnostics };
  }

  const url = `${baseUrl.replace(/\/$/, "")}/v1/messaging/conversations`;
  const result = await fetchHelloMindsJson({ url, accessKey });
  const conversations = result.jsonParsed ? parseHelloMindsConversationList(result.parsed) : [];

  return {
    conversations,
    diagnostics: {
      url,
      http_status: result.httpStatus,
      json_parsed: result.jsonParsed,
      conversation_count: conversations.length,
      conversations_sample: conversations.slice(0, 10).map((item) => truncateForDiagnostics(item)),
    },
  };
}

export async function getHelloMindsConversationWithDiagnostics(
  alias: string
): Promise<{
  conversation: HelloMindsConversationRecord | null;
  diagnostics: HelloMindsConversationGetDiagnostics;
}> {
  const baseUrl = getHelloMindsBaseUrl();
  const accessKey = getHelloMindsAccessKey();
  const url = `${(baseUrl ?? "").replace(/\/$/, "")}/v1/messaging/conversations/${encodeURIComponent(alias)}`;

  if (!baseUrl || !accessKey) {
    return {
      conversation: null,
      diagnostics: {
        key: alias,
        url,
        http_status: null,
        json_parsed: false,
        conversation: null,
      },
    };
  }

  const result = await fetchHelloMindsJson({ url, accessKey });
  const conversation =
    result.jsonParsed && result.parsed ? parseHelloMindsConversationRecord(result.parsed) : null;

  return {
    conversation,
    diagnostics: {
      key: alias,
      url,
      http_status: result.httpStatus,
      json_parsed: result.jsonParsed,
      conversation,
    },
  };
}

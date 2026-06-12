import {
  getExternalMindSendTimeoutMs,
  isExternalMindLiveSendEnabled,
  isExternalMindSendEnabled,
} from "@/lib/watch/external-mind-handoff-send-config";

export type HelloMindsSendConfig = {
  enabled: boolean;
  baseUrlConfigured: boolean;
  accessKeyConfigured: boolean;
  targetMindIdConfigured: boolean;
};

export type HelloMindsSendReadiness = {
  enabled: boolean;
  baseUrlConfigured: boolean;
  accessKeyConfigured: boolean;
  targetMindIdConfigured: boolean;
  liveSendEnabled: boolean;
  dryRunOnly: boolean;
  readyForExternalSend: boolean;
  readyForLiveExternalSend: boolean;
  timeoutMs: number;
  endpointHostConfigured: boolean;
  allowlistConfigured: boolean;
  endpointAllowed: boolean;
  httpsValidForLive: boolean;
};

const DEFAULT_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "lucient-em";

const HELLOMINDS_SENSITIVE_ENV_KEYS = ["EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY"] as const;

type ParsedHelloMindsBaseUrl = {
  valid: boolean;
  hostname: string | null;
  protocol: string | null;
  hasCredentials: boolean;
};

function parseHelloMindsBaseUrl(url: string | null): ParsedHelloMindsBaseUrl {
  if (!url) {
    return { valid: false, hostname: null, protocol: null, hasCredentials: false };
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.trim();

    return {
      valid: hostname.length > 0,
      hostname: hostname.length > 0 ? hostname : null,
      protocol: parsed.protocol,
      hasCredentials: Boolean(parsed.username || parsed.password),
    };
  } catch {
    return { valid: false, hostname: null, protocol: null, hasCredentials: false };
  }
}

function parsePositiveIntegerEnv(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseEndpointAllowlist(value: string | undefined): string[] {
  const trimmed = value?.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function getHelloMindsBaseUrl(): string | null {
  const value = process.env.EXTERNAL_MIND_HELLOMINDS_BASE_URL?.trim();
  return value ? value : null;
}

export function getHelloMindsBaseUrlHost(): string | null {
  return parseHelloMindsBaseUrl(getHelloMindsBaseUrl()).hostname;
}

export function getHelloMindsAccessKey(): string | null {
  const value = process.env.EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY?.trim();
  return value ? value : null;
}

export function getHelloMindsTargetMindId(): string | null {
  const value = process.env.EXTERNAL_MIND_HELLOMINDS_TARGET_MIND_ID?.trim();
  return value ? value : null;
}

export function getHelloMindsConversationAliasPrefix(): string {
  const value = process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX?.trim();
  return value && value.length > 0 ? value : DEFAULT_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;
}

export function getHelloMindsEndpointAllowlist(): string[] {
  return parseEndpointAllowlist(process.env.EXTERNAL_MIND_HELLOMINDS_ENDPOINT_ALLOWLIST);
}

export function getHelloMindsSendTimeoutMs(): number {
  const hellomindsValue = process.env.EXTERNAL_MIND_HELLOMINDS_SEND_TIMEOUT_MS?.trim();
  if (hellomindsValue) {
    return parsePositiveIntegerEnv(hellomindsValue, getExternalMindSendTimeoutMs());
  }

  return getExternalMindSendTimeoutMs();
}

export function getHelloMindsSendConfig(): HelloMindsSendConfig {
  return {
    enabled: isExternalMindSendEnabled(),
    baseUrlConfigured: Boolean(getHelloMindsBaseUrl()),
    accessKeyConfigured: Boolean(getHelloMindsAccessKey()),
    targetMindIdConfigured: Boolean(getHelloMindsTargetMindId()),
  };
}

export function isHelloMindsSendFullyConfigured(): boolean {
  const config = getHelloMindsSendConfig();
  return (
    config.enabled &&
    config.baseUrlConfigured &&
    config.accessKeyConfigured &&
    config.targetMindIdConfigured
  );
}

function buildHelloMindsEndpointReadinessFields(): Pick<
  HelloMindsSendReadiness,
  "endpointHostConfigured" | "allowlistConfigured" | "endpointAllowed" | "httpsValidForLive"
> {
  const parsed = parseHelloMindsBaseUrl(getHelloMindsBaseUrl());
  const allowlist = getHelloMindsEndpointAllowlist();
  const allowlistConfigured = allowlist.length > 0;
  const liveSendEnabled = isExternalMindLiveSendEnabled();

  const endpointHostConfigured = parsed.valid && Boolean(parsed.hostname);
  const httpsValidForLive =
    liveSendEnabled && parsed.valid && parsed.protocol === "https:";

  let endpointAllowed = false;
  if (parsed.valid && parsed.hostname) {
    if (!allowlistConfigured) {
      endpointAllowed = true;
    } else {
      endpointAllowed = allowlist.includes(parsed.hostname.toLowerCase());
    }
  }

  return {
    endpointHostConfigured,
    allowlistConfigured,
    endpointAllowed,
    httpsValidForLive,
  };
}

/** Returns HelloMinds send prerequisites without exposing secret values. */
export function describeHelloMindsSendReadiness(): HelloMindsSendReadiness {
  const config = getHelloMindsSendConfig();
  const liveSendEnabled = isExternalMindLiveSendEnabled();
  const endpointFields = buildHelloMindsEndpointReadinessFields();

  const readyForExternalSend = isHelloMindsSendFullyConfigured();
  const dryRunOnly = readyForExternalSend && !liveSendEnabled;
  const readyForLiveExternalSend =
    readyForExternalSend &&
    liveSendEnabled &&
    endpointFields.endpointHostConfigured &&
    endpointFields.endpointAllowed &&
    endpointFields.httpsValidForLive;

  return {
    ...config,
    liveSendEnabled,
    dryRunOnly,
    readyForExternalSend,
    readyForLiveExternalSend,
    timeoutMs: getHelloMindsSendTimeoutMs(),
    ...endpointFields,
  };
}

export function containsHelloMindsSensitiveEnvValue(value: string): boolean {
  const normalized = value.toLowerCase();

  for (const key of HELLOMINDS_SENSITIVE_ENV_KEYS) {
    const envValue = process.env[key]?.trim();
    if (envValue && envValue.length > 0 && normalized.includes(envValue.toLowerCase())) {
      return true;
    }
  }

  const baseUrl = getHelloMindsBaseUrl();
  if (baseUrl) {
    const parsed = parseHelloMindsBaseUrl(baseUrl);
    if (parsed.hasCredentials && normalized.includes(baseUrl.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function isHelloMindsEndpointHttps(): boolean {
  const parsed = parseHelloMindsBaseUrl(getHelloMindsBaseUrl());
  return parsed.valid && parsed.protocol === "https:";
}

/** Dry-run-ready HelloMinds config required before creating hellominds handoffs. */
export function isHelloMindsHandoffCreationReady(): boolean {
  const readiness = describeHelloMindsSendReadiness();

  return (
    readiness.readyForExternalSend &&
    readiness.endpointHostConfigured &&
    readiness.endpointAllowed &&
    isHelloMindsEndpointHttps()
  );
}

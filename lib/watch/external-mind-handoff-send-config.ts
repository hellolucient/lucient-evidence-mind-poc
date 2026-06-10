export type ExternalMindSendConfig = {
  enabled: boolean;
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
};

export type ExternalMindSendReadiness = {
  enabled: boolean;
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
  liveSendEnabled: boolean;
  dryRunOnly: boolean;
  /** Enabled with endpoint and API key configured (dry-run or live). */
  readyForExternalSend: boolean;
  /** All live-send prerequisites met, including HTTPS and allowlist validation. */
  readyForLiveExternalSend: boolean;
  timeoutMs: number;
  endpointHostConfigured: boolean;
  allowlistConfigured: boolean;
  endpointAllowed: boolean;
  httpsValidForLive: boolean;
};

const DEFAULT_EXTERNAL_MIND_SEND_TIMEOUT_MS = 15_000;

const SENSITIVE_ENV_KEYS = [
  "EXTERNAL_MIND_API_KEY",
  "CRON_SECRET",
  "INTERNAL_REVIEW_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EIE_TOOL_API_KEY",
] as const;

type ParsedExternalMindEndpointUrl = {
  valid: boolean;
  hostname: string | null;
  protocol: string | null;
  hasCredentials: boolean;
};

function parseExternalMindEndpointUrl(url: string | null): ParsedExternalMindEndpointUrl {
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

export function isExternalMindSendEnabled(): boolean {
  return process.env.ENABLE_EXTERNAL_MIND_SEND?.trim().toLowerCase() === "true";
}

export function isExternalMindLiveSendEnabled(): boolean {
  return process.env.EXTERNAL_MIND_LIVE_SEND?.trim().toLowerCase() === "true";
}

export function getExternalMindEndpointUrl(): string | null {
  const value = process.env.EXTERNAL_MIND_ENDPOINT_URL?.trim();
  return value ? value : null;
}

export function getExternalMindEndpointHost(): string | null {
  return parseExternalMindEndpointUrl(getExternalMindEndpointUrl()).hostname;
}

export function getExternalMindApiKey(): string | null {
  const value = process.env.EXTERNAL_MIND_API_KEY?.trim();
  return value ? value : null;
}

export function getExternalMindSendTimeoutMs(): number {
  return parsePositiveIntegerEnv(
    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS,
    DEFAULT_EXTERNAL_MIND_SEND_TIMEOUT_MS
  );
}

export function getExternalMindEndpointAllowlist(): string[] {
  return parseEndpointAllowlist(process.env.EXTERNAL_MIND_ENDPOINT_ALLOWLIST);
}

export function getExternalMindSendConfig(): ExternalMindSendConfig {
  return {
    enabled: isExternalMindSendEnabled(),
    endpointConfigured: Boolean(getExternalMindEndpointUrl()),
    apiKeyConfigured: Boolean(getExternalMindApiKey()),
  };
}

export function isExternalMindSendFullyConfigured(): boolean {
  const config = getExternalMindSendConfig();
  return config.enabled && config.endpointConfigured && config.apiKeyConfigured;
}

function buildEndpointReadinessFields(): Pick<
  ExternalMindSendReadiness,
  | "endpointHostConfigured"
  | "allowlistConfigured"
  | "endpointAllowed"
  | "httpsValidForLive"
> {
  const parsed = parseExternalMindEndpointUrl(getExternalMindEndpointUrl());
  const allowlist = getExternalMindEndpointAllowlist();
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

/** Returns whether external send prerequisites are met without exposing secret values. */
export function describeExternalMindSendReadiness(): ExternalMindSendReadiness {
  const config = getExternalMindSendConfig();
  const liveSendEnabled = isExternalMindLiveSendEnabled();
  const endpointFields = buildEndpointReadinessFields();

  const readyForExternalSend = isExternalMindSendFullyConfigured();
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
    timeoutMs: getExternalMindSendTimeoutMs(),
    ...endpointFields,
  };
}

export function containsSensitiveEnvValue(value: string): boolean {
  const normalized = value.toLowerCase();

  for (const key of SENSITIVE_ENV_KEYS) {
    const envValue = process.env[key]?.trim();
    if (envValue && envValue.length > 0 && normalized.includes(envValue.toLowerCase())) {
      return true;
    }
  }

  const endpointUrl = getExternalMindEndpointUrl();
  if (endpointUrl) {
    const parsed = parseExternalMindEndpointUrl(endpointUrl);
    if (parsed.hasCredentials && normalized.includes(endpointUrl.toLowerCase())) {
      return true;
    }
  }

  return false;
}

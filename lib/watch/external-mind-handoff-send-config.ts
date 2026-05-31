export type ExternalMindSendConfig = {
  enabled: boolean;
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
};

const SENSITIVE_ENV_KEYS = [
  "EXTERNAL_MIND_API_KEY",
  "CRON_SECRET",
  "INTERNAL_REVIEW_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EIE_TOOL_API_KEY",
] as const;

export function isExternalMindSendEnabled(): boolean {
  return process.env.ENABLE_EXTERNAL_MIND_SEND?.trim().toLowerCase() === "true";
}

export function getExternalMindEndpointUrl(): string | null {
  const value = process.env.EXTERNAL_MIND_ENDPOINT_URL?.trim();
  return value ? value : null;
}

export function getExternalMindApiKey(): string | null {
  const value = process.env.EXTERNAL_MIND_API_KEY?.trim();
  return value ? value : null;
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

/** Returns whether external send prerequisites are met without exposing secret values. */
export function describeExternalMindSendReadiness(): {
  enabled: boolean;
  endpointConfigured: boolean;
  apiKeyConfigured: boolean;
  readyForExternalSend: boolean;
} {
  const config = getExternalMindSendConfig();
  return {
    ...config,
    readyForExternalSend: isExternalMindSendFullyConfigured(),
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

  return false;
}

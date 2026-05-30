import { CURRENT_WATCH_PHASE } from "./watch/watch-phase";

export type CronAuthTrigger = "vercel_cron" | "manual_authorized";

export type CronAuthSuccess = {
  authorized: true;
  trigger: CronAuthTrigger;
};

export type CronAuthFailure = {
  authorized: false;
  cron_secret_configured: boolean;
  reason: string;
};

export type CronAuthResult = CronAuthSuccess | CronAuthFailure;

export const VERCEL_CRON_USER_AGENT = "vercel-cron/1.0";

export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

function getConfiguredCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

export function isVercelCronUserAgent(userAgent: string | null): boolean {
  if (!userAgent) {
    return false;
  }

  return (
    userAgent === VERCEL_CRON_USER_AGENT ||
    userAgent.includes(VERCEL_CRON_USER_AGENT)
  );
}

export function authorizeCronRequest(headers: {
  authorization: string | null;
  userAgent: string | null;
}): CronAuthResult {
  if (isVercelCronUserAgent(headers.userAgent)) {
    return { authorized: true, trigger: "vercel_cron" };
  }

  const configuredSecret = getConfiguredCronSecret();

  if (headers.authorization) {
    const match = headers.authorization.match(/^Bearer\s+(.+)$/i);
    const providedSecret = match?.[1]?.trim();

    if (!configuredSecret) {
      return {
        authorized: false,
        cron_secret_configured: false,
        reason: "CRON_SECRET is not configured for manual cron authorization.",
      };
    }

    if (providedSecret && providedSecret === configuredSecret) {
      return { authorized: true, trigger: "manual_authorized" };
    }
  }

  return {
    authorized: false,
    cron_secret_configured: isCronSecretConfigured(),
    reason: "Unauthorized cron request.",
  };
}

export function buildCronUnauthorizedResponse(
  auth: CronAuthFailure
): Record<string, unknown> {
  return {
    ok: false,
    error: "unauthorized",
    phase: CURRENT_WATCH_PHASE,
    route: "/api/watch/cron",
    cron_secret_configured: auth.cron_secret_configured,
    message: auth.reason,
  };
}

export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function resolveSiteOrigin(options: {
  configuredSiteUrl?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  forwardedProto?: string | null;
}): string {
  const configured = options.configuredSiteUrl?.trim();
  if (configured) {
    return normalizeSiteUrl(configured);
  }

  const host = options.forwardedHost ?? options.host;
  const protocol = options.forwardedProto ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

export const DEFAULT_POST_LOGIN_PATH = "/" as const;

export function buildReviewLoginCallbackUrl(siteOrigin: string): string {
  return `${normalizeSiteUrl(siteOrigin)}/auth/callback?next=${DEFAULT_POST_LOGIN_PATH}`;
}

export function resolveSiteOriginFromRequest(request: Request): string {
  return resolveSiteOrigin({
    configuredSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    host: request.headers.get("host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });
}

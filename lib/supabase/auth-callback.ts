import { DEFAULT_POST_LOGIN_PATH, normalizeSiteUrl } from "@/lib/supabase/auth-redirect";

export type AuthCallbackParams = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  next: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

export function parseAuthCallbackParams(url: URL): AuthCallbackParams {
  return {
    code: url.searchParams.get("code"),
    tokenHash: url.searchParams.get("token_hash"),
    type: url.searchParams.get("type"),
    next: url.searchParams.get("next"),
    error: url.searchParams.get("error"),
    errorCode: url.searchParams.get("error_code"),
    errorDescription: url.searchParams.get("error_description"),
  };
}

export function hasSupabaseCallbackError(params: AuthCallbackParams): boolean {
  return Boolean(params.error || params.errorCode || params.errorDescription);
}

export function sanitizeAuthNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return next;
}

export function hasAuthCallbackCredentials(params: AuthCallbackParams): boolean {
  if (params.code) {
    return true;
  }

  return Boolean(params.tokenHash && params.type);
}

export function resolveAuthRedirectOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return normalizeSiteUrl(configured);
  }

  return new URL(request.url).origin;
}

export function buildAuthCallbackFailureRedirect(origin: string): string {
  return `${origin}/review-login?error=auth_callback_failed`;
}

export function buildAuthCallbackSuccessRedirect(origin: string, nextPath: string): string {
  return `${origin}${nextPath}`;
}

export const AUTH_CALLBACK_FAILED_ERROR = "auth_callback_failed" as const;

export function reviewLoginErrorMessage(error: string | null | undefined): string | null {
  if (error === AUTH_CALLBACK_FAILED_ERROR) {
    return "Unable to complete sign-in. Request a new magic link and try again.";
  }

  return null;
}

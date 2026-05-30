import { afterEach, describe, expect, it } from "vitest";
import {
  VERCEL_CRON_USER_AGENT,
  authorizeCronRequest,
  buildCronUnauthorizedResponse,
  isCronSecretConfigured,
  isVercelCronUserAgent,
} from "./cron-auth";
import { CURRENT_WATCH_PHASE } from "./watch/watch-phase";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL_CRON_SECRET === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  }
});

describe("cron-auth", () => {
  it("allows Vercel Cron user-agent exactly", () => {
    const auth = authorizeCronRequest({
      authorization: null,
      userAgent: VERCEL_CRON_USER_AGENT,
    });

    expect(auth).toEqual({ authorized: true, trigger: "vercel_cron" });
  });

  it("allows user-agent that includes vercel-cron/1.0", () => {
    expect(
      isVercelCronUserAgent(`${VERCEL_CRON_USER_AGENT} extra`)
    ).toBe(true);
  });

  it("returns 401 diagnostic when manual call lacks authorization", () => {
    process.env.CRON_SECRET = "test-secret";

    const auth = authorizeCronRequest({
      authorization: null,
      userAgent: "curl/8.0",
    });

    expect(auth.authorized).toBe(false);
    if (auth.authorized) {
      return;
    }

    expect(auth.cron_secret_configured).toBe(true);
    expect(buildCronUnauthorizedResponse(auth)).toMatchObject({
      ok: false,
      error: "unauthorized",
      phase: CURRENT_WATCH_PHASE,
      route: "/api/watch/cron",
      cron_secret_configured: true,
    });
  });

  it("returns cron_secret_configured false when secret missing for manual bearer", () => {
    delete process.env.CRON_SECRET;

    const auth = authorizeCronRequest({
      authorization: "Bearer anything",
      userAgent: "curl/8.0",
    });

    expect(auth).toEqual({
      authorized: false,
      cron_secret_configured: false,
      reason: "CRON_SECRET is not configured for manual cron authorization.",
    });
  });

  it("allows authorized manual bearer when CRON_SECRET is set", () => {
    process.env.CRON_SECRET = "test-secret";

    const auth = authorizeCronRequest({
      authorization: "Bearer test-secret",
      userAgent: "curl/8.0",
    });

    expect(auth).toEqual({ authorized: true, trigger: "manual_authorized" });
  });

  it("rejects invalid bearer when CRON_SECRET is set", () => {
    process.env.CRON_SECRET = "test-secret";

    const auth = authorizeCronRequest({
      authorization: "Bearer wrong-secret",
      userAgent: "curl/8.0",
    });

    expect(auth.authorized).toBe(false);
    if (auth.authorized) {
      return;
    }

    expect(auth.cron_secret_configured).toBe(true);
  });

  it("reports cron secret configuration state", () => {
    delete process.env.CRON_SECRET;
    expect(isCronSecretConfigured()).toBe(false);

    process.env.CRON_SECRET = "  configured  ";
    expect(isCronSecretConfigured()).toBe(true);
  });
});

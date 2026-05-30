import { describe, expect, it } from "vitest";

import {
  buildReviewLoginCallbackUrl,
  resolveSiteOrigin,
} from "@/lib/supabase/auth-redirect";

describe("resolveSiteOrigin", () => {
  it("prefers NEXT_PUBLIC_SITE_URL when set", () => {
    expect(
      resolveSiteOrigin({
        configuredSiteUrl: "https://lucient-evidence-mind-poc.vercel.app",
        forwardedHost: "localhost:3000",
        forwardedProto: "http",
      })
    ).toBe("https://lucient-evidence-mind-poc.vercel.app");
  });

  it("strips trailing slashes from configured site URL", () => {
    expect(
      resolveSiteOrigin({
        configuredSiteUrl: "https://lucient-evidence-mind-poc.vercel.app/",
      })
    ).toBe("https://lucient-evidence-mind-poc.vercel.app");
  });

  it("falls back to forwarded host when configured site URL is unset", () => {
    expect(
      resolveSiteOrigin({
        forwardedHost: "lucient-evidence-mind-poc.vercel.app",
        forwardedProto: "https",
      })
    ).toBe("https://lucient-evidence-mind-poc.vercel.app");
  });

  it("falls back to localhost for local development", () => {
    expect(resolveSiteOrigin({})).toBe("http://localhost:3000");
  });
});

describe("buildReviewLoginCallbackUrl", () => {
  it("builds auth callback redirect for production", () => {
    expect(
      buildReviewLoginCallbackUrl("https://lucient-evidence-mind-poc.vercel.app")
    ).toBe(
      "https://lucient-evidence-mind-poc.vercel.app/auth/callback?next=/review-items"
    );
  });
});

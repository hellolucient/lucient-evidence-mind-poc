import { describe, expect, it } from "vitest";

import { buildCronUnauthorizedResponse } from "../cron-auth";
import { CURRENT_WATCH_PHASE } from "./watch-phase";

describe("watch-phase", () => {
  it("defines the current watchtower phase", () => {
    expect(CURRENT_WATCH_PHASE).toBe("33");
  });

  it("is used by cron unauthorized diagnostics", () => {
    expect(
      buildCronUnauthorizedResponse({
        cron_secret_configured: true,
        reason: "Unauthorized cron request.",
      })
    ).toMatchObject({
      phase: CURRENT_WATCH_PHASE,
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  getHelloMindsEmailChannelProbeIds,
  isHelloMindsMessagingHistoryAlias,
} from "@/lib/watch/external-mind-hellominds-conversations";
import { resolveMindClaimHelloMindsHistoryKeys } from "@/lib/watch/mind-claim-hellominds-fetch";

describe("external-mind-hellominds-conversations", () => {
  it("treats lucient deterministic aliases as retrievable history keys", () => {
    expect(
      isHelloMindsMessagingHistoryAlias(
        "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202"
      )
    ).toBe(true);
    expect(isHelloMindsMessagingHistoryAlias("lucient-em-mce-job-1")).toBe(true);
    expect(isHelloMindsMessagingHistoryAlias("lucient-em-ho-handoff-1")).toBe(true);
  });

  it("rejects mind thread suffixes and email channel ids as history keys", () => {
    expect(isHelloMindsMessagingHistoryAlias("df11")).toBe(false);
    expect(isHelloMindsMessagingHistoryAlias("29C3573E")).toBe(false);
  });
});

describe("resolveMindClaimHelloMindsHistoryKeys", () => {
  it("uses deterministic alias and skips non-alias stored external_thread_id", () => {
    const resolved = resolveMindClaimHelloMindsHistoryKeys({
      jobKind: "risk_brief",
      jobId: "3abf5261-92c4-429f-9d66-f8975cbf9202",
      storedExternalThreadId: "df11",
    });

    expect(resolved.keys).toEqual([
      "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202",
    ]);
    expect(resolved.notes.join(" ")).toContain('Skipped stored external_thread_id "df11"');
  });

  it("includes stored alias when it is retrievable", () => {
    const alias = "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202";
    const resolved = resolveMindClaimHelloMindsHistoryKeys({
      jobKind: "risk_brief",
      jobId: "3abf5261-92c4-429f-9d66-f8975cbf9202",
      storedExternalThreadId: alias,
    });

    expect(resolved.keys).toEqual([alias]);
  });
});

describe("getHelloMindsEmailChannelProbeIds", () => {
  it("parses configured probe channel ids", () => {
    const original = process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID;
    process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID = "29C3573E,other";
    expect(getHelloMindsEmailChannelProbeIds()).toEqual(["29C3573E", "other"]);
    process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID = original;
  });
});

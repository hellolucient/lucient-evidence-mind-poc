import { describe, expect, it } from "vitest";

import {
  canonicalDigestPeriodInstant,
  digestPeriodBoundsEqual,
  digestPeriodInstantEqual,
} from "@/lib/review/evidence-mind-digest-period";

describe("evidence-mind-digest-period", () => {
  it("treats Z and +00:00 timestamps as equal", () => {
    expect(digestPeriodInstantEqual("2026-05-25T00:00:00.000Z", "2026-05-25T00:00:00+00:00")).toBe(
      true
    );
    expect(
      digestPeriodBoundsEqual(
        "2026-05-25T00:00:00.000Z",
        "2026-05-31T23:59:59.999Z",
        "2026-05-25T00:00:00+00:00",
        "2026-05-31T23:59:59.999+00:00"
      )
    ).toBe(true);
  });

  it("canonicalizes period instants to ISO Z format", () => {
    expect(canonicalDigestPeriodInstant("2026-05-25T00:00:00+00:00")).toBe(
      "2026-05-25T00:00:00.000Z"
    );
  });
});

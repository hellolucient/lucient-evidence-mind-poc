import { describe, expect, it } from "vitest";

import { buildStatementTitle, STATEMENT_ASSESS_SOURCE_TYPE } from "@/lib/review/statement-assess";

describe("buildStatementTitle", () => {
  it("uses the first line of the statement", () => {
    expect(buildStatementTitle("Magnesium Calm Ritual:\nSupports deep sleep.")).toBe(
      "Magnesium Calm Ritual:"
    );
  });

  it("falls back when the statement is empty", () => {
    expect(buildStatementTitle("   ")).toBe("Wellness statement");
  });

  it("truncates long titles", () => {
    const title = buildStatementTitle("A".repeat(120));
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBe(80);
  });

  it("uses other as the hidden source type for free-form statements", () => {
    expect(STATEMENT_ASSESS_SOURCE_TYPE).toBe("other");
  });
});

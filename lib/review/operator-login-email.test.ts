import { describe, expect, it } from "vitest";

import { normalizeOperatorLoginEmail } from "@/lib/review/operator-login-email";

describe("normalizeOperatorLoginEmail", () => {
  it("trims whitespace and lowercases email", () => {
    expect(normalizeOperatorLoginEmail("  Operator@Example.COM  ")).toBe(
      "operator@example.com"
    );
  });

  it("rejects invalid email values", () => {
    expect(normalizeOperatorLoginEmail("")).toBeNull();
    expect(normalizeOperatorLoginEmail("not-an-email")).toBeNull();
  });
});

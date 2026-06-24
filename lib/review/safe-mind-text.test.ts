import { describe, expect, it } from "vitest";

import { renderSafeMindTextBlock } from "@/lib/review/safe-mind-text";

describe("safe-mind-text", () => {
  it("decodes harmless HTML entities for display (apostrophes)", () => {
    expect(renderSafeMindTextBlock("reduce stress hormones")).toBe("reduce stress hormones");
    expect(renderSafeMindTextBlock("don&#39;t worry")).toBe("don't worry");
    expect(renderSafeMindTextBlock("don&apos;t worry")).toBe("don't worry");
    // Quotes remain escaped for safe rendering in any context.
    expect(renderSafeMindTextBlock("quoted: &quot;ok&quot;")).toBe("quoted: &quot;ok&quot;");
  });

  it("does not render HTML as HTML; dangerous markup stays escaped", () => {
    const output = renderSafeMindTextBlock("<script>alert(1)</script>");
    // Markup is stripped; only plain text remains.
    expect(output).toBe("alert(1)");
    expect(output).not.toContain("<");
    expect(output).not.toContain(">");
  });
});


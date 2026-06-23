import { describe, expect, it } from "vitest";

import {
  buildHelloMindsMindReplyDisplayFromStored,
  buildHelloMindsMindReplyExcerpts,
  convertHelloMindsMessageTextToPlainText,
  splitHelloMindsMindReplyPlainText,
} from "@/lib/watch/external-mind-hellominds-message-format";

const sampleMindReplyWithCostReport = `<p>Operational analysis of the digest.</p>
<p>💡 LUCIENT TASK COST REPORT 📊</p>
<p>📊 This Task:</p>
<p>• Category: Monitoring/Digest Processing</p>
<p>• Total Credits: 42</p>`;

describe("external-mind-hellominds-message-format", () => {
  it("converts HTML to readable plain text", () => {
    expect(convertHelloMindsMessageTextToPlainText("<p>Line one</p><br/><p>Line two</p>")).toBe(
      "Line one\n\nLine two"
    );
  });

  it("splits main reply from Lucient task cost report", () => {
    const plain = convertHelloMindsMessageTextToPlainText(sampleMindReplyWithCostReport);
    const split = splitHelloMindsMindReplyPlainText(plain);

    expect(split.main_reply_plain).toBe("Operational analysis of the digest.");
    expect(split.cost_report_plain).toContain("LUCIENT TASK COST REPORT");
    expect(split.cost_report_plain).toContain("Total Credits: 42");
    expect(split.main_reply_plain).not.toContain("Total Credits");
  });

  it("stores main reply and cost report excerpts separately during processing", () => {
    const excerpts = buildHelloMindsMindReplyExcerpts({
      messageText: sampleMindReplyWithCostReport,
    });

    expect(excerpts.response_excerpt).toBe("Operational analysis of the digest.");
    expect(excerpts.cost_report_present).toBe(true);
    expect(excerpts.cost_report_excerpt).toContain("LUCIENT TASK COST REPORT");
    expect(excerpts.cost_report_excerpt).toContain("Total Credits: 42");
    expect(excerpts.response_excerpt).not.toContain("Total Credits");
  });

  it("truncates only the cost report excerpt when it is too long", () => {
    const longCostLine = "• Total Credits: " + "9".repeat(900);
    const messageText = `Main reply only here.\n\n💡 LUCIENT TASK COST REPORT 📊\n${longCostLine}`;
    const excerpts = buildHelloMindsMindReplyExcerpts({
      messageText,
      costReportMaxLength: 120,
    });

    expect(excerpts.response_excerpt).toBe("Main reply only here.");
    expect(excerpts.cost_report_present).toBe(true);
    expect(excerpts.cost_report_truncated).toBe(true);
    expect(excerpts.cost_report_excerpt?.endsWith("…")).toBe(true);
    expect(excerpts.response_excerpt).not.toContain("Total Credits");
  });

  it("keeps replies without a cost report intact", () => {
    const excerpts = buildHelloMindsMindReplyExcerpts({
      messageText: "<p>Plain Mind reply without billing details.</p>",
    });

    expect(excerpts.response_excerpt).toBe("Plain Mind reply without billing details.");
    expect(excerpts.cost_report_present).toBe(false);
    expect(excerpts.cost_report_excerpt).toBeNull();
  });

  it("splits legacy combined stored excerpts at display time when metadata is missing", () => {
    const combined =
      "Operational analysis of the digest.\n\n💡 LUCIENT TASK COST REPORT 📊\n• Total Credits: 42";
    const display = buildHelloMindsMindReplyDisplayFromStored({
      response_excerpt: combined,
    });

    expect(display.main_reply).toBe("Operational analysis of the digest.");
    expect(display.cost_report_present).toBe(true);
    expect(display.cost_report).toContain("Total Credits: 42");
    expect(display.main_reply).not.toContain("Total Credits");
  });
});

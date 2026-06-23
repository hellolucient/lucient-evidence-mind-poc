export const HELLOMINDS_MIND_REPLY_MAIN_EXCERPT_MAX_LENGTH = 500;
export const HELLOMINDS_COST_REPORT_EXCERPT_MAX_LENGTH = 800;

export const LUCIENT_TASK_COST_REPORT_MARKER = /💡\s*LUCIENT TASK COST REPORT|LUCIENT TASK COST REPORT/i;

export type HelloMindsMindReplyExcerpts = {
  response_excerpt: string | null;
  cost_report_present: boolean;
  cost_report_excerpt: string | null;
  cost_report_truncated: boolean;
};

export function convertHelloMindsMessageTextToPlainText(text: string): string {
  let plain = text.replace(/<br\s*\/?>/gi, "\n");
  plain = plain.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  plain = plain.replace(/<[^>]+>/g, "");
  plain = plain
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return plain
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
}

function truncatePlainTextExcerpt(
  text: string,
  maxLength: number
): { text: string; truncated: boolean } {
  if (text.length <= maxLength) {
    return { text, truncated: false };
  }

  return {
    text: `${text.slice(0, maxLength - 1)}…`,
    truncated: true,
  };
}

export function splitHelloMindsMindReplyPlainText(plainText: string): {
  main_reply_plain: string;
  cost_report_plain: string | null;
} {
  const match = plainText.match(LUCIENT_TASK_COST_REPORT_MARKER);
  if (!match || typeof match.index !== "number") {
    return {
      main_reply_plain: plainText.trim(),
      cost_report_plain: null,
    };
  }

  const mainReply = plainText.slice(0, match.index).trim();
  const costReport = plainText.slice(match.index).trim();

  return {
    main_reply_plain: mainReply,
    cost_report_plain: costReport.length > 0 ? costReport : null,
  };
}

export function buildHelloMindsMindReplyExcerpts(input: {
  messageText: string | undefined;
  mainMaxLength?: number;
  costReportMaxLength?: number;
}): HelloMindsMindReplyExcerpts {
  if (!input.messageText?.trim()) {
    return {
      response_excerpt: null,
      cost_report_present: false,
      cost_report_excerpt: null,
      cost_report_truncated: false,
    };
  }

  const plainText = convertHelloMindsMessageTextToPlainText(input.messageText);
  if (!plainText) {
    return {
      response_excerpt: null,
      cost_report_present: false,
      cost_report_excerpt: null,
      cost_report_truncated: false,
    };
  }

  const { main_reply_plain, cost_report_plain } = splitHelloMindsMindReplyPlainText(plainText);
  const mainMaxLength = input.mainMaxLength ?? HELLOMINDS_MIND_REPLY_MAIN_EXCERPT_MAX_LENGTH;
  const costReportMaxLength =
    input.costReportMaxLength ?? HELLOMINDS_COST_REPORT_EXCERPT_MAX_LENGTH;

  const mainExcerpt = main_reply_plain
    ? truncatePlainTextExcerpt(main_reply_plain, mainMaxLength)
    : { text: "", truncated: false };

  if (!cost_report_plain) {
    const fallbackMain = main_reply_plain || plainText;
    const fallbackExcerpt = truncatePlainTextExcerpt(fallbackMain, mainMaxLength);

    return {
      response_excerpt: fallbackExcerpt.text || null,
      cost_report_present: false,
      cost_report_excerpt: null,
      cost_report_truncated: false,
    };
  }

  const costReportExcerpt = truncatePlainTextExcerpt(cost_report_plain, costReportMaxLength);

  return {
    response_excerpt: mainExcerpt.text || null,
    cost_report_present: true,
    cost_report_excerpt: costReportExcerpt.text || null,
    cost_report_truncated: costReportExcerpt.truncated,
  };
}

export function buildHelloMindsMindReplyDisplayFromStored(input: {
  response_excerpt: string | null | undefined;
  metadata?: Record<string, unknown> | null;
}): {
  main_reply: string | null;
  cost_report: string | null;
  cost_report_present: boolean;
  cost_report_truncated: boolean;
} {
  const metadata = input.metadata ?? null;
  const storedCostReport =
    typeof metadata?.cost_report_excerpt === "string" ? metadata.cost_report_excerpt : null;
  const storedCostReportPresent = metadata?.cost_report_present === true;
  const storedCostReportTruncated = metadata?.cost_report_truncated === true;

  if (storedCostReportPresent && storedCostReport) {
    return {
      main_reply: input.response_excerpt?.trim() || null,
      cost_report: storedCostReport,
      cost_report_present: true,
      cost_report_truncated: storedCostReportTruncated,
    };
  }

  const combined = input.response_excerpt?.trim();
  if (!combined) {
    return {
      main_reply: null,
      cost_report: null,
      cost_report_present: false,
      cost_report_truncated: false,
    };
  }

  const split = splitHelloMindsMindReplyPlainText(combined);
  if (!split.cost_report_plain) {
    return {
      main_reply: combined,
      cost_report: null,
      cost_report_present: false,
      cost_report_truncated: false,
    };
  }

  const costReportExcerpt = truncatePlainTextExcerpt(
    split.cost_report_plain,
    HELLOMINDS_COST_REPORT_EXCERPT_MAX_LENGTH
  );

  return {
    main_reply: split.main_reply_plain || null,
    cost_report: costReportExcerpt.text || null,
    cost_report_present: true,
    cost_report_truncated: costReportExcerpt.truncated,
  };
}

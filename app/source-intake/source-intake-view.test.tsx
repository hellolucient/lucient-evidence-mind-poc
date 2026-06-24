import { describe, expect, it } from "vitest";

import { extractionFetchEligibility } from "@/app/source-intake/source-intake-view";

describe("source-intake fetch eligibility", () => {
  it("enables fetch only for sent/waiting_for_reply with live external ids", () => {
    expect(
      extractionFetchEligibility({
        extraction_job_id: "job-1",
        status: "sent",
        review_status: "approved",
        mind_response_text: null,
        parse_error: null,
        external_thread_id: "t",
        external_message_id: "m",
      }).eligible
    ).toBe(true);

    expect(
      extractionFetchEligibility({
        extraction_job_id: "job-1",
        status: "waiting_for_reply",
        review_status: "approved",
        mind_response_text: null,
        parse_error: null,
        external_thread_id: "t",
        external_message_id: null,
      }).eligible
    ).toBe(true);
  });

  it("disables fetch for dry-run/non-live jobs without external ids", () => {
    const result = extractionFetchEligibility({
      extraction_job_id: "job-1",
      status: "sent",
      review_status: "approved",
      mind_response_text: null,
      parse_error: null,
      external_thread_id: null,
      external_message_id: null,
    });
    expect(result.eligible).toBe(false);
    expect(result.helper).toBe("No live Mind identifiers are attached to this job.");
  });

  it("disables fetch for parsed/response_fetched/parse_failed states", () => {
    expect(
      extractionFetchEligibility({
        extraction_job_id: "job-1",
        status: "parsed",
        review_status: "approved",
        mind_response_text: "{}",
        parse_error: null,
        external_thread_id: "t",
        external_message_id: "m",
      }).helper
    ).toBe("This response has already been parsed.");
  });
});


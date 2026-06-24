import { describe, expect, it } from "vitest";

import { mindJobControlsState } from "@/lib/review/mind-job-controls";

const baseJob = {
  status: "sent",
  mind_response_text: null,
  parsed_at: null,
  external_thread_id: "thread-1",
  external_message_id: "message-1",
};

describe("mindJobControlsState", () => {
  it("enables fetch only for sent/waiting_for_reply with live ids and empty response", () => {
    expect(mindJobControlsState({ ...baseJob, status: "sent" }).can_fetch).toBe(true);
    expect(
      mindJobControlsState({
        ...baseJob,
        status: "waiting_for_reply",
        external_message_id: null,
      }).can_fetch
    ).toBe(true);
    expect(
      mindJobControlsState({
        ...baseJob,
        status: "sent",
        mind_response_text: '{"claims":[]}',
      }).can_fetch
    ).toBe(false);
  });

  it("disables fetch and parse for parsed extraction jobs", () => {
    const parsed = mindJobControlsState({
      ...baseJob,
      status: "parsed",
      mind_response_text: '{"claims":[]}',
      parsed_at: "2026-06-24T00:00:00.000Z",
    });

    expect(parsed.can_fetch).toBe(false);
    expect(parsed.fetch_helper).toBe("This response has already been parsed.");
    expect(parsed.can_parse).toBe(false);
    expect(parsed.parse_label).toBe("Already parsed");
    expect(parsed.parse_helper).toBe("This response has already been parsed.");
    expect(parsed.raw_response_default_open).toBe(false);
  });

  it("disables parse for parsed jobs and keeps candidate output helpers available", () => {
    const parsed = mindJobControlsState({
      status: "parsed",
      mind_response_text: '{"claims":[{"claim_text":"x"}]}',
      parsed_at: "2026-06-24T00:00:00.000Z",
      external_thread_id: "t",
      external_message_id: "m",
    });

    expect(parsed.can_parse).toBe(false);
    expect(parsed.raw_response_default_open).toBe(false);
  });

  it("enables parse only for response_fetched or parse_failed with response text", () => {
    expect(
      mindJobControlsState({
        status: "response_fetched",
        mind_response_text: '{"claims":[]}',
        parsed_at: null,
        external_thread_id: null,
        external_message_id: null,
      }).can_parse
    ).toBe(true);

    expect(
      mindJobControlsState({
        status: "parse_failed",
        mind_response_text: '{"claims":[]}',
        parsed_at: "2026-06-24T00:00:00.000Z",
        external_thread_id: null,
        external_message_id: null,
      }).can_parse
    ).toBe(true);

    expect(
      mindJobControlsState({
        status: "response_fetched",
        mind_response_text: null,
        parsed_at: null,
        external_thread_id: null,
        external_message_id: null,
      }).can_parse
    ).toBe(false);
  });

  it("blocks fixture load on live jobs with external ids", () => {
    const controls = mindJobControlsState({
      ...baseJob,
      status: "response_fetched",
      mind_response_text: '{"claims":[]}',
    });

    expect(controls.can_load_fixture).toBe(false);
    expect(controls.fixture_helper).toContain("live Mind identifiers");
  });

  it("disables fetch for dry-run jobs without external ids", () => {
    const controls = mindJobControlsState({
      status: "sent",
      mind_response_text: null,
      parsed_at: null,
      external_thread_id: null,
      external_message_id: null,
    });

    expect(controls.can_fetch).toBe(false);
    expect(controls.fetch_helper).toBe("No live Mind identifiers are attached to this job.");
  });
});

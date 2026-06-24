export type MindWorkflowJob = {
  status: string;
  mind_response_text?: string | null;
  parsed_at?: string | null;
  external_thread_id?: string | null;
  external_message_id?: string | null;
};

export function mindJobControlsState(job: MindWorkflowJob | null): {
  can_fetch: boolean;
  fetch_helper: string | null;
  can_parse: boolean;
  parse_label: string;
  parse_helper: string | null;
  can_load_fixture: boolean;
  fixture_helper: string | null;
  raw_response_default_open: boolean;
} {
  if (!job) {
    return {
      can_fetch: false,
      fetch_helper: null,
      can_parse: false,
      parse_label: "Parse response",
      parse_helper: null,
      can_load_fixture: false,
      fixture_helper: null,
      raw_response_default_open: false,
    };
  }

  const hasLiveExternalIds = Boolean(job.external_thread_id || job.external_message_id);
  const hasResponseText = Boolean(job.mind_response_text?.trim());
  const status = job.status;
  const parsedAt = job.parsed_at ?? null;

  const canLoadFixtureByStatus = ["sent", "waiting_for_reply", "response_fetched"].includes(status);
  const can_load_fixture = canLoadFixtureByStatus && !hasLiveExternalIds;
  const fixture_helper =
    canLoadFixtureByStatus && hasLiveExternalIds
      ? "This job has live Mind identifiers. Create a separate dry-run job for fixture testing."
      : null;

  const can_fetch =
    (status === "sent" || status === "waiting_for_reply") &&
    hasLiveExternalIds &&
    !hasResponseText;
  let fetch_helper: string | null = null;
  if (!can_fetch) {
    if (status === "parsed") {
      fetch_helper = "This response has already been parsed.";
    } else if (status === "response_fetched") {
      fetch_helper = "Response already fetched. Parse is available if response text exists.";
    } else if (status === "parse_failed") {
      fetch_helper = "Response already fetched. Retry Parse.";
    } else if (status === "approved") {
      fetch_helper = "Send this job before fetching a Mind response.";
    } else if (status === "pending_approval") {
      fetch_helper = "Approve and send this job before fetching.";
    } else if (!hasLiveExternalIds) {
      fetch_helper = "No live Mind identifiers are attached to this job.";
    } else if (hasResponseText && (status === "sent" || status === "waiting_for_reply")) {
      fetch_helper = "Response already fetched. Parse is available if response text exists.";
    } else {
      fetch_helper = "Fetch is only available for live-sent jobs.";
    }
  }

  let can_parse = false;
  let parse_label = "Parse response";
  let parse_helper: string | null = null;

  if (status === "parsed" || (Boolean(parsedAt) && status !== "parse_failed")) {
    can_parse = false;
    parse_label = "Already parsed";
    parse_helper = "This response has already been parsed.";
  } else if (status === "response_fetched") {
    can_parse = hasResponseText && !parsedAt;
    parse_helper = hasResponseText
      ? "Response already fetched. Parse is available if response text exists."
      : "Fetch a Mind response before parsing.";
  } else if (status === "parse_failed") {
    can_parse = hasResponseText;
    parse_helper = hasResponseText
      ? "Response already fetched. Retry Parse."
      : "Fetch a Mind response before parsing.";
  } else {
    can_parse = false;
    parse_helper = hasResponseText ? null : "Fetch a Mind response before parsing.";
  }

  return {
    can_fetch,
    fetch_helper,
    can_parse,
    parse_label,
    parse_helper,
    can_load_fixture,
    fixture_helper,
    raw_response_default_open: status !== "parsed",
  };
}

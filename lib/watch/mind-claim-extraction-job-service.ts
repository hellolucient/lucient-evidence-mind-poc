import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { MIND_CLAIM_EXTRACTION_CONTRACT_VERSION } from "@/lib/review/mind-claim-intelligence-constants";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import { mapReviewQueueAccessToAuditFields } from "@/lib/review/review-item-status-audit";
import {
  buildMindClaimExtractionPrompt,
  parseMindClaimExtractionResponse,
} from "@/lib/watch/mind-claim-extraction-contract";
import {
  countCandidateClaimsForExtractionJob,
  getMindClaimExtractionJobById,
  insertCandidateClaimsFromExtraction,
  updateMindClaimExtractionJob,
} from "@/lib/watch/mind-claim-extraction-job-store";
import {
  buildMindClaimHelloMindsConversationAlias,
  sendMindClaimHelloMindsMessage,
} from "@/lib/watch/mind-claim-hellominds-transport";
import {
  extractHelloMindsMessageTextLoose,
  fetchHelloMindsConversationHistoryWithDiagnostics,
  type HelloMindsHistoryMultiKeyDiagnostics,
} from "@/lib/watch/external-mind-hellominds-history";
import {
  convertHelloMindsMessageTextToPlainText,
  splitHelloMindsMindReplyPlainText,
} from "@/lib/watch/external-mind-hellominds-message-format";
import { recordMindClaimIntelligenceAuditEvent } from "@/lib/watch/mind-claim-intelligence-audit-store";
import { sanitizeMindParseError } from "@/lib/watch/mind-json-parser";
import { buildMindClaimExtractionDemoFixtureResponseText } from "@/lib/watch/mind-claim-extraction-demo-fixture";
import { getSourceIntakeDocumentById } from "@/lib/watch/source-intake-store";

export type MindClaimExtractionJobActionResult =
  | {
      ok: true;
      job: Awaited<ReturnType<typeof getMindClaimExtractionJobById>>["job"];
      fetch_diagnostics?: HelloMindsHistoryMultiKeyDiagnostics & {
        per_message: Array<{
          key: string;
          index: number;
          message_id: string | null;
          party_type: number | null;
          mind_email: string | null;
          sender_email: string | null;
          sender_name: string | null;
          created_at: string | null;
          is_after_sent_at: boolean | null;
          has_text: boolean;
          contains_contract_version: boolean;
          begins_with_brace: boolean;
          selector_decision: "accepted" | "rejected";
          selector_reason: string;
        }>;
        selected_message?: { key: string; message_id: string | null; created_at: string | null } | null;
      };
      fetch_notice?: string;
    }
  | { ok: false; error: string; message: string };

function buildActor(access: ReviewQueueAccessContext, operatorEmail?: string | null): string | null {
  const audit = mapReviewQueueAccessToAuditFields(access);
  if (audit.access_mode === "supabase_operator") {
    return sanitizeOperatorEmail(operatorEmail);
  }

  return audit.actor_type;
}

async function auditExtractionEvent(
  input: {
    workspace_id: string;
    job_id: string;
    event_type: string;
    event_summary: string;
    actor?: string | null;
    metadata?: Record<string, unknown>;
  },
  access: ReviewQueueAccessContext
): Promise<void> {
  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: input.workspace_id,
      entity_type: "mind_claim_extraction_job",
      entity_id: input.job_id,
      event_type: input.event_type,
      event_summary: input.event_summary,
      actor: input.actor ?? null,
      metadata: input.metadata ?? {},
    },
    access
  );
}

export async function approveMindClaimExtractionJob(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimExtractionJobActionResult> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "extraction_job_not_found",
      message: "Mind extraction job not found.",
    };
  }

  if (lookup.job.review_status === "approved") {
    return { ok: true, job: lookup.job };
  }

  const actor = buildActor(access, options?.operatorEmail);
  const now = new Date().toISOString();
  const update = await updateMindClaimExtractionJob(jobId, access, {
    review_status: "approved",
    status: "approved",
    approved_by: actor,
    approved_at: now,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to approve extraction job." };
  }

  await auditExtractionEvent(
    {
      workspace_id: update.job.workspace_id,
      job_id: jobId,
      event_type: "approved",
      event_summary: "Operator approved Mind claim extraction job.",
      actor,
    },
    access
  );

  return { ok: true, job: update.job };
}

export async function sendMindClaimExtractionJob(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimExtractionJobActionResult> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "extraction_job_not_found",
      message: "Mind extraction job not found.",
    };
  }

  if (lookup.job.review_status !== "approved") {
    return {
      ok: false,
      error: "approval_required",
      message: "Extraction job must be approved before send.",
    };
  }

  if (lookup.job.status === "sent" || lookup.job.status === "response_fetched" || lookup.job.status === "parsed") {
    return { ok: true, job: lookup.job };
  }

  const sourceDoc = await getSourceIntakeDocumentById(lookup.job.source_document_id, access);
  if (!sourceDoc.document) {
    return {
      ok: false,
      error: sourceDoc.error ?? "source_document_not_found",
      message: "Source document not found for extraction job.",
    };
  }

  const prompt = buildMindClaimExtractionPrompt({
    sourceText: sourceDoc.document.source_text,
    sourceTitle: sourceDoc.document.title,
    sourceType: sourceDoc.document.source_type,
  });

  const sendResult = await sendMindClaimHelloMindsMessage({
    jobKind: "extraction",
    jobId,
    messageText: prompt,
  });

  const actor = buildActor(access, options?.operatorEmail);
  const now = new Date().toISOString();

  if (!sendResult.ok) {
    await updateMindClaimExtractionJob(jobId, access, {
      status: "failed",
      parse_error: sendResult.message,
    });
    await auditExtractionEvent(
      {
        workspace_id: lookup.job.workspace_id,
        job_id: jobId,
        event_type: "send_failed",
        event_summary: sendResult.message,
        actor,
        metadata: { transport_mode: sendResult.transport_mode ?? "blocked" },
      },
      access
    );
    return { ok: false, error: sendResult.error, message: sendResult.message };
  }

  const update = await updateMindClaimExtractionJob(jobId, access, {
    status: "sent",
    sent_at: now,
    external_thread_id: sendResult.external_thread_id,
    external_message_id: sendResult.external_message_id,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to record extraction send." };
  }

  await auditExtractionEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: sendResult.transport_mode === "dry_run" ? "dry_run_send" : "live_send",
      event_summary:
        sendResult.transport_mode === "dry_run"
          ? "Dry-run send completed (EXTERNAL_MIND_LIVE_SEND=false)."
          : "Live send completed.",
      actor,
      metadata: {
        transport_mode: sendResult.transport_mode,
        conversation_alias: buildMindClaimHelloMindsConversationAlias("extraction", jobId),
      },
    },
    access
  );

  return { ok: true, job: update.job };
}

export async function fetchMindClaimExtractionJobResponse(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimExtractionJobActionResult> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "extraction_job_not_found",
      message: "Mind extraction job not found.",
    };
  }

  if (
    lookup.job.status !== "sent" &&
    lookup.job.status !== "waiting_for_reply" &&
    lookup.job.status !== "response_fetched"
  ) {
    return {
      ok: false,
      error: "invalid_job_state",
      message: "Only sent extraction jobs can fetch Mind response.",
    };
  }

  const conversationAlias = buildMindClaimHelloMindsConversationAlias("extraction", jobId);
  const sentAtEpoch = lookup.job.sent_at ? Date.parse(lookup.job.sent_at) : Number.NaN;

  const historyKeys = [
    lookup.job.external_thread_id?.trim() || null,
    conversationAlias,
  ].filter((value): value is string => Boolean(value));

  const multiDiagnostics: HelloMindsHistoryMultiKeyDiagnostics = {
    checked_keys: historyKeys,
    results: [],
  };

  const perMessageDiagnostics: NonNullable<
    Extract<MindClaimExtractionJobActionResult, { ok: true }>["fetch_diagnostics"]
  >["per_message"] = [];

  type Candidate = {
    key: string;
    message: (Awaited<ReturnType<typeof fetchHelloMindsConversationHistoryWithDiagnostics>> & { ok: true })["messages"][number];
    createdAtEpoch: number | null;
    text: string;
  };

  const candidates: Candidate[] = [];
  const CONTRACT_MARKER = MIND_CLAIM_EXTRACTION_CONTRACT_VERSION;

  for (const key of historyKeys) {
    const result = await fetchHelloMindsConversationHistoryWithDiagnostics({
      conversationAlias: key,
      limit: 50,
    });

    multiDiagnostics.results.push(result.diagnostics);

    if (!result.ok) {
      if (result.error !== "conversation_not_found") {
        console.log("[mind_fetch_response] hellominds_history_error", {
          job_kind: "extraction",
          job_id: jobId,
          key,
          error: result.error,
          http_status: result.httpStatus ?? null,
          url: result.diagnostics.url,
          raw_top_level_keys: result.diagnostics.raw_top_level_keys,
          raw_message_count: result.diagnostics.raw_message_count,
        });
        return { ok: false, error: String(result.error), message: result.message };
      }
      continue;
    }

    const messages = result.messages;
    for (let idx = 0; idx < messages.length; idx += 1) {
      const message = messages[idx]!;
      const rawCreatedAt = message.createdAt ?? null;
      const createdEpoch = rawCreatedAt ? Date.parse(rawCreatedAt) : Number.NaN;
      const hasCreated = Number.isFinite(createdEpoch);
      const isAfterSentAt =
        Number.isFinite(sentAtEpoch) && hasCreated ? createdEpoch >= sentAtEpoch : null;

      const text = extractHelloMindsMessageTextLoose(message);
      const hasText = Boolean(text);
      const trimmed = (text ?? "").trim();
      const containsContract = trimmed.includes(CONTRACT_MARKER);
      const beginsWithBrace = trimmed.startsWith("{");

      let selectorDecision: "accepted" | "rejected" = "rejected";
      let selectorReason = "";

      if (!hasText) {
        selectorReason = "Rejected: no message text/content/body found.";
      } else if (Number.isFinite(sentAtEpoch) && hasCreated && createdEpoch < sentAtEpoch) {
        selectorReason = "Rejected: createdAt is before job.sent_at.";
      } else if (!containsContract && !beginsWithBrace) {
        selectorReason = `Rejected: content does not contain "${CONTRACT_MARKER}" and does not begin with "{".`;
      } else {
        selectorDecision = "accepted";
        selectorReason = containsContract
          ? `Accepted: contains "${CONTRACT_MARKER}".`
          : 'Accepted: begins with "{".';
      }

      perMessageDiagnostics.push({
        key,
        index: idx,
        message_id: message.messageId ?? null,
        party_type: typeof message.partyType === "number" ? message.partyType : null,
        mind_email: message.mindEmail ?? null,
        sender_email: message.senderEmail ?? null,
        sender_name: message.senderName ?? null,
        created_at: rawCreatedAt,
        is_after_sent_at: isAfterSentAt,
        has_text: hasText,
        contains_contract_version: containsContract,
        begins_with_brace: beginsWithBrace,
        selector_decision: selectorDecision,
        selector_reason: selectorReason,
      });

      if (selectorDecision === "accepted") {
        candidates.push({
          key,
          message,
          createdAtEpoch: hasCreated ? createdEpoch : null,
          text: trimmed,
        });
      }
    }

    console.log("[mind_fetch_response] hellominds_history_ok", {
      job_kind: "extraction",
      job_id: jobId,
      key,
      url: result.diagnostics.url,
      http_status: result.httpStatus,
      json_parsed: result.diagnostics.json_parsed,
      raw_top_level_keys: result.diagnostics.raw_top_level_keys,
      raw_message_count: result.diagnostics.raw_message_count,
      parsed_message_count: result.diagnostics.parsed_message_count,
    });
  }

  const actor = buildActor(access, options?.operatorEmail);

  const diagnosticsBundle: Extract<MindClaimExtractionJobActionResult, { ok: true }>["fetch_diagnostics"] =
    {
      ...multiDiagnostics,
      per_message: perMessageDiagnostics,
      selected_message: null,
    };

  const selected = candidates
    .slice()
    .sort((a, b) => {
      const at = a.createdAtEpoch ?? Number.NEGATIVE_INFINITY;
      const bt = b.createdAtEpoch ?? Number.NEGATIVE_INFINITY;
      if (at !== bt) return bt - at;
      return 0;
    })[0];

  if (!selected) {
    const counts = multiDiagnostics.results.map((r) => r.raw_message_count);
    const matchingContracts = perMessageDiagnostics.filter((m) => m.contains_contract_version).length;
    const notice = `No matching Mind response found. Checked keys: ${historyKeys.join(
      ", "
    )}. Messages returned: [${counts.join(", ")}]. Matching contract_version messages: ${matchingContracts}.`;

    console.log("[mind_fetch_response] no_matching_mind_response", {
      job_kind: "extraction",
      job_id: jobId,
      checked_keys: historyKeys,
      raw_message_counts: counts,
      matching_contract_version_messages: matchingContracts,
    });

    const update = await updateMindClaimExtractionJob(jobId, access, {
      status: lookup.job.status === "response_fetched" ? lookup.job.status : "waiting_for_reply",
    });

    if (!update.ok) {
      return { ok: false, error: update.error, message: "Unable to record fetch check." };
    }

    await auditExtractionEvent(
      {
        workspace_id: lookup.job.workspace_id,
        job_id: jobId,
        event_type: "no_reply_yet",
        event_summary: notice,
        actor,
        metadata: {
          checked_keys: historyKeys,
          raw_message_counts: counts,
          matching_contract_version_messages: matchingContracts,
        },
      },
      access
    );

    return { ok: true, job: update.job, fetch_notice: notice, fetch_diagnostics: diagnosticsBundle };
  }

  diagnosticsBundle.selected_message = {
    key: selected.key,
    message_id: selected.message.messageId ?? null,
    created_at: selected.message.createdAt ?? null,
  };

  const plainText = convertHelloMindsMessageTextToPlainText(selected.text);
  const split = plainText ? splitHelloMindsMindReplyPlainText(plainText) : null;
  const usableReplyBody = (split?.main_reply_plain ?? plainText)?.trim() || null;
  const now = new Date().toISOString();

  if (!usableReplyBody) {
    const update = await updateMindClaimExtractionJob(jobId, access, {
      status: lookup.job.status === "response_fetched" ? lookup.job.status : "waiting_for_reply",
    });

    if (!update.ok) {
      return { ok: false, error: update.error, message: "Unable to record fetch check." };
    }

    await auditExtractionEvent(
      {
        workspace_id: lookup.job.workspace_id,
        job_id: jobId,
        event_type: "no_reply_yet",
        event_summary: "HelloMinds history fetched; no Mind reply yet.",
        actor,
        metadata: {
          conversation_alias: conversationAlias,
          mind_reply_state: summary.mind_reply_state,
        },
      },
      access
    );

    return { ok: true, job: update.job, fetch_diagnostics: diagnosticsBundle };
  }

  const update = await updateMindClaimExtractionJob(jobId, access, {
    status: "response_fetched",
    response_fetched_at: now,
    mind_response_text: usableReplyBody,
    cost_report: split?.cost_report_plain
      ? { reported_by_mind: true, summary: split.cost_report_plain }
      : null,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to store Mind response." };
  }

  await auditExtractionEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "response_fetched",
      event_summary: "Mind response fetched from HelloMinds history.",
      actor,
      metadata: {
        conversation_alias: conversationAlias,
        selected_history_key: selected.key,
        selected_message_id: selected.message.messageId ?? null,
      },
    },
    access
  );

  return { ok: true, job: update.job, fetch_diagnostics: diagnosticsBundle };
}

/** Non-live fixture load for operator validation. No HelloMinds or external transport calls. */
export async function loadMindClaimExtractionDemoFixtureResponse(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimExtractionJobActionResult> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "extraction_job_not_found",
      message: "Mind extraction job not found.",
    };
  }

  if (
    lookup.job.status !== "sent" &&
    lookup.job.status !== "waiting_for_reply" &&
    lookup.job.status !== "response_fetched"
  ) {
    return {
      ok: false,
      error: "invalid_job_state",
      message: "Non-live fixture response can only be loaded for sent extraction jobs.",
    };
  }

  if (lookup.job.external_thread_id || lookup.job.external_message_id) {
    return {
      ok: false,
      error: "fixture_blocked_live_external_ids",
      message:
        "This job already has live external identifiers. Loading a fixture would overwrite the stored response for this job. Create a separate dry-run job for fixture testing.",
    };
  }

  const now = new Date().toISOString();
  const actor = buildActor(access, options?.operatorEmail);
  const fixtureText = buildMindClaimExtractionDemoFixtureResponseText();

  const update = await updateMindClaimExtractionJob(jobId, access, {
    status: "response_fetched",
    response_fetched_at: now,
    mind_response_text: fixtureText,
    cost_report: {
      reported_by_mind: false,
      summary: "Non-live fixture response (no external Mind call).",
    },
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to store non-live fixture response." };
  }

  await auditExtractionEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "demo_fixture_response_loaded",
      event_summary:
        "Non-live fixture Mind extraction response loaded. No external Mind call was performed.",
      actor,
      metadata: {
        response_source: "demo_fixture",
        external_call_performed: false,
        fixture_contract_version: MIND_CLAIM_EXTRACTION_CONTRACT_VERSION,
      },
    },
    access
  );

  return { ok: true, job: update.job };
}

export async function parseMindClaimExtractionJobResponse(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<
  | {
      ok: true;
      job: NonNullable<Awaited<ReturnType<typeof getMindClaimExtractionJobById>>["job"]>;
      candidate_claim_count: number;
      idempotent: boolean;
      message?: string;
    }
  | { ok: false; error: string; message: string }
> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "extraction_job_not_found",
      message: "Mind extraction job not found.",
    };
  }

  if (lookup.job.status === "parsed") {
    const existingCount = await countCandidateClaimsForExtractionJob(jobId);
    return {
      ok: true,
      job: lookup.job,
      candidate_claim_count: existingCount,
      idempotent: true,
      message: "This extraction job has already been parsed.",
    };
  }

  if (!lookup.job.mind_response_text?.trim()) {
    return {
      ok: false,
      error: "mind_response_missing",
      message: "No Mind response text is available to parse.",
    };
  }

  // parse_failed jobs remain re-parsable when mind_response_text is present (Phase 46A).

  const existingCount = await countCandidateClaimsForExtractionJob(jobId);
  if (existingCount > 0) {
    const update = await updateMindClaimExtractionJob(jobId, access, {
      status: "parsed",
      parsed_at: lookup.job.parsed_at ?? new Date().toISOString(),
      parse_error: null,
    });
    return {
      ok: true,
      job: update.ok ? update.job : lookup.job,
      candidate_claim_count: existingCount,
      idempotent: true,
      message: "This extraction job has already been parsed.",
    };
  }

  const parsed = parseMindClaimExtractionResponse(lookup.job.mind_response_text);
  const actor = buildActor(access, options?.operatorEmail);

  if (!parsed.ok) {
    const parseError = sanitizeMindParseError(parsed.message);
    await updateMindClaimExtractionJob(jobId, access, {
      status: "parse_failed",
      parse_error: parseError,
    });
    await auditExtractionEvent(
      {
        workspace_id: lookup.job.workspace_id,
        job_id: jobId,
        event_type: "parse_failed",
        event_summary: parseError,
        actor,
      },
      access
    );
    return { ok: false, error: parsed.error, message: parsed.message };
  }

  const insert = await insertCandidateClaimsFromExtraction(
    {
      workspace_id: lookup.job.workspace_id,
      source_document_id: lookup.job.source_document_id,
      extraction_job_id: jobId,
      claims: parsed.data.claims,
      created_by: actor,
    },
    access
  );

  if (!insert.ok) {
    return { ok: false, error: insert.error, message: "Unable to create candidate claims." };
  }

  const now = new Date().toISOString();
  const update = await updateMindClaimExtractionJob(jobId, access, {
    status: "parsed",
    parsed_at: now,
    parse_error: null,
    cost_report: parsed.data.cost_report,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to mark extraction job parsed." };
  }

  await auditExtractionEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "parsed",
      event_summary: `Parsed ${insert.count} candidate claims from Mind response.`,
      actor,
      metadata: { candidate_claim_count: insert.count },
    },
    access
  );

  return {
    ok: true,
    job: update.job,
    candidate_claim_count: insert.count,
    idempotent: false,
    message: "Parse completed.",
  };
}

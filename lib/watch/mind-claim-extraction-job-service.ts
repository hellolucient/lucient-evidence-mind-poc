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
  fetchHelloMindsConversationHistory,
  summarizeHelloMindsHistoryMessages,
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
  | { ok: true; job: Awaited<ReturnType<typeof getMindClaimExtractionJobById>>["job"] }
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

  if (lookup.job.status !== "sent" && lookup.job.status !== "response_fetched") {
    return {
      ok: false,
      error: "invalid_job_state",
      message: "Only sent extraction jobs can fetch Mind response.",
    };
  }

  const conversationAlias = buildMindClaimHelloMindsConversationAlias("extraction", jobId);
  const history = await fetchHelloMindsConversationHistory({
    conversationAlias,
    limit: 50,
  });

  if (!history.ok) {
    return { ok: false, error: history.error, message: history.message };
  }

  const summary = summarizeHelloMindsHistoryMessages(history.messages);
  const latestMindReplyText = summary.latest_mind_reply?.messageText;
  const plainText = latestMindReplyText
    ? convertHelloMindsMessageTextToPlainText(latestMindReplyText)
    : null;
  const split = plainText ? splitHelloMindsMindReplyPlainText(plainText) : null;
  const now = new Date().toISOString();
  const actor = buildActor(access, options?.operatorEmail);

  const update = await updateMindClaimExtractionJob(jobId, access, {
    status: "response_fetched",
    response_fetched_at: now,
    mind_response_text: split?.main_reply_plain ?? plainText,
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
      event_summary:
        summary.mind_reply_state === "mind_reply_found"
          ? "Mind response fetched from HelloMinds history."
          : "HelloMinds history fetched; no Mind reply yet.",
      actor,
      metadata: {
        conversation_alias: conversationAlias,
        mind_reply_state: summary.mind_reply_state,
      },
    },
    access
  );

  return { ok: true, job: update.job };
}

/** Demo-only fixture load. No HelloMinds or external transport calls. */
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

  if (lookup.job.status !== "sent" && lookup.job.status !== "response_fetched") {
    return {
      ok: false,
      error: "invalid_job_state",
      message: "Demo fixture response can only be loaded for sent extraction jobs.",
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
      summary: "Demo fixture response (no external Mind call).",
    },
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to store demo fixture response." };
  }

  await auditExtractionEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "demo_fixture_response_loaded",
      event_summary:
        "Demo fixture Mind extraction response loaded. No external Mind call was performed.",
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
    return { ok: true, job: lookup.job, candidate_claim_count: existingCount, idempotent: true };
  }

  if (!lookup.job.mind_response_text?.trim()) {
    return {
      ok: false,
      error: "mind_response_missing",
      message: "Fetch Mind response before parsing.",
    };
  }

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
  };
}

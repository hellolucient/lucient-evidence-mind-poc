import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import { mapReviewQueueAccessToAuditFields } from "@/lib/review/review-item-status-audit";
import {
  buildMindClaimRiskBriefPrompt,
  parseMindClaimRiskBriefResponse,
} from "@/lib/watch/mind-claim-risk-brief-contract";
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
import { getClientClaimUuidById } from "@/lib/watch/candidate-claim-accept-service";
import { recordMindClaimIntelligenceAuditEvent } from "@/lib/watch/mind-claim-intelligence-audit-store";
import { sanitizeMindParseError } from "@/lib/watch/mind-json-parser";
import { buildMindClaimRiskBriefDemoFixtureResponseText } from "@/lib/watch/mind-claim-risk-brief-demo-fixture";
import {
  getMindClaimRiskBriefByJobId,
  getMindClaimRiskBriefJobById,
  insertMindClaimRiskBrief,
  updateMindClaimRiskBriefJob,
} from "@/lib/watch/mind-claim-risk-brief-store";
import { MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION } from "@/lib/review/mind-claim-intelligence-constants";

export type MindClaimRiskBriefJobActionResult =
  | { ok: true; job: NonNullable<Awaited<ReturnType<typeof getMindClaimRiskBriefJobById>>["job"]> }
  | { ok: false; error: string; message: string };

function buildActor(access: ReviewQueueAccessContext, operatorEmail?: string | null): string | null {
  const audit = mapReviewQueueAccessToAuditFields(access);
  if (audit.access_mode === "supabase_operator") {
    return sanitizeOperatorEmail(operatorEmail);
  }

  return audit.actor_type;
}

async function auditRiskBriefEvent(
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
      entity_type: "mind_claim_risk_brief_job",
      entity_id: input.job_id,
      event_type: input.event_type,
      event_summary: input.event_summary,
      actor: input.actor ?? null,
      metadata: input.metadata ?? {},
    },
    access
  );
}

export async function approveMindClaimRiskBriefJob(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimRiskBriefJobActionResult> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "risk_brief_job_not_found",
      message: "Mind risk brief job not found.",
    };
  }

  if (lookup.job.review_status === "approved") {
    return { ok: true, job: lookup.job };
  }

  const actor = buildActor(access, options?.operatorEmail);
  const now = new Date().toISOString();
  const update = await updateMindClaimRiskBriefJob(jobId, access, {
    review_status: "approved",
    status: "approved",
    approved_by: actor,
    approved_at: now,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to approve risk brief job." };
  }

  await auditRiskBriefEvent(
    {
      workspace_id: update.job.workspace_id,
      job_id: jobId,
      event_type: "approved",
      event_summary: "Operator approved Mind claim risk brief job.",
      actor,
    },
    access
  );

  return { ok: true, job: update.job };
}

export async function sendMindClaimRiskBriefJob(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimRiskBriefJobActionResult> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "risk_brief_job_not_found",
      message: "Mind risk brief job not found.",
    };
  }

  if (lookup.job.review_status !== "approved") {
    return {
      ok: false,
      error: "approval_required",
      message: "Risk brief job must be approved before send.",
    };
  }

  if (lookup.job.status === "sent" || lookup.job.status === "response_fetched" || lookup.job.status === "parsed") {
    return { ok: true, job: lookup.job };
  }

  const clientClaim = await getClientClaimUuidById(lookup.job.client_claim_id, access);
  if (!clientClaim.claim) {
    return {
      ok: false,
      error: clientClaim.error ?? "client_claim_not_found",
      message: "Client claim not found for risk brief job.",
    };
  }

  const promptVariant =
    lookup.job.output_contract_version === "mind_claim_risk_brief_json_v2" ||
    lookup.job.prompt_version === "mind_claim_risk_brief_live_research_v2"
      ? "live_research_v2"
      : "v1";

  const prompt = buildMindClaimRiskBriefPrompt({
    claimText: clientClaim.claim.claim_text,
    claimFamily: clientClaim.claim.claim_family,
    promptVariant,
  });

  // Always persist outbound prompt so dry-runs are inspectable.
  await updateMindClaimRiskBriefJob(jobId, access, {
    outbound_prompt_text: prompt,
  });

  const sendResult = await sendMindClaimHelloMindsMessage({
    jobKind: "risk_brief",
    jobId,
    messageText: prompt,
  });

  const actor = buildActor(access, options?.operatorEmail);
  const now = new Date().toISOString();

  if (!sendResult.ok) {
    await updateMindClaimRiskBriefJob(jobId, access, {
      status: "failed",
      parse_error: sendResult.message,
    });
    await auditRiskBriefEvent(
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

  const update = await updateMindClaimRiskBriefJob(jobId, access, {
    status: "sent",
    sent_at: now,
    external_thread_id: sendResult.external_thread_id,
    external_message_id: sendResult.external_message_id,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to record risk brief send." };
  }

  await auditRiskBriefEvent(
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
        conversation_alias: buildMindClaimHelloMindsConversationAlias("risk_brief", jobId),
      },
    },
    access
  );

  return { ok: true, job: update.job };
}

export async function fetchMindClaimRiskBriefJobResponse(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimRiskBriefJobActionResult> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "risk_brief_job_not_found",
      message: "Mind risk brief job not found.",
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
      message: "Only sent risk brief jobs can fetch Mind response.",
    };
  }

  const conversationAlias = buildMindClaimHelloMindsConversationAlias("risk_brief", jobId);
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
  const actor = buildActor(access, options?.operatorEmail);

  const usableReplyBody = (split?.main_reply_plain ?? plainText)?.trim() || null;
  const now = new Date().toISOString();

  if (!usableReplyBody) {
    const update = await updateMindClaimRiskBriefJob(jobId, access, {
      status: lookup.job.status === "response_fetched" ? lookup.job.status : "waiting_for_reply",
    });

    if (!update.ok) {
      return { ok: false, error: update.error, message: "Unable to record fetch check." };
    }

    await auditRiskBriefEvent(
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

    return { ok: true, job: update.job };
  }

  const update = await updateMindClaimRiskBriefJob(jobId, access, {
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

  await auditRiskBriefEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "response_fetched",
      event_summary: "Mind risk brief response fetched from HelloMinds history.",
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

/** Non-live fixture load for operator validation. No HelloMinds or external transport calls. */
export async function loadMindClaimRiskBriefDemoFixtureResponse(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<MindClaimRiskBriefJobActionResult> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "risk_brief_job_not_found",
      message: "Mind risk brief job not found.",
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
      message: "Non-live fixture response can only be loaded for sent risk brief jobs.",
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

  const clientClaim = await getClientClaimUuidById(lookup.job.client_claim_id, access);
  const claimText = clientClaim.claim?.claim_text?.trim() || "wellness claim";

  const now = new Date().toISOString();
  const actor = buildActor(access, options?.operatorEmail);
  const fixtureText = buildMindClaimRiskBriefDemoFixtureResponseText(claimText);
  const fixture = JSON.parse(fixtureText) as { cost_report?: Record<string, unknown> };

  const update = await updateMindClaimRiskBriefJob(jobId, access, {
    status: "response_fetched",
    response_fetched_at: now,
    mind_response_text: fixtureText,
    cost_report: fixture.cost_report ?? {
      reported_by_mind: false,
      summary: "Non-live fixture response (no external Mind call).",
    },
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to store non-live fixture response." };
  }

  await auditRiskBriefEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "demo_fixture_response_loaded",
      event_summary:
        "Non-live fixture Mind risk brief response loaded. No external Mind call was performed.",
      actor,
      metadata: {
        response_source: "demo_fixture",
        external_call_performed: false,
        fixture_contract_version: MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION,
      },
    },
    access
  );

  return { ok: true, job: update.job };
}

export async function parseMindClaimRiskBriefJobResponse(
  jobId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<
  | {
      ok: true;
      job: NonNullable<Awaited<ReturnType<typeof getMindClaimRiskBriefJobById>>["job"]>;
      risk_brief_id: string;
      idempotent: boolean;
      message?: string;
    }
  | { ok: false; error: string; message: string }
> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.job) {
    return {
      ok: false,
      error: lookup.error ?? "risk_brief_job_not_found",
      message: "Mind risk brief job not found.",
    };
  }

  const existingBrief = await getMindClaimRiskBriefByJobId(jobId);
  if (lookup.job.status === "parsed" && existingBrief) {
    return {
      ok: true,
      job: lookup.job,
      risk_brief_id: existingBrief.risk_brief_id,
      idempotent: true,
      message: "This risk brief job has already been parsed.",
    };
  }

  if (existingBrief) {
    const update = await updateMindClaimRiskBriefJob(jobId, access, {
      status: "parsed",
      parsed_at: lookup.job.parsed_at ?? new Date().toISOString(),
      parse_error: null,
    });
    return {
      ok: true,
      job: update.ok ? update.job : lookup.job,
      risk_brief_id: existingBrief.risk_brief_id,
      idempotent: true,
      message: "This risk brief job has already been parsed.",
    };
  }

  if (!lookup.job.mind_response_text?.trim()) {
    return {
      ok: false,
      error: "mind_response_missing",
      message: "No Mind response text is available to parse.",
    };
  }

  const parsed = parseMindClaimRiskBriefResponse(lookup.job.mind_response_text);
  const actor = buildActor(access, options?.operatorEmail);

  if (!parsed.ok) {
    const parseError = sanitizeMindParseError(parsed.message);
    await updateMindClaimRiskBriefJob(jobId, access, {
      status: "parse_failed",
      parse_error: parseError,
    });
    await auditRiskBriefEvent(
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

  const insert = await insertMindClaimRiskBrief(
    {
      workspace_id: lookup.job.workspace_id,
      client_claim_id: lookup.job.client_claim_id,
      risk_brief_job_id: jobId,
      parsed: parsed.data,
    },
    access
  );

  if (!insert.ok) {
    return { ok: false, error: insert.error, message: "Unable to create structured risk brief." };
  }

  const now = new Date().toISOString();
  const update = await updateMindClaimRiskBriefJob(jobId, access, {
    status: "parsed",
    parsed_at: now,
    parse_error: null,
    cost_report: parsed.data.cost_report,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to mark risk brief job parsed." };
  }

  await auditRiskBriefEvent(
    {
      workspace_id: lookup.job.workspace_id,
      job_id: jobId,
      event_type: "parsed",
      event_summary: "Structured Mind claim risk brief stored.",
      actor,
      metadata: { risk_brief_id: insert.brief.risk_brief_id },
    },
    access
  );

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: lookup.job.workspace_id,
      entity_type: "mind_claim_risk_brief",
      entity_id: insert.brief.risk_brief_id,
      event_type: "created",
      event_summary: "Mind claim risk brief parsed and stored.",
      actor,
      metadata: { risk_brief_job_id: jobId },
    },
    access
  );

  return {
    ok: true,
    job: update.job,
    risk_brief_id: insert.brief.risk_brief_id,
    idempotent: false,
    message: "Parse completed.",
  };
}

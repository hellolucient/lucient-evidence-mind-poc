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
  extractHelloMindsMessageTextLoose,
  fetchHelloMindsConversationHistoryWithDiagnostics,
  type HelloMindsHistoryMultiKeyDiagnostics,
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
  | {
      ok: true;
      job: NonNullable<Awaited<ReturnType<typeof getMindClaimRiskBriefJobById>>["job"]>;
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
  const sentAtEpoch = lookup.job.sent_at ? Date.parse(lookup.job.sent_at) : Number.NaN;

  // Prefer the provider conversation id when present (some HelloMinds deployments key history by conversationId).
  // Fall back to our deterministic alias used at send time.
  const historyKeys = [
    lookup.job.external_thread_id?.trim() || null,
    conversationAlias,
  ].filter((value): value is string => Boolean(value));

  const multiDiagnostics: HelloMindsHistoryMultiKeyDiagnostics = {
    checked_keys: historyKeys,
    results: [],
  };

  const perMessageDiagnostics: NonNullable<
    Extract<MindClaimRiskBriefJobActionResult, { ok: true }>["fetch_diagnostics"]
  >["per_message"] = [];

  type Candidate = {
    key: string;
    message: (Awaited<ReturnType<typeof fetchHelloMindsConversationHistoryWithDiagnostics>> & { ok: true })["messages"][number];
    createdAtEpoch: number | null;
    text: string;
  };

  const candidates: Candidate[] = [];
  const CONTRACT_MARKER = "mind_claim_risk_brief_json_v2";

  for (const key of historyKeys) {
    const result = await fetchHelloMindsConversationHistoryWithDiagnostics({
      conversationAlias: key,
      limit: 50,
    });

    multiDiagnostics.results.push(result.diagnostics);

    if (!result.ok) {
      // Try next key when the alias/id isn't found; otherwise surface the real error.
      if (result.error !== "conversation_not_found") {
        console.log("[mind_fetch_response] hellominds_history_error", {
          job_kind: "risk_brief",
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

    // Build per-message selector diagnostics for this key.
    const messages = result.messages;
    for (let idx = 0; idx < messages.length; idx += 1) {
      const message = messages[idx]!;
      const rawCreatedAt = message.createdAt ?? null;
      const createdEpoch = rawCreatedAt ? Date.parse(rawCreatedAt) : Number.NaN;
      const hasCreated = Number.isFinite(createdEpoch);
      const isAfterSentAt =
        Number.isFinite(sentAtEpoch) && hasCreated ? createdEpoch >= sentAtEpoch : Number.isFinite(sentAtEpoch) ? null : null;

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
      job_kind: "risk_brief",
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
  const diagnosticsBundle: Extract<MindClaimRiskBriefJobActionResult, { ok: true }>["fetch_diagnostics"] =
    {
      ...multiDiagnostics,
      per_message: perMessageDiagnostics,
      selected_message: null,
    };

  const selected = candidates
    .slice()
    .sort((a, b) => {
      // Prefer newest createdAt when available, otherwise stable ordering.
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
      job_kind: "risk_brief",
      job_id: jobId,
      checked_keys: historyKeys,
      raw_message_counts: counts,
      matching_contract_version_messages: matchingContracts,
    });

    // Keep job state unchanged (explicit operator check), but record an audit event and return diagnostics + explicit notice.
    await auditRiskBriefEvent(
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

    return { ok: true, job: lookup.job, fetch_notice: notice, fetch_diagnostics: diagnosticsBundle };
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
    // Do not mutate status on "no reply" checks. Some deployments may not have waiting_for_reply constraint applied yet,
    // and updating state here can mask the real underlying issue (missing reply vs schema mismatch).

    await auditRiskBriefEvent(
      {
        workspace_id: lookup.job.workspace_id,
        job_id: jobId,
        event_type: "no_reply_yet",
        event_summary: "HelloMinds history fetched; no Mind reply yet.",
        actor,
        metadata: {
          conversation_alias: conversationAlias,
        },
      },
      access
    );

    return { ok: true, job: lookup.job };
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
    return { ok: false, error: update.error, message: `Unable to store Mind response (${update.error}).` };
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
        selected_history_key: selected.key,
        selected_message_id: selected.message.messageId ?? null,
      },
    },
    access
  );

  return { ok: true, job: update.job, fetch_diagnostics: diagnosticsBundle };
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

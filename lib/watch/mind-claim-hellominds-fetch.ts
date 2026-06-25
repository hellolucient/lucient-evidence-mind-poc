import {
  getHelloMindsEmailChannelProbeIds,
  getHelloMindsConversationWithDiagnostics,
  isHelloMindsMessagingHistoryAlias,
  listHelloMindsConversationsWithDiagnostics,
  type HelloMindsConversationGetDiagnostics,
  type HelloMindsConversationListDiagnostics,
} from "@/lib/watch/external-mind-hellominds-conversations";
import {
  extractHelloMindsMessageTextLoose,
  fetchHelloMindsConversationHistoryWithDiagnostics,
  type HelloMindsHistoryMessageRecord,
  type HelloMindsHistoryMultiKeyDiagnostics,
} from "@/lib/watch/external-mind-hellominds-history";
import {
  buildMindClaimHelloMindsConversationAlias,
  type MindClaimHelloMindsJobKind,
} from "@/lib/watch/mind-claim-hellominds-transport";

export type MindClaimHelloMindsFetchPerMessageDiagnostic = {
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
};

export type MindClaimHelloMindsFetchDiagnostics = HelloMindsHistoryMultiKeyDiagnostics & {
  per_message: MindClaimHelloMindsFetchPerMessageDiagnostic[];
  selected_message?: { key: string; message_id: string | null; created_at: string | null } | null;
  conversation_list?: HelloMindsConversationListDiagnostics;
  conversation_get?: HelloMindsConversationGetDiagnostics[];
  history_key_notes?: string[];
  email_channel_probe_keys?: string[];
  history_probe_summary?: Array<{
    key: string;
    key_kind: "alias" | "conversation_id";
    source_alias: string | null;
    http_status: number | null;
    raw_message_count: number;
    parsed_message_count: number;
    matching_contract_version_messages: number;
  }>;
};

export type MindClaimHelloMindsFetchCandidate = {
  key: string;
  message: HelloMindsHistoryMessageRecord;
  createdAtEpoch: number | null;
  text: string;
};

export type MindClaimHelloMindsFetchProbeResult =
  | {
      ok: true;
      historyKeys: string[];
      diagnostics: MindClaimHelloMindsFetchDiagnostics;
      candidates: MindClaimHelloMindsFetchCandidate[];
      fetchNotice: string | null;
    }
  | { ok: false; error: string; message: string; diagnostics: MindClaimHelloMindsFetchDiagnostics };

export function resolveMindClaimHelloMindsHistoryKeys(input: {
  jobKind: MindClaimHelloMindsJobKind;
  jobId: string;
  storedExternalThreadId: string | null;
}): { keys: string[]; notes: string[] } {
  const computedAlias = buildMindClaimHelloMindsConversationAlias(input.jobKind, input.jobId);
  const keys: string[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();

  const add = (key: string | null | undefined, note?: string) => {
    const trimmed = key?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    keys.push(trimmed);
    if (note) notes.push(note);
  };

  add(computedAlias, "Deterministic Builder API alias used at send time.");

  const stored = input.storedExternalThreadId?.trim() || null;
  if (stored) {
    if (isHelloMindsMessagingHistoryAlias(stored)) {
      add(stored, "Stored external_thread_id is a retrievable Builder API alias.");
    } else {
      notes.push(
        `Skipped stored external_thread_id "${stored}" because Builder API history is keyed by conversation alias, not mindId suffix or email channel id.`
      );
    }
  }

  return { keys, notes };
}

function discoverAliasesFromConversationList(input: {
  jobId: string;
  jobKind: MindClaimHelloMindsJobKind;
  conversations: Awaited<ReturnType<typeof listHelloMindsConversationsWithDiagnostics>>["conversations"];
}): string[] {
  const prefix = buildMindClaimHelloMindsConversationAlias(input.jobKind, input.jobId).split(
    `-${input.jobId.trim()}`
  )[0];
  const aliases: string[] = [];

  for (const conversation of input.conversations) {
    const alias = conversation.alias?.trim();
    if (!alias) continue;
    if (alias.includes(input.jobId.trim()) || alias.startsWith(`${prefix}-`)) {
      aliases.push(alias);
    }
  }

  return aliases;
}

export async function probeMindClaimHelloMindsResponses(input: {
  jobKind: MindClaimHelloMindsJobKind;
  jobId: string;
  storedExternalThreadId: string | null;
  sentAt: string | null;
  contractMarker: string;
}): Promise<MindClaimHelloMindsFetchProbeResult> {
  const sentAtEpoch = input.sentAt ? Date.parse(input.sentAt) : Number.NaN;
  const { keys: initialKeys, notes: historyKeyNotes } = resolveMindClaimHelloMindsHistoryKeys({
    jobKind: input.jobKind,
    jobId: input.jobId,
    storedExternalThreadId: input.storedExternalThreadId,
  });

  const multiDiagnostics: MindClaimHelloMindsFetchDiagnostics = {
    checked_keys: [],
    results: [],
    per_message: [],
    selected_message: null,
    history_key_notes: historyKeyNotes,
  };

  const candidates: MindClaimHelloMindsFetchCandidate[] = [];
  const checked = new Set<string>();
  const historyProbeSummary: NonNullable<MindClaimHelloMindsFetchDiagnostics["history_probe_summary"]> =
    [];

  const recordHistoryProbeSummary = (
    key: string,
    keyKind: "alias" | "conversation_id",
    sourceAlias: string | null,
    diagnostics: (typeof multiDiagnostics.results)[number]
  ) => {
    const matchingContractVersionMessages = multiDiagnostics.per_message.filter(
      (message) => message.key === key && message.contains_contract_version
    ).length;

    historyProbeSummary.push({
      key,
      key_kind: keyKind,
      source_alias: sourceAlias,
      http_status: diagnostics.http_status,
      raw_message_count: diagnostics.raw_message_count,
      parsed_message_count: diagnostics.parsed_message_count,
      matching_contract_version_messages: matchingContractVersionMessages,
    });
  };

  const processKey = async (
    key: string,
    options?: { keyKind?: "alias" | "conversation_id"; sourceAlias?: string | null }
  ): Promise<{ ok: false; error: string; message: string } | null> => {
    if (checked.has(key)) return null;
    checked.add(key);
    multiDiagnostics.checked_keys.push(key);

    const result = await fetchHelloMindsConversationHistoryWithDiagnostics({
      conversationAlias: key,
      limit: 50,
    });
    multiDiagnostics.results.push(result.diagnostics);

    if (!result.ok) {
      recordHistoryProbeSummary(
        key,
        options?.keyKind ?? "alias",
        options?.sourceAlias ?? null,
        result.diagnostics
      );
      if (result.error === "conversation_not_found") {
        return null;
      }
      return { ok: false, error: String(result.error), message: result.message };
    }

    for (let idx = 0; idx < result.messages.length; idx += 1) {
      const message = result.messages[idx]!;
      const rawCreatedAt = message.createdAt ?? null;
      const createdEpoch = rawCreatedAt ? Date.parse(rawCreatedAt) : Number.NaN;
      const hasCreated = Number.isFinite(createdEpoch);
      const isAfterSentAt =
        Number.isFinite(sentAtEpoch) && hasCreated ? createdEpoch >= sentAtEpoch : null;

      const text = extractHelloMindsMessageTextLoose(message);
      const hasText = Boolean(text);
      const trimmed = (text ?? "").trim();
      const containsContract = trimmed.includes(input.contractMarker);
      const beginsWithBrace = trimmed.startsWith("{");

      let selectorDecision: "accepted" | "rejected" = "rejected";
      let selectorReason = "";

      if (!hasText) {
        selectorReason = "Rejected: no message text/content/body found.";
      } else if (Number.isFinite(sentAtEpoch) && hasCreated && createdEpoch < sentAtEpoch) {
        selectorReason = "Rejected: createdAt is before job.sent_at.";
      } else if (!containsContract && !beginsWithBrace) {
        selectorReason = `Rejected: content does not contain "${input.contractMarker}" and does not begin with "{".`;
      } else {
        selectorDecision = "accepted";
        selectorReason = containsContract
          ? `Accepted: contains "${input.contractMarker}".`
          : 'Accepted: begins with "{".';
      }

      multiDiagnostics.per_message.push({
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

    recordHistoryProbeSummary(
      key,
      options?.keyKind ?? "alias",
      options?.sourceAlias ?? null,
      result.diagnostics
    );

    return null;
  };

  const conversationGetDiagnostics: HelloMindsConversationGetDiagnostics[] = [];

  const probeAliasAndDiscoveredConversationId = async (
    alias: string
  ): Promise<{ ok: false; error: string; message: string } | null> => {
    const aliasFailure = await processKey(alias, { keyKind: "alias" });
    if (aliasFailure) return aliasFailure;

    const conversation = await getHelloMindsConversationWithDiagnostics(alias);
    conversationGetDiagnostics.push(conversation.diagnostics);

    const conversationId = conversation.conversation?.conversationId?.trim();
    if (!conversationId || checked.has(conversationId)) {
      return null;
    }

    multiDiagnostics.history_key_notes?.push(
      `Discovered conversationId ${conversationId} for alias ${alias}; probing GET /v1/messaging/history/${conversationId}.`
    );

    return processKey(conversationId, {
      keyKind: "conversation_id",
      sourceAlias: alias,
    });
  };

  for (const key of initialKeys) {
    const failure = await probeAliasAndDiscoveredConversationId(key);
    if (failure) {
      multiDiagnostics.conversation_get = conversationGetDiagnostics;
      multiDiagnostics.history_probe_summary = historyProbeSummary;
      return { ...failure, diagnostics: multiDiagnostics };
    }
  }

  if (conversationGetDiagnostics.length > 0) {
    multiDiagnostics.conversation_get = conversationGetDiagnostics;
  }

  if (candidates.length === 0) {
    const list = await listHelloMindsConversationsWithDiagnostics();
    multiDiagnostics.conversation_list = list.diagnostics;

    const discovered = discoverAliasesFromConversationList({
      jobId: input.jobId,
      jobKind: input.jobKind,
      conversations: list.conversations,
    });

    if (discovered.length > 0) {
      multiDiagnostics.history_key_notes?.push(
        `Discovered ${discovered.length} additional Builder API conversation alias(es) from GET /v1/messaging/conversations.`
      );
    }

    for (const alias of discovered) {
      const failure = await probeAliasAndDiscoveredConversationId(alias);
      if (failure) {
        multiDiagnostics.conversation_get = conversationGetDiagnostics;
        multiDiagnostics.history_probe_summary = historyProbeSummary;
        return { ...failure, diagnostics: multiDiagnostics };
      }
    }
  }

  if (candidates.length === 0) {
    const probeKeys = getHelloMindsEmailChannelProbeIds();
    if (probeKeys.length > 0) {
      multiDiagnostics.email_channel_probe_keys = probeKeys;
      multiDiagnostics.history_key_notes?.push(
        "Probing configured EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID values against Builder API history/conversation endpoints. Email channel ids are not documented Builder API history keys; probes are diagnostic only."
      );

      for (const probeKey of probeKeys) {
        const failure = await probeAliasAndDiscoveredConversationId(probeKey);
        if (failure) {
          multiDiagnostics.conversation_get = conversationGetDiagnostics;
          multiDiagnostics.history_probe_summary = historyProbeSummary;
          return { ...failure, diagnostics: multiDiagnostics };
        }
      }
      multiDiagnostics.conversation_get = conversationGetDiagnostics;
    }
  }

  multiDiagnostics.history_probe_summary = historyProbeSummary;

  const matchingContracts = multiDiagnostics.per_message.filter(
    (message) => message.contains_contract_version
  ).length;
  const counts = multiDiagnostics.results.map((result) => result.raw_message_count);
  const aliasSummaries = historyProbeSummary
    .filter((entry) => entry.key_kind === "alias")
    .map(
      (entry) =>
        `${entry.key}→${entry.raw_message_count} (contract:${entry.matching_contract_version_messages})`
    );
  const conversationIdSummaries = historyProbeSummary
    .filter((entry) => entry.key_kind === "conversation_id")
    .map(
      (entry) =>
        `${entry.key}→${entry.raw_message_count} (contract:${entry.matching_contract_version_messages})`
    );

  if (candidates.length === 0) {
    const notice = `No matching Mind response found. Alias history: [${
      aliasSummaries.join(", ") || "none"
    }]. ConversationId history: [${
      conversationIdSummaries.join(", ") || "none"
    }]. Messages returned (all keys): [${counts.join(", ")}]. Matching contract_version messages: ${matchingContracts}.`;
    return {
      ok: true,
      historyKeys: multiDiagnostics.checked_keys,
      diagnostics: multiDiagnostics,
      candidates: [],
      fetchNotice: notice,
    };
  }

  return {
    ok: true,
    historyKeys: multiDiagnostics.checked_keys,
    diagnostics: multiDiagnostics,
    candidates,
    fetchNotice: null,
  };
}

export function selectLatestMindClaimHelloMindsCandidate(
  candidates: MindClaimHelloMindsFetchCandidate[]
): MindClaimHelloMindsFetchCandidate | null {
  return (
    candidates
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAtEpoch ?? Number.NEGATIVE_INFINITY;
        const rightTime = right.createdAtEpoch ?? Number.NEGATIVE_INFINITY;
        if (leftTime !== rightTime) return rightTime - leftTime;
        return 0;
      })[0] ?? null
  );
}

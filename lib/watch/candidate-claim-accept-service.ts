import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import type { ClientClaimStatus } from "@/lib/review/client-claims-constants";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import {
  CLIENT_CLAIMS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { isSupportedClientClaimRiskLevel } from "@/lib/review/client-claims-constants";
import { canAccessReviewItemWorkspace } from "@/lib/operator-auth";
import {
  createClientClaim,
  getClientClaimByClientClaimId,
  isClientClaimsPersistenceConfigured,
  updateClientClaimStatus,
  type PrivacySafeClientClaim,
} from "@/lib/watch/client-claims-store";
import {
  getCandidateClaimById,
  updateCandidateClaim,
  type PrivacySafeCandidateClaim,
} from "@/lib/watch/candidate-claims-store";
import { recordMindClaimIntelligenceAuditEvent } from "@/lib/watch/mind-claim-intelligence-audit-store";

export type ClientClaimUuidRow = {
  id: string;
  workspace_id: string;
  client_claim_id: string;
  claim_text: string;
  claim_source_type: string | null;
  claim_family: string | null;
  risk_level: string | null;
  status: string;
};

/** Status applied to client_claims when candidate acceptance is undone. */
export const CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS: ClientClaimStatus = "withdrawn";

function slugifyClientClaimId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "mind-candidate-claim";
}

export function buildLinkedClientClaimId(
  candidateClaimId: string,
  claimText: string
): string {
  return `${slugifyClientClaimId(claimText)}-${candidateClaimId.slice(0, 8)}`;
}

function resolveCandidateClaimText(claim: {
  operator_edited_claim_text: string | null;
  claim_text: string;
}): string {
  return claim.operator_edited_claim_text?.trim() || claim.claim_text.trim();
}

function buildAuditActor(
  access: ReviewQueueAccessContext,
  operatorEmail?: string | null
): string {
  return access.mode === "break_glass"
    ? "break_glass"
    : sanitizeOperatorEmail(operatorEmail) ?? "operator";
}

function isPendingReviewStatus(reviewStatus: string): boolean {
  return reviewStatus === "pending" || reviewStatus === "edited";
}

export async function getClientClaimUuidById(
  claimUuid: string,
  access: ReviewQueueAccessContext
): Promise<{ claim: ClientClaimUuidRow | null; error?: string }> {
  if (!isClientClaimsPersistenceConfigured()) {
    return { claim: null, error: "supabase_not_configured" };
  }

  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  if (!hasSupabaseUrl || !hasSupabaseServiceRoleKey) {
    return { claim: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLIENT_CLAIMS_TABLE)
      .select("id, workspace_id, client_claim_id, claim_text, claim_source_type, claim_family, risk_level, status")
      .eq("id", claimUuid)
      .maybeSingle();

    if (error) {
      return { claim: null, error: "client_claim_lookup_failed" };
    }

    if (!data) {
      return { claim: null, error: "client_claim_not_found" };
    }

    const row = data as ClientClaimUuidRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { claim: null, error: "forbidden" };
    }

    return { claim: row };
  } catch {
    return { claim: null, error: "client_claim_lookup_failed" };
  }
}

export async function acceptCandidateClaimToClientRegistry(
  candidateClaimId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<
  | {
      ok: true;
      candidate_claim_id: string;
      client_claim: PrivacySafeClientClaim;
      idempotent: boolean;
    }
  | { ok: false; error: string; message: string }
> {
  const lookup = await getCandidateClaimById(candidateClaimId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.claim) {
    return {
      ok: false,
      error: lookup.error ?? "candidate_claim_not_found",
      message: "Candidate claim not found.",
    };
  }

  const claimText = resolveCandidateClaimText(lookup.claim);
  const linkedClientClaimId = buildLinkedClientClaimId(candidateClaimId, claimText);

  if (lookup.claim.review_status === "accepted") {
    const existing = await getClientClaimByClientClaimId(
      lookup.claim.workspace_id,
      linkedClientClaimId,
      access
    );

    if (existing.claim) {
      return {
        ok: true,
        candidate_claim_id: candidateClaimId,
        client_claim: existing.claim,
        idempotent: true,
      };
    }

    return {
      ok: false,
      error: "linked_client_claim_missing",
      message: "Candidate is accepted but linked client claim was not found.",
    };
  }

  if (lookup.claim.review_status === "rejected") {
    return {
      ok: false,
      error: "undo_required",
      message: "Undo rejection before accepting this candidate claim.",
    };
  }

  if (!isPendingReviewStatus(lookup.claim.review_status)) {
    return {
      ok: false,
      error: "invalid_review_status",
      message: "Candidate claim is not in a reviewable state.",
    };
  }

  const riskLevel =
    lookup.claim.risk_level && isSupportedClientClaimRiskLevel(lookup.claim.risk_level)
      ? lookup.claim.risk_level
      : "unknown";

  const createResult = await createClientClaim(
    {
      workspace_id: lookup.claim.workspace_id,
      client_claim_id: linkedClientClaimId,
      claim_text: claimText,
      claim_source_type: "marketing_copy",
      claim_source_label: "Mind candidate claim acceptance",
      source_url: null,
      claim_family: lookup.claim.claim_family,
      risk_level: riskLevel,
      status: "active",
    },
    access
  );

  if (!createResult.ok) {
    if (createResult.error === "duplicate_client_claim_id") {
      const existing = await getClientClaimByClientClaimId(
        lookup.claim.workspace_id,
        linkedClientClaimId,
        access
      );

      if (existing.claim?.status === "active") {
        const update = await updateCandidateClaim(candidateClaimId, access, {
          review_status: "accepted",
          operator_edited_claim_text: claimText,
        });

        if (!update.ok) {
          return { ok: false, error: update.error, message: "Unable to accept candidate claim." };
        }

        return {
          ok: true,
          candidate_claim_id: candidateClaimId,
          client_claim: existing.claim,
          idempotent: true,
        };
      }

      return {
        ok: false,
        error: "duplicate_client_claim_id",
        message: "A client claim with this identifier already exists.",
      };
    }

    return { ok: false, error: createResult.error, message: "Unable to create client claim." };
  }

  const update = await updateCandidateClaim(candidateClaimId, access, {
    review_status: "accepted",
    operator_edited_claim_text: claimText,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Client claim created but candidate update failed." };
  }

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: lookup.claim.workspace_id,
      entity_type: "candidate_claim",
      entity_id: candidateClaimId,
      event_type: "accepted",
      event_summary: "Candidate claim accepted into durable client_claims registry.",
      actor: buildAuditActor(access, options?.operatorEmail),
      metadata: { client_claim_id: createResult.claim.client_claim_id },
    },
    access
  );

  return {
    ok: true,
    candidate_claim_id: candidateClaimId,
    client_claim: createResult.claim,
    idempotent: false,
  };
}

export async function rejectCandidateClaimReview(
  candidateClaimId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null; operator_notes?: string | null }
): Promise<
  | { ok: true; candidate_claim_id: string; idempotent: boolean }
  | { ok: false; error: string; message: string }
> {
  const lookup = await getCandidateClaimById(candidateClaimId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.claim) {
    return {
      ok: false,
      error: lookup.error ?? "candidate_claim_not_found",
      message: "Candidate claim not found.",
    };
  }

  if (lookup.claim.review_status === "accepted") {
    return {
      ok: false,
      error: "undo_acceptance_required",
      message: "Undo acceptance before rejecting this candidate claim.",
    };
  }

  if (lookup.claim.review_status === "rejected") {
    return { ok: true, candidate_claim_id: candidateClaimId, idempotent: true };
  }

  if (!isPendingReviewStatus(lookup.claim.review_status)) {
    return {
      ok: false,
      error: "invalid_review_status",
      message: "Candidate claim is not in a reviewable state.",
    };
  }

  const update = await updateCandidateClaim(candidateClaimId, access, {
    review_status: "rejected",
    operator_notes: options?.operator_notes ?? null,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to reject candidate claim." };
  }

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: lookup.claim.workspace_id,
      entity_type: "candidate_claim",
      entity_id: candidateClaimId,
      event_type: "rejected",
      event_summary: "Candidate claim rejected by operator.",
      actor: buildAuditActor(access, options?.operatorEmail),
    },
    access
  );

  return { ok: true, candidate_claim_id: candidateClaimId, idempotent: false };
}

export async function undoCandidateClaimReviewDecision(
  candidateClaimId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<
  | {
      ok: true;
      candidate_claim_id: string;
      candidate_claim: PrivacySafeCandidateClaim;
      client_claim_status_updated: boolean;
      undo_type: "acceptance_undone" | "rejection_undone";
    }
  | { ok: false; error: string; message: string }
> {
  const lookup = await getCandidateClaimById(candidateClaimId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!lookup.claim) {
    return {
      ok: false,
      error: lookup.error ?? "candidate_claim_not_found",
      message: "Candidate claim not found.",
    };
  }

  if (isPendingReviewStatus(lookup.claim.review_status)) {
    return {
      ok: false,
      error: "nothing_to_undo",
      message: "Candidate claim is pending review; there is no decision to undo.",
    };
  }

  const actor = buildAuditActor(access, options?.operatorEmail);
  const previousReviewStatus = lookup.claim.review_status;

  if (lookup.claim.review_status === "accepted") {
    const claimText = resolveCandidateClaimText(lookup.claim);
    const linkedClientClaimId = buildLinkedClientClaimId(candidateClaimId, claimText);
    let clientClaimStatusUpdated = false;

    const linked = await getClientClaimByClientClaimId(
      lookup.claim.workspace_id,
      linkedClientClaimId,
      access
    );

    if (linked.claim) {
      const statusUpdate = await updateClientClaimStatus(
        lookup.claim.workspace_id,
        linkedClientClaimId,
        CANDIDATE_ACCEPTANCE_UNDO_CLIENT_CLAIM_STATUS,
        access
      );

      if (!statusUpdate.ok) {
        return {
          ok: false,
          error: statusUpdate.error,
          message: "Unable to withdraw linked client claim.",
        };
      }

      clientClaimStatusUpdated = true;
    }

    const update = await updateCandidateClaim(candidateClaimId, access, {
      review_status: "pending",
    });

    if (!update.ok) {
      return { ok: false, error: update.error, message: "Unable to undo candidate acceptance." };
    }

    await recordMindClaimIntelligenceAuditEvent(
      {
        workspace_id: lookup.claim.workspace_id,
        entity_type: "candidate_claim",
        entity_id: candidateClaimId,
        event_type: "acceptance_undone",
        event_summary: "Candidate acceptance undone; registered claim was withdrawn.",
        actor,
        metadata: {
          previous_review_status: previousReviewStatus,
          new_review_status: "pending",
          client_claim_status_updated: clientClaimStatusUpdated,
        },
      },
      access
    );

    return {
      ok: true,
      candidate_claim_id: candidateClaimId,
      candidate_claim: update.claim,
      client_claim_status_updated: clientClaimStatusUpdated,
      undo_type: "acceptance_undone",
    };
  }

  if (lookup.claim.review_status === "rejected") {
    const update = await updateCandidateClaim(candidateClaimId, access, {
      review_status: "pending",
    });

    if (!update.ok) {
      return { ok: false, error: update.error, message: "Unable to undo candidate rejection." };
    }

    await recordMindClaimIntelligenceAuditEvent(
      {
        workspace_id: lookup.claim.workspace_id,
        entity_type: "candidate_claim",
        entity_id: candidateClaimId,
        event_type: "rejection_undone",
        event_summary: "Candidate rejection undone; candidate returned to pending review.",
        actor,
        metadata: {
          previous_review_status: previousReviewStatus,
          new_review_status: "pending",
        },
      },
      access
    );

    return {
      ok: true,
      candidate_claim_id: candidateClaimId,
      candidate_claim: update.claim,
      client_claim_status_updated: false,
      undo_type: "rejection_undone",
    };
  }

  return {
    ok: false,
    error: "invalid_review_status",
    message: "Candidate claim is not in a state that supports undo.",
  };
}

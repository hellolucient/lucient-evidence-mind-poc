import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import { mapReviewQueueAccessToAuditFields } from "@/lib/review/review-item-status-audit";
import {
  CLIENT_CLAIMS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { isSupportedClientClaimRiskLevel } from "@/lib/review/client-claims-constants";
import { canAccessReviewItemWorkspace } from "@/lib/operator-auth";
import {
  createClientClaim,
  isClientClaimsPersistenceConfigured,
  type PrivacySafeClientClaim,
} from "@/lib/watch/client-claims-store";
import {
  getCandidateClaimById,
  updateCandidateClaim,
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

function slugifyClientClaimId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "mind-candidate-claim";
}

export async function acceptCandidateClaimToClientRegistry(
  candidateClaimId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null }
): Promise<
  | { ok: true; candidate_claim_id: string; client_claim: PrivacySafeClientClaim }
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

  const claimText =
    lookup.claim.operator_edited_claim_text?.trim() || lookup.claim.claim_text.trim();
  const clientClaimId = `${slugifyClientClaimId(claimText)}-${candidateClaimId.slice(0, 8)}`;

  const riskLevel =
    lookup.claim.risk_level && isSupportedClientClaimRiskLevel(lookup.claim.risk_level)
      ? lookup.claim.risk_level
      : "unknown";

  const createResult = await createClientClaim(
    {
      workspace_id: lookup.claim.workspace_id,
      client_claim_id: clientClaimId,
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
      const update = await updateCandidateClaim(candidateClaimId, access, {
        review_status: "accepted",
      });
      if (!update.ok) {
        return { ok: false, error: update.error, message: "Unable to accept candidate claim." };
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

  const auditActor =
    access.mode === "break_glass"
      ? "break_glass"
      : sanitizeOperatorEmail(options?.operatorEmail) ?? "operator";

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: lookup.claim.workspace_id,
      entity_type: "candidate_claim",
      entity_id: candidateClaimId,
      event_type: "accepted",
      event_summary: "Candidate claim accepted into durable client_claims registry.",
      actor: auditActor,
      metadata: { client_claim_id: createResult.claim.client_claim_id },
    },
    access
  );

  return {
    ok: true,
    candidate_claim_id: candidateClaimId,
    client_claim: createResult.claim,
  };
}

export async function rejectCandidateClaimReview(
  candidateClaimId: string,
  access: ReviewQueueAccessContext,
  options?: { operatorEmail?: string | null; operator_notes?: string | null }
): Promise<
  | { ok: true; candidate_claim_id: string }
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

  const update = await updateCandidateClaim(candidateClaimId, access, {
    review_status: "rejected",
    operator_notes: options?.operator_notes ?? null,
  });

  if (!update.ok) {
    return { ok: false, error: update.error, message: "Unable to reject candidate claim." };
  }

  const auditActor =
    access.mode === "break_glass"
      ? "break_glass"
      : sanitizeOperatorEmail(options?.operatorEmail) ?? "operator";

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: lookup.claim.workspace_id,
      entity_type: "candidate_claim",
      entity_id: candidateClaimId,
      event_type: "rejected",
      event_summary: "Candidate claim rejected by operator.",
      actor: auditActor,
    },
    access
  );

  return { ok: true, candidate_claim_id: candidateClaimId };
}

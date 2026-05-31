import {
  DEMO_MAGNESIUM_CLAIM_FAMILY,
  DEMO_WORKSPACE_ID,
} from "@/lib/review/evidence-change-brief-constants";
import type {
  EvidenceSignalValue,
  RiskImplicationValue,
} from "@/lib/review/evidence-change-brief-constants";
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  resolveAffectedClientClaimsByClaimFamily,
  type AffectedClientClaimRef,
} from "@/lib/watch/affected-client-claims-resolver";
import { getClaimFamilyProfile } from "@/lib/watch/claim-family-profile-store";
import {
  createEvidenceChangeBrief,
  createEvidenceChangeBriefClaimSnapshots,
  findActiveBriefForClaimFamily,
  type EvidenceChangeBriefInsertInput,
  type PrivacySafeEvidenceChangeBrief,
} from "@/lib/watch/evidence-change-brief-store";

export type BriefGeneratorContext = {
  claim_family: string;
  claim_family_display_name: string;
  watchlist_id?: string | null;
  evidence_alert_id?: string | null;
  review_item_id?: string | null;
  review_signal?: string | null;
  review_severity?: string | null;
  safer_wording?: string | null;
  affected_claims: AffectedClientClaimRef[];
};

export type GeneratedBriefContent = {
  brief_title: string;
  brief_summary: string;
  what_changed: string;
  why_it_matters: string;
  evidence_signal: EvidenceSignalValue;
  risk_implication: RiskImplicationValue;
  recommended_action: string;
  safer_wording: string | null;
  affected_client_claims_count: number;
};

export type DemoBriefGenerationResult =
  | { ok: true; brief: PrivacySafeEvidenceChangeBrief; duplicate_skipped?: boolean }
  | { ok: false; error: string; message: string };

const SAFER_WORDING_BY_CLAIM_FAMILY: Record<string, string> = {
  magnesium_cortisol_stress:
    "This experience may support relaxation and general wellbeing as part of a balanced wellness routine.",
  cortisol_hormone_regulation:
    "This experience may support relaxation and general wellbeing as part of a balanced wellness routine.",
};

export function resolveSaferWordingForClaimFamily(claimFamily: string): string | null {
  return SAFER_WORDING_BY_CLAIM_FAMILY[claimFamily] ?? null;
}

export function mapReviewSignalToEvidenceSignal(
  reviewSignal: string | null | undefined
): EvidenceSignalValue {
  switch (reviewSignal) {
    case "strengthens_claim":
      return "supportive";
    case "weakens_claim":
      return "weak";
    case "contradicts_claim":
      return "contradictory";
    case "no_material_change":
      return "unclear";
    case "monitor_only":
      return "unclear";
    case "human_review_required":
    case "client_claim_re_review_required":
      return "mixed";
    default:
      return "unclear";
  }
}

export function mapToRiskImplication(
  evidenceSignal: EvidenceSignalValue,
  reviewSignal?: string | null,
  reviewSeverity?: string | null
): RiskImplicationValue {
  if (reviewSignal === "contradicts_claim" || evidenceSignal === "contradictory") {
    return reviewSeverity === "high" ? "claim_not_supported" : "escalation_recommended";
  }

  if (reviewSignal === "weakens_claim" || evidenceSignal === "weak") {
    return reviewSeverity === "high" ? "escalation_recommended" : "wording_review_recommended";
  }

  if (evidenceSignal === "safety_signal") {
    return "escalation_recommended";
  }

  if (evidenceSignal === "supportive") {
    return "no_change";
  }

  if (evidenceSignal === "mixed") {
    return "wording_review_recommended";
  }

  return "monitor";
}

export function mapRiskImplicationToRecommendedAction(
  riskImplication: RiskImplicationValue
): string {
  switch (riskImplication) {
    case "no_change":
      return "monitor only";
    case "monitor":
      return "monitor only";
    case "wording_review_recommended":
      return "review wording";
    case "escalation_recommended":
      return "escalate for expert/legal review";
    case "claim_not_supported":
      return "update or pause claim";
    default:
      return "monitor only";
  }
}

export function generateEvidenceChangeBriefContent(
  context: BriefGeneratorContext
): GeneratedBriefContent {
  const displayName = context.claim_family_display_name;
  const watchlistLabel = context.watchlist_id ? ` watchlist (${context.watchlist_id})` : "";
  const affectedCount = context.affected_claims.length;

  const evidenceSignal = mapReviewSignalToEvidenceSignal(context.review_signal);
  const riskImplication = mapToRiskImplication(
    evidenceSignal,
    context.review_signal,
    context.review_severity
  );
  const recommendedAction = mapRiskImplicationToRecommendedAction(riskImplication);
  const saferWording =
    context.safer_wording ?? resolveSaferWordingForClaimFamily(context.claim_family);

  return {
    brief_title: `Evidence change detected for ${displayName}`,
    brief_summary: `New evidence was detected for the ${displayName} claim family. ${affectedCount} mapped client claim${affectedCount === 1 ? "" : "s"} may require operator review.`,
    what_changed: `New evidence was detected for the monitored ${displayName} claim family${watchlistLabel}. The watchtower flagged a change that may affect mapped client claims in this workspace.`,
    why_it_matters: `Client claims mapped to ${displayName} may depend on this evidence area. Changes in the underlying evidence can affect whether current marketing or wellness wording remains supportable.`,
    evidence_signal: evidenceSignal,
    risk_implication: riskImplication,
    recommended_action: recommendedAction,
    safer_wording: saferWording,
    affected_client_claims_count: affectedCount,
  };
}

export function buildBriefInsertFromGeneratedContent(
  workspaceId: string,
  claimFamily: string,
  context: BriefGeneratorContext,
  content: GeneratedBriefContent
): EvidenceChangeBriefInsertInput {
  return {
    workspace_id: workspaceId,
    claim_family: claimFamily,
    watchlist_id: context.watchlist_id ?? null,
    evidence_alert_id: context.evidence_alert_id ?? null,
    review_item_id: context.review_item_id ?? null,
    brief_title: content.brief_title,
    brief_summary: content.brief_summary,
    what_changed: content.what_changed,
    why_it_matters: content.why_it_matters,
    evidence_signal: content.evidence_signal,
    risk_implication: content.risk_implication,
    recommended_action: content.recommended_action,
    safer_wording: content.safer_wording,
    affected_client_claims_count: content.affected_client_claims_count,
    status: "ready_for_review",
  };
}

export async function resolveDemoMagnesiumBriefContext(
  workspaceId: string = DEMO_WORKSPACE_ID
): Promise<{ context: BriefGeneratorContext; error?: string }> {
  const claimFamily = DEMO_MAGNESIUM_CLAIM_FAMILY;
  const profileResult = await getClaimFamilyProfile(claimFamily);
  const displayName = profileResult.profile?.display_name ?? claimFamily;
  const watchlistId =
    profileResult.profile?.default_watchlist_id ?? "watch-magnesium-cortisol";

  const affectedResult = await resolveAffectedClientClaimsByClaimFamily(claimFamily, workspaceId);
  if (affectedResult.error && affectedResult.error !== "supabase_not_configured") {
    return { context: buildEmptyContext(claimFamily, displayName, watchlistId), error: affectedResult.error };
  }

  return {
    context: {
      claim_family: claimFamily,
      claim_family_display_name: displayName,
      watchlist_id: watchlistId,
      safer_wording: resolveSaferWordingForClaimFamily(claimFamily),
      affected_claims: affectedResult.claims,
    },
  };
}

function buildEmptyContext(
  claimFamily: string,
  displayName: string,
  watchlistId: string | null
): BriefGeneratorContext {
  return {
    claim_family: claimFamily,
    claim_family_display_name: displayName,
    watchlist_id: watchlistId,
    affected_claims: [],
  };
}

export async function generateDemoMagnesiumBrief(
  access: ReviewQueueAccessContext,
  options?: { workspaceId?: string; skipDuplicateCheck?: boolean }
): Promise<DemoBriefGenerationResult> {
  const workspaceId = options?.workspaceId ?? DEMO_WORKSPACE_ID;

  if (access.mode === "operator" && !access.workspaceIds.includes(workspaceId)) {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  if (!options?.skipDuplicateCheck) {
    const existing = await findActiveBriefForClaimFamily(
      workspaceId,
      DEMO_MAGNESIUM_CLAIM_FAMILY,
      access
    );
    if (existing.brief) {
      return { ok: true, brief: existing.brief, duplicate_skipped: true };
    }
  }

  const { context, error: contextError } = await resolveDemoMagnesiumBriefContext(workspaceId);
  if (contextError) {
    return {
      ok: false,
      error: contextError,
      message: "Unable to resolve affected client claims for the demo brief.",
    };
  }

  const content = generateEvidenceChangeBriefContent(context);
  const insertInput = buildBriefInsertFromGeneratedContent(
    workspaceId,
    DEMO_MAGNESIUM_CLAIM_FAMILY,
    context,
    content
  );

  const createResult = await createEvidenceChangeBrief(insertInput, access);
  if (!createResult.ok) {
    return {
      ok: false,
      error: createResult.error,
      message: briefGenerationErrorMessage(createResult.error),
    };
  }

  const snapshotResult = await createEvidenceChangeBriefClaimSnapshots(
    createResult.brief.id,
    workspaceId,
    context.affected_claims.map((claim) => ({
      client_claim_id: claim.client_claim_id,
      claim_text_snapshot: claim.claim_text,
      claim_source_type: claim.claim_source_type,
      claim_source_label: claim.claim_source_label,
      claim_family: claim.claim_family,
      mapping_confidence: claim.mapping_confidence ?? null,
    })),
    access
  );

  if (!snapshotResult.ok) {
    return {
      ok: false,
      error: snapshotResult.error,
      message: briefGenerationErrorMessage(snapshotResult.error),
    };
  }

  return { ok: true, brief: createResult.brief };
}

export function briefGenerationErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_change_briefs_table_missing":
      return "The evidence_change_briefs table is missing. Apply the Phase 28 migration in Supabase.";
    case "evidence_change_brief_claims_table_missing":
      return "The evidence_change_brief_claims table is missing. Apply the Phase 28 migration in Supabase.";
    case "forbidden":
      return "You do not have access to create briefs in this workspace.";
    case "required_fields_missing":
      return "Required brief fields are missing.";
    default:
      return `Unable to generate brief: ${error}`;
  }
}

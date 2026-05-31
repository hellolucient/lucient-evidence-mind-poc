import {
  DEMO_DIGEST_PERIOD_DAYS,
  DEMO_WORKSPACE_ID,
} from "@/lib/review/evidence-mind-digest-constants";
import type { DigestHighestRiskImplication } from "@/lib/review/evidence-mind-digest-constants";
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { mapReviewSignalToEvidenceSignal, mapToRiskImplication } from "@/lib/watch/evidence-change-brief-generator";
import {
  collectDigestSourceData,
  type DigestSourceData,
} from "@/lib/watch/evidence-mind-digest-data-collector";
import {
  createEvidenceMindDigest,
  createEvidenceMindDigestItemSnapshots,
  findActiveDigestForPeriod,
  type EvidenceMindDigestInsertInput,
  type EvidenceMindDigestItemSnapshotInput,
  type PrivacySafeEvidenceMindDigest,
} from "@/lib/watch/evidence-mind-digest-store";

export type DigestPeriod = {
  period_start: string;
  period_end: string;
  period_label: string;
};

export type GeneratedDigestContent = {
  digest_title: string;
  digest_summary: string;
  watchlists_checked_count: number;
  new_alerts_count: number;
  review_items_count: number;
  briefs_count: number;
  affected_claim_families_count: number;
  affected_client_claims_count: number;
  highest_risk_implication: DigestHighestRiskImplication;
  recommended_focus: string;
  item_snapshots: EvidenceMindDigestItemSnapshotInput[];
};

export type DemoDigestGenerationResult =
  | { ok: true; digest: PrivacySafeEvidenceMindDigest; duplicate_skipped?: boolean }
  | { ok: false; error: string; message: string };

const RISK_RANK: Record<DigestHighestRiskImplication, number> = {
  claim_not_supported: 5,
  escalation_recommended: 4,
  wording_review_recommended: 3,
  monitor: 2,
  none: 1,
  unknown: 0,
};

export function buildRecentDigestPeriod(days: number = DEMO_DIGEST_PERIOD_DAYS): DigestPeriod {
  const periodEnd = new Date();
  periodEnd.setUTCHours(23, 59, 59, 999);

  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
  periodStart.setUTCHours(0, 0, 0, 0);

  return {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    period_label: formatDigestPeriodLabel(periodStart, periodEnd),
  };
}

export function formatDigestPeriodLabel(periodStart: Date, periodEnd: Date): string {
  const sameYear = periodStart.getFullYear() === periodEnd.getFullYear();
  const startLabel = periodStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = periodEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function mapBriefRiskToDigestRisk(riskImplication: string): DigestHighestRiskImplication {
  switch (riskImplication) {
    case "claim_not_supported":
      return "claim_not_supported";
    case "escalation_recommended":
      return "escalation_recommended";
    case "wording_review_recommended":
      return "wording_review_recommended";
    case "monitor":
      return "monitor";
    case "no_change":
      return "none";
    default:
      return "unknown";
  }
}

export function mapReviewItemToDigestRisk(
  signal: string | null,
  severity: string | null
): DigestHighestRiskImplication {
  const evidenceSignal = mapReviewSignalToEvidenceSignal(signal);
  const briefRisk = mapToRiskImplication(evidenceSignal, signal, severity);
  return mapBriefRiskToDigestRisk(briefRisk);
}

export function rankHighestDigestRisk(risks: DigestHighestRiskImplication[]): DigestHighestRiskImplication {
  if (risks.length === 0) {
    return "none";
  }

  return risks.reduce((highest, current) =>
    RISK_RANK[current] > RISK_RANK[highest] ? current : highest
  );
}

export function recommendedFocusForHighestRisk(
  highestRisk: DigestHighestRiskImplication
): string {
  switch (highestRisk) {
    case "claim_not_supported":
      return "Update or pause unsupported claims.";
    case "escalation_recommended":
      return "Escalate high-risk claim families for expert/legal review.";
    case "wording_review_recommended":
      return "Review wording for affected mapped claims.";
    case "monitor":
    case "none":
      return "No immediate action required. Continue monitoring.";
    default:
      return "No immediate action required. Continue monitoring.";
  }
}

export function generateEvidenceMindDigestContent(
  source: DigestSourceData,
  period: DigestPeriod
): GeneratedDigestContent {
  const claimFamilies = new Set<string>();
  const clientClaims = new Set<string>();
  const riskValues: DigestHighestRiskImplication[] = [];
  const itemSnapshots: EvidenceMindDigestItemSnapshotInput[] = [];

  for (const brief of source.briefs) {
    claimFamilies.add(brief.claim_family);
    const digestRisk = mapBriefRiskToDigestRisk(brief.risk_implication);
    riskValues.push(digestRisk);

    itemSnapshots.push({
      item_type: "evidence_brief",
      item_ref_id: brief.id,
      claim_family: brief.claim_family,
      title_snapshot: brief.brief_title,
      summary_snapshot: brief.brief_summary,
      risk_implication: digestRisk,
      recommended_action: brief.recommended_action,
    });
  }

  for (const claim of source.brief_claims) {
    clientClaims.add(claim.client_claim_id);
    claimFamilies.add(claim.claim_family);

    itemSnapshots.push({
      item_type: "client_claim",
      item_ref_id: claim.brief_id,
      claim_family: claim.claim_family,
      client_claim_id: claim.client_claim_id,
      title_snapshot: claim.client_claim_id,
      summary_snapshot: claim.claim_text_snapshot,
    });
  }

  for (const item of source.review_items) {
    claimFamilies.add(item.claim_family);
    clientClaims.add(item.client_claim_id);
    const digestRisk = mapReviewItemToDigestRisk(item.signal, item.severity);
    riskValues.push(digestRisk);

    itemSnapshots.push({
      item_type: "review_item",
      item_ref_id: item.id,
      claim_family: item.claim_family,
      client_claim_id: item.client_claim_id,
      title_snapshot: item.summary ?? `Review item for ${item.claim_family}`,
      summary_snapshot: item.summary,
      risk_implication: digestRisk,
    });
  }

  for (const alert of source.alerts) {
    if (alert.claim_family) {
      claimFamilies.add(alert.claim_family);
    }

    itemSnapshots.push({
      item_type: "evidence_alert",
      item_ref_id: alert.id,
      claim_family: alert.claim_family,
      title_snapshot: alert.title ?? `Evidence alert (${alert.alert_type})`,
      summary_snapshot: alert.title,
      risk_implication: alert.severity === "high" ? "escalation_recommended" : "monitor",
    });
  }

  for (const mapping of source.mappings) {
    claimFamilies.add(mapping.claim_family);
    clientClaims.add(mapping.client_claim_id);
  }

  for (const claimFamily of claimFamilies) {
    itemSnapshots.push({
      item_type: "claim_family",
      claim_family: claimFamily,
      title_snapshot: claimFamily,
      summary_snapshot: "Claim family represented in this digest period.",
    });
  }

  const highestRisk = rankHighestDigestRisk(riskValues);
  const hasActivity =
    source.alerts.length > 0 ||
    source.review_items.length > 0 ||
    source.briefs.length > 0 ||
    source.watchlists_checked_count > 0;

  const digestSummary = hasActivity
    ? `During ${period.period_label}, the watchtower recorded ${source.alerts.length} new alert(s), ${source.review_items.length} review item(s), and ${source.briefs.length} evidence change brief(s) affecting ${claimFamilies.size} claim famil${claimFamilies.size === 1 ? "y" : "ies"} and ${clientClaims.size} client claim(s). Highest risk implication: ${highestRisk.replace(/_/g, " ")}.`
    : `During ${period.period_label}, no new watchtower activity was recorded for this workspace. Continue routine monitoring.`;

  return {
    digest_title: `Evidence Mind Digest — ${period.period_label}`,
    digest_summary: digestSummary,
    watchlists_checked_count: source.watchlists_checked_count,
    new_alerts_count: source.alerts.length,
    review_items_count: source.review_items.length,
    briefs_count: source.briefs.length,
    affected_claim_families_count: claimFamilies.size,
    affected_client_claims_count: clientClaims.size,
    highest_risk_implication: hasActivity ? highestRisk : "none",
    recommended_focus: recommendedFocusForHighestRisk(hasActivity ? highestRisk : "none"),
    item_snapshots: itemSnapshots,
  };
}

export function buildDigestInsertFromGeneratedContent(
  workspaceId: string,
  period: DigestPeriod,
  content: GeneratedDigestContent
): EvidenceMindDigestInsertInput {
  return {
    workspace_id: workspaceId,
    period_start: period.period_start,
    period_end: period.period_end,
    digest_title: content.digest_title,
    digest_summary: content.digest_summary,
    watchlists_checked_count: content.watchlists_checked_count,
    new_alerts_count: content.new_alerts_count,
    review_items_count: content.review_items_count,
    briefs_count: content.briefs_count,
    affected_claim_families_count: content.affected_claim_families_count,
    affected_client_claims_count: content.affected_client_claims_count,
    highest_risk_implication: content.highest_risk_implication,
    recommended_focus: content.recommended_focus,
    status: "ready_for_review",
  };
}

export async function generateDemoEvidenceMindDigest(
  access: ReviewQueueAccessContext,
  options?: { workspaceId?: string; skipDuplicateCheck?: boolean }
): Promise<DemoDigestGenerationResult> {
  const workspaceId = options?.workspaceId ?? DEMO_WORKSPACE_ID;

  if (access.mode === "operator" && !access.workspaceIds.includes(workspaceId)) {
    return { ok: false, error: "forbidden", message: "You do not have access to this workspace." };
  }

  const period = buildRecentDigestPeriod();
  const canonicalStart = period.period_start;
  const canonicalEnd = period.period_end;

  if (!options?.skipDuplicateCheck) {
    const existing = await findActiveDigestForPeriod(
      workspaceId,
      canonicalStart,
      canonicalEnd,
      access
    );
    if (existing.digest) {
      return { ok: true, digest: existing.digest, duplicate_skipped: true };
    }
  }

  const source = await collectDigestSourceData(workspaceId, canonicalStart, canonicalEnd);

  if (source.error && source.error !== "supabase_not_configured") {
    return {
      ok: false,
      error: source.error,
      message: digestGenerationErrorMessage(source.error),
    };
  }

  const content = generateEvidenceMindDigestContent(source, period);
  const insertInput = buildDigestInsertFromGeneratedContent(workspaceId, period, content);

  const createResult = await createEvidenceMindDigest(insertInput, access);
  if (!createResult.ok) {
    if (createResult.error === "duplicate_active_digest" && !options?.skipDuplicateCheck) {
      const existing = await findActiveDigestForPeriod(
        workspaceId,
        canonicalStart,
        canonicalEnd,
        access
      );
      if (existing.digest) {
        return { ok: true, digest: existing.digest, duplicate_skipped: true };
      }
    }

    return {
      ok: false,
      error: createResult.error,
      message: digestGenerationErrorMessage(createResult.error),
    };
  }

  const snapshotResult = await createEvidenceMindDigestItemSnapshots(
    createResult.digest.id,
    workspaceId,
    content.item_snapshots,
    access
  );

  if (!snapshotResult.ok) {
    return {
      ok: false,
      error: snapshotResult.error,
      message: digestGenerationErrorMessage(snapshotResult.error),
    };
  }

  return { ok: true, digest: createResult.digest };
}

export function digestGenerationErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_mind_digests_table_missing":
      return "The evidence_mind_digests table is missing. Apply the Phase 29 migration in Supabase.";
    case "evidence_mind_digest_items_table_missing":
      return "The evidence_mind_digest_items table is missing. Apply the Phase 29 migration in Supabase.";
    case "forbidden":
      return "You do not have access to create digests in this workspace.";
    case "required_fields_missing":
      return "Required digest fields are missing.";
    case "duplicate_active_digest":
      return "An active digest already exists for this period.";
    default:
      return `Unable to generate digest: ${error}`;
  }
}

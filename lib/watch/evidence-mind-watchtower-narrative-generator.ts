import type { WatchtowerNarrativeConfidenceLevel } from "@/lib/review/evidence-mind-watchtower-narrative-constants";
import {
  DEFAULT_DIGEST_WATCHTOWER_NARRATIVE_TYPE,
  DEFAULT_WATCHTOWER_NARRATIVE_GENERATION_METHOD,
  DIGEST_WATCHTOWER_NARRATIVE_VERSION,
  type WatchtowerNarrativeGenerationMethod,
  type WatchtowerNarrativeRiskPosture,
  type WatchtowerNarrativeType,
} from "@/lib/review/evidence-mind-watchtower-narrative-constants";
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  generateAndStoreWatchtowerNarrativeDiffForNarrative,
  watchtowerNarrativeDiffGenerationErrorMessage,
} from "@/lib/watch/evidence-mind-watchtower-narrative-diff-generator";
import {
  createWatchtowerNarrative,
  findWatchtowerNarrativeForDigest,
  type PrivacySafeWatchtowerNarrative,
  type WatchtowerNarrativeInsertInput,
} from "@/lib/watch/evidence-mind-watchtower-narrative-store";
import {
  getEvidenceMindDigestById,
  listEvidenceMindDigestItemsForDigest,
  type PrivacySafeEvidenceMindDigest,
  type PrivacySafeEvidenceMindDigestItem,
} from "@/lib/watch/evidence-mind-digest-store";

export type GeneratedWatchtowerNarrativeContent = Omit<
  WatchtowerNarrativeInsertInput,
  "workspace_id" | "digest_id" | "claim_family"
>;

export type WatchtowerNarrativeDiffGenerationSummary = {
  diff_id: string;
  duplicate_skipped?: boolean;
};

export type WatchtowerNarrativeDiffWarning = {
  error: string;
  message: string;
};

export type WatchtowerNarrativeGenerationResult =
  | {
      ok: true;
      narrative: PrivacySafeWatchtowerNarrative;
      duplicate_skipped?: boolean;
      watchtower_narrative_diff_result?: WatchtowerNarrativeDiffGenerationSummary;
      diff_warning?: WatchtowerNarrativeDiffWarning;
    }
  | { ok: false; error: string; message: string };

const FORBIDDEN_NARRATIVE_KEY_FRAGMENTS = [
  "authorization",
  "bearer",
  "cron_secret",
  "service_role",
  "service-role",
  "access_token",
  "refresh_token",
  "magic_link",
  "magic-link",
  "internal_review_access_token",
  "password",
  "secret",
  "operator_email",
  "user_id",
  "userid",
  "auth_user",
] as const;

export function mapDigestRiskToNarrativePosture(
  highestRiskImplication: string
): WatchtowerNarrativeRiskPosture {
  switch (highestRiskImplication) {
    case "none":
      return "stable";
    case "monitor":
      return "monitor";
    case "wording_review_recommended":
    case "escalation_recommended":
      return "elevated";
    case "claim_not_supported":
      return "material_change";
    default:
      return "unknown";
  }
}

function humanizeRisk(value: string): string {
  return value.replaceAll("_", " ");
}

function collectClaimFamilies(items: PrivacySafeEvidenceMindDigestItem[]): string[] {
  const families = new Set<string>();
  for (const item of items) {
    if (item.claim_family) {
      families.add(item.claim_family);
    }
  }
  return [...families].sort();
}

function collectClientClaims(items: PrivacySafeEvidenceMindDigestItem[]): string[] {
  const claims = new Set<string>();
  for (const item of items) {
    if (item.client_claim_id) {
      claims.add(item.client_claim_id);
    }
  }
  return [...claims].sort();
}

function buildReferencedEntities(
  digest: PrivacySafeEvidenceMindDigest,
  items: PrivacySafeEvidenceMindDigestItem[]
): Record<string, unknown> {
  const claimFamilies = collectClaimFamilies(items);
  const clientClaims = collectClientClaims(items);

  return {
    digest_id: digest.id,
    claim_families: claimFamilies,
    client_claims: clientClaims,
    evidence_briefs: items
      .filter((item) => item.item_type === "evidence_brief")
      .map((item) => ({
        title: item.title_snapshot,
        claim_family: item.claim_family,
      })),
    review_items: items
      .filter((item) => item.item_type === "review_item")
      .map((item) => ({
        title: item.title_snapshot,
        claim_family: item.claim_family,
      })),
    evidence_alerts: items
      .filter((item) => item.item_type === "evidence_alert")
      .map((item) => ({
        title: item.title_snapshot,
        claim_family: item.claim_family,
      })),
  };
}

function buildSourceCounts(digest: PrivacySafeEvidenceMindDigest): Record<string, number> {
  return {
    watchlists_checked_count: digest.watchlists_checked_count,
    new_alerts_count: digest.new_alerts_count,
    review_items_count: digest.review_items_count,
    briefs_count: digest.briefs_count,
    affected_claim_families_count: digest.affected_claim_families_count,
    affected_client_claims_count: digest.affected_client_claims_count,
  };
}

function deriveConfidenceLevel(
  digest: PrivacySafeEvidenceMindDigest,
  items: PrivacySafeEvidenceMindDigestItem[]
): WatchtowerNarrativeConfidenceLevel {
  const sourceTypes = new Set(items.map((item) => item.item_type));
  const hasMultipleSources = sourceTypes.size >= 2;
  const hasActivity =
    digest.new_alerts_count > 0 ||
    digest.review_items_count > 0 ||
    digest.briefs_count > 0;

  if (hasActivity && hasMultipleSources && items.length >= 3) {
    return "high";
  }

  if (hasActivity && items.length >= 1) {
    return "medium";
  }

  return "low";
}

function buildWhatChangedText(
  digest: PrivacySafeEvidenceMindDigest,
  items: PrivacySafeEvidenceMindDigestItem[]
): string {
  const claimFamilies = collectClaimFamilies(items);
  const clientClaims = collectClientClaims(items);
  const briefTitles = items
    .filter((item) => item.item_type === "evidence_brief")
    .map((item) => item.title_snapshot);
  const reviewTitles = items
    .filter((item) => item.item_type === "review_item")
    .map((item) => item.title_snapshot);
  const alertTitles = items
    .filter((item) => item.item_type === "evidence_alert")
    .map((item) => item.title_snapshot);

  const parts: string[] = [];

  if (digest.watchlists_checked_count > 0) {
    parts.push(
      `${digest.watchlists_checked_count} watchlist(s) were checked during the digest period.`
    );
  }

  if (digest.new_alerts_count > 0) {
    parts.push(
      `${digest.new_alerts_count} new evidence alert(s) were recorded${alertTitles.length > 0 ? `, including "${alertTitles[0]}"` : ""}.`
    );
  }

  if (digest.review_items_count > 0) {
    parts.push(
      `${digest.review_items_count} review queue item(s) were captured${reviewTitles.length > 0 ? `, including "${reviewTitles[0]}"` : ""}.`
    );
  }

  if (digest.briefs_count > 0) {
    parts.push(
      `${digest.briefs_count} evidence change brief(s) were included${briefTitles.length > 0 ? `, including "${briefTitles[0]}"` : ""}.`
    );
  }

  if (claimFamilies.length > 0) {
    parts.push(
      `Affected claim families: ${claimFamilies.map((family) => humanizeRisk(family)).join(", ")}.`
    );
  }

  if (clientClaims.length > 0) {
    parts.push(`${clientClaims.length} mapped client claim(s) appear in the digest snapshots.`);
  }

  if (parts.length === 0) {
    return "No new watchtower activity was recorded for this digest period based on stored digest snapshots.";
  }

  return parts.join(" ");
}

function buildWhyItMattersText(
  digest: PrivacySafeEvidenceMindDigest,
  riskPosture: WatchtowerNarrativeRiskPosture,
  claimFamilies: string[]
): string {
  const familySummary =
    claimFamilies.length > 0
      ? `The digest references ${claimFamilies.length} claim famil${claimFamilies.length === 1 ? "y" : "ies"} that may require operator attention.`
      : "No specific claim families were identified in the digest snapshots.";

  switch (riskPosture) {
    case "material_change":
      return `Stored evidence signals suggest a material change in support for monitored claims. ${familySummary} This does not prove or disprove any claim; it indicates the watchtower detected evidence that may affect claim wording or review priority.`;
    case "elevated":
      return `The digest's highest recorded risk implication is "${humanizeRisk(digest.highest_risk_implication)}". ${familySummary} Operators should treat this as elevated monitoring priority based on stored alerts, briefs, and review items — not as a final legal or medical determination.`;
    case "monitor":
      return `Activity remains within a monitor posture. ${familySummary} Continue routine review without assuming claims are proven or disproven by this digest alone.`;
    case "stable":
      return `No significant new watchtower activity was recorded for this period. ${familySummary} Continue routine monitoring; absence of alerts in this digest does not guarantee future stability.`;
    default:
      return `${familySummary} Risk posture is uncertain from stored digest data alone; use operator review before changing claim language or external messaging.`;
  }
}

function buildRecommendedNextActionText(riskPosture: WatchtowerNarrativeRiskPosture): string {
  switch (riskPosture) {
    case "material_change":
      return "Review affected client claims and pause or revise wording where stored evidence no longer supports current language. Escalate to subject-matter review if needed.";
    case "elevated":
      return "Prioritize review of affected claim families and confirm whether wording updates or additional evidence checks are required.";
    case "monitor":
      return "Continue monitoring affected claim families and re-check after the next watch cycle or digest period.";
    case "stable":
      return "No immediate action required. Continue routine watchtower monitoring and generate the next digest on schedule.";
    default:
      return "Review digest item snapshots manually and confirm next steps before changing claims or external messaging.";
  }
}

export function generateWatchtowerNarrativeContent(
  digest: PrivacySafeEvidenceMindDigest,
  items: PrivacySafeEvidenceMindDigestItem[],
  options?: {
    narrativeType?: WatchtowerNarrativeType;
    narrativeVersion?: string;
    generationMethod?: WatchtowerNarrativeGenerationMethod;
    generatedAt?: string;
  }
): GeneratedWatchtowerNarrativeContent {
  const narrativeType = options?.narrativeType ?? DEFAULT_DIGEST_WATCHTOWER_NARRATIVE_TYPE;
  const narrativeVersion = options?.narrativeVersion ?? DIGEST_WATCHTOWER_NARRATIVE_VERSION;
  const generationMethod =
    options?.generationMethod ?? DEFAULT_WATCHTOWER_NARRATIVE_GENERATION_METHOD;
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const riskPosture = mapDigestRiskToNarrativePosture(digest.highest_risk_implication);
  const claimFamilies = collectClaimFamilies(items);
  const sourceCounts = buildSourceCounts(digest);
  const referencedEntities = buildReferencedEntities(digest, items);
  const confidenceLevel = deriveConfidenceLevel(digest, items);

  const summaryText = `Watchtower interpretation for "${digest.digest_title}": ${digest.digest_summary} Current risk posture: ${humanizeRisk(riskPosture)}. This narrative is evidence-constrained and based only on stored digest snapshots — not on external medical advice or unverified citations.`;

  return {
    narrative_type: narrativeType,
    narrative_version: narrativeVersion,
    title: `Watchtower Narrative — ${digest.digest_title}`,
    summary_text: summaryText,
    what_changed_text: buildWhatChangedText(digest, items),
    why_it_matters_text: buildWhyItMattersText(digest, riskPosture, claimFamilies),
    operator_focus_text: digest.recommended_focus,
    recommended_next_action_text: buildRecommendedNextActionText(riskPosture),
    risk_posture: riskPosture,
    confidence_level: confidenceLevel,
    source_counts_json: sourceCounts,
    referenced_entities_json: referencedEntities,
    generation_method: generationMethod,
    generated_at: generatedAt,
  };
}

function collectNarrativeKeyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectNarrativeKeyPaths(entry, prefix ? `${prefix}[${index}]` : `[${index}]`)
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...collectNarrativeKeyPaths(entry, path)];
  });
}

export function isPrivacySafeWatchtowerNarrativeContent(
  narrative: Record<string, unknown>
): boolean {
  const serialized = JSON.stringify(narrative).toLowerCase();
  if (FORBIDDEN_NARRATIVE_KEY_FRAGMENTS.some((fragment) => serialized.includes(fragment))) {
    return false;
  }

  const forbiddenKeys = collectNarrativeKeyPaths(narrative).filter((path) => {
    const normalized = path.toLowerCase();
    return FORBIDDEN_NARRATIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
  });

  return forbiddenKeys.length === 0;
}

export function watchtowerNarrativeGenerationErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_mind_watchtower_narratives_table_missing":
      return "The evidence_mind_watchtower_narratives table is missing. Apply the Phase 35 migration in Supabase.";
    case "forbidden":
      return "You do not have access to generate narratives in this workspace.";
    case "digest_not_found":
      return "Evidence Mind digest not found.";
    case "required_fields_missing":
      return "Required narrative fields are missing.";
    case "duplicate_active_narrative":
      return "A watchtower narrative already exists for this digest.";
    case "narrative_not_privacy_safe":
      return "Generated watchtower narrative failed privacy validation.";
    default:
      return `Unable to generate watchtower narrative: ${error}`;
  }
}

export async function generateWatchtowerNarrativeFromDigest(
  digestId: string,
  access: ReviewQueueAccessContext,
  options?: { skipDuplicateCheck?: boolean }
): Promise<WatchtowerNarrativeGenerationResult> {
  const narrativeType = DEFAULT_DIGEST_WATCHTOWER_NARRATIVE_TYPE;
  const narrativeVersion = DIGEST_WATCHTOWER_NARRATIVE_VERSION;

  const digestResult = await getEvidenceMindDigestById(digestId, access);
  if (digestResult.error === "forbidden") {
    return {
      ok: false,
      error: "forbidden",
      message: watchtowerNarrativeGenerationErrorMessage("forbidden"),
    };
  }

  if (!digestResult.digest) {
    return {
      ok: false,
      error: "digest_not_found",
      message: watchtowerNarrativeGenerationErrorMessage("digest_not_found"),
    };
  }

  if (!options?.skipDuplicateCheck) {
    const existing = await findWatchtowerNarrativeForDigest(
      digestId,
      narrativeType,
      narrativeVersion,
      access
    );
    if (existing.narrative) {
      return { ok: true, narrative: existing.narrative, duplicate_skipped: true };
    }
  }

  const itemsResult = await listEvidenceMindDigestItemsForDigest(digestId, access);
  if (itemsResult.error && itemsResult.error !== "forbidden") {
    return {
      ok: false,
      error: itemsResult.error,
      message: watchtowerNarrativeGenerationErrorMessage(itemsResult.error),
    };
  }

  const content = generateWatchtowerNarrativeContent(digestResult.digest, itemsResult.items);
  const candidate = {
    ...content,
    workspace_id: digestResult.digest.workspace_id,
    digest_id: digestId,
    claim_family: null,
  };

  if (!isPrivacySafeWatchtowerNarrativeContent(candidate as unknown as Record<string, unknown>)) {
    return {
      ok: false,
      error: "narrative_not_privacy_safe",
      message: watchtowerNarrativeGenerationErrorMessage("narrative_not_privacy_safe"),
    };
  }

  const createResult = await createWatchtowerNarrative(
    {
      workspace_id: digestResult.digest.workspace_id,
      digest_id: digestId,
      claim_family: null,
      ...content,
    },
    access
  );

  if (!createResult.ok) {
    if (createResult.error === "duplicate_active_narrative" && !options?.skipDuplicateCheck) {
      const existing = await findWatchtowerNarrativeForDigest(
        digestId,
        narrativeType,
        narrativeVersion,
        access
      );
      if (existing.narrative) {
        return { ok: true, narrative: existing.narrative, duplicate_skipped: true };
      }
    }

    return {
      ok: false,
      error: createResult.error,
      message: watchtowerNarrativeGenerationErrorMessage(createResult.error),
    };
  }

  const diffResult = await generateAndStoreWatchtowerNarrativeDiffForNarrative({
    currentNarrative: createResult.narrative,
    access,
  });

  if (!diffResult.ok) {
    return {
      ok: true,
      narrative: createResult.narrative,
      diff_warning: {
        error: diffResult.error,
        message: watchtowerNarrativeDiffGenerationErrorMessage(diffResult.error),
      },
    };
  }

  return {
    ok: true,
    narrative: createResult.narrative,
    watchtower_narrative_diff_result: {
      diff_id: diffResult.diff.id,
      ...(diffResult.duplicate_skipped ? { duplicate_skipped: true } : {}),
    },
  };
}

export async function getLatestWatchtowerNarrativeForDigest(
  digestId: string,
  access: ReviewQueueAccessContext
): Promise<PrivacySafeWatchtowerNarrative | null> {
  const existing = await findWatchtowerNarrativeForDigest(
    digestId,
    DEFAULT_DIGEST_WATCHTOWER_NARRATIVE_TYPE,
    DIGEST_WATCHTOWER_NARRATIVE_VERSION,
    access
  );

  return existing.narrative;
}

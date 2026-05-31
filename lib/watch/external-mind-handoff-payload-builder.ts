import {
  MIND_DIGEST_HANDOFF_PAYLOAD_VERSION,
  type ExternalMindHandoffDestination,
  type ExternalMindHandoffType,
} from "@/lib/review/external-mind-handoff-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import type {
  PrivacySafeEvidenceMindDigest,
  PrivacySafeEvidenceMindDigestItem,
} from "@/lib/watch/evidence-mind-digest-store";

export type MindDigestHandoffPayloadItem = {
  item_type: string;
  claim_family: string | null;
  client_claim_id: string | null;
  title_snapshot: string;
  summary_snapshot: string | null;
  risk_implication: string | null;
  recommended_action: string | null;
};

export type MindDigestHandoffReferencedItem = {
  item_ref_id: string;
  claim_family: string | null;
  title_snapshot: string;
};

export type MindDigestHandoffPayloadV1 = {
  payload_version: typeof MIND_DIGEST_HANDOFF_PAYLOAD_VERSION;
  workspace_id: string;
  digest_id: string;
  handoff_type: ExternalMindHandoffType;
  destination: ExternalMindHandoffDestination;
  period_start: string;
  period_end: string;
  digest_title: string;
  digest_summary: string;
  highest_risk_implication: string;
  recommended_focus: string;
  counts: {
    watchlists_checked_count: number;
    new_alerts_count: number;
    review_items_count: number;
    briefs_count: number;
    affected_claim_families_count: number;
    affected_client_claims_count: number;
  };
  items: MindDigestHandoffPayloadItem[];
  affected_claim_families: string[];
  affected_client_claims: string[];
  referenced_evidence_briefs: MindDigestHandoffReferencedItem[];
  referenced_review_items: MindDigestHandoffReferencedItem[];
  generated_at: string;
  source_system: "lucient_evidence_mind";
  phase: typeof CURRENT_WATCH_PHASE;
};

const FORBIDDEN_PAYLOAD_KEY_FRAGMENTS = [
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

function collectPayloadKeyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectPayloadKeyPaths(entry, prefix ? `${prefix}[${index}]` : `[${index}]`)
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...collectPayloadKeyPaths(entry, path)];
  });
}

export function buildMindDigestHandoffPayload(
  digest: PrivacySafeEvidenceMindDigest,
  items: PrivacySafeEvidenceMindDigestItem[],
  options?: {
    handoffType?: ExternalMindHandoffType;
    destination?: ExternalMindHandoffDestination;
    generatedAt?: string;
  }
): MindDigestHandoffPayloadV1 {
  const claimFamilies = new Set<string>();
  const clientClaims = new Set<string>();

  for (const item of items) {
    if (item.claim_family) {
      claimFamilies.add(item.claim_family);
    }
    if (item.client_claim_id) {
      clientClaims.add(item.client_claim_id);
    }
  }

  const payloadItems: MindDigestHandoffPayloadItem[] = items.map((item) => ({
    item_type: item.item_type,
    claim_family: item.claim_family,
    client_claim_id: item.client_claim_id,
    title_snapshot: item.title_snapshot,
    summary_snapshot: item.summary_snapshot,
    risk_implication: item.risk_implication,
    recommended_action: item.recommended_action,
  }));

  const referencedEvidenceBriefs = items
    .filter((item) => item.item_type === "evidence_brief" && item.item_ref_id)
    .map((item) => ({
      item_ref_id: item.item_ref_id as string,
      claim_family: item.claim_family,
      title_snapshot: item.title_snapshot,
    }));

  const referencedReviewItems = items
    .filter((item) => item.item_type === "review_item" && item.item_ref_id)
    .map((item) => ({
      item_ref_id: item.item_ref_id as string,
      claim_family: item.claim_family,
      title_snapshot: item.title_snapshot,
    }));

  return {
    payload_version: MIND_DIGEST_HANDOFF_PAYLOAD_VERSION,
    workspace_id: digest.workspace_id,
    digest_id: digest.id,
    handoff_type: options?.handoffType ?? "digest_summary",
    destination: options?.destination ?? "test_sink",
    period_start: digest.period_start,
    period_end: digest.period_end,
    digest_title: digest.digest_title,
    digest_summary: digest.digest_summary,
    highest_risk_implication: digest.highest_risk_implication,
    recommended_focus: digest.recommended_focus,
    counts: {
      watchlists_checked_count: digest.watchlists_checked_count,
      new_alerts_count: digest.new_alerts_count,
      review_items_count: digest.review_items_count,
      briefs_count: digest.briefs_count,
      affected_claim_families_count: digest.affected_claim_families_count,
      affected_client_claims_count: digest.affected_client_claims_count,
    },
    items: payloadItems,
    affected_claim_families: [...claimFamilies].sort(),
    affected_client_claims: [...clientClaims].sort(),
    referenced_evidence_briefs: referencedEvidenceBriefs,
    referenced_review_items: referencedReviewItems,
    generated_at: options?.generatedAt ?? new Date().toISOString(),
    source_system: "lucient_evidence_mind",
    phase: CURRENT_WATCH_PHASE,
  };
}

export function isPrivacySafeMindDigestHandoffPayload(payload: Record<string, unknown>): boolean {
  const keyPaths = collectPayloadKeyPaths(payload);
  const forbidden = keyPaths.filter((path) => {
    const normalized = path.toLowerCase();
    return FORBIDDEN_PAYLOAD_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
  });

  return forbidden.length === 0;
}

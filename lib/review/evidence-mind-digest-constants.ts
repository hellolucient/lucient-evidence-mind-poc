export const EVIDENCE_MIND_DIGEST_STATUSES = [
  "draft",
  "ready_for_review",
  "reviewed",
  "archived",
] as const;

export type EvidenceMindDigestStatus = (typeof EVIDENCE_MIND_DIGEST_STATUSES)[number];

export const DIGEST_HIGHEST_RISK_VALUES = [
  "none",
  "monitor",
  "wording_review_recommended",
  "escalation_recommended",
  "claim_not_supported",
  "unknown",
] as const;

export type DigestHighestRiskImplication = (typeof DIGEST_HIGHEST_RISK_VALUES)[number];

export const DIGEST_ITEM_TYPES = [
  "evidence_brief",
  "review_item",
  "evidence_alert",
  "client_claim",
  "claim_family",
] as const;

export type DigestItemType = (typeof DIGEST_ITEM_TYPES)[number];

export function isSupportedEvidenceMindDigestStatus(
  value: string
): value is EvidenceMindDigestStatus {
  return (EVIDENCE_MIND_DIGEST_STATUSES as readonly string[]).includes(value);
}

export function isSupportedDigestHighestRiskImplication(
  value: string
): value is DigestHighestRiskImplication {
  return (DIGEST_HIGHEST_RISK_VALUES as readonly string[]).includes(value);
}

export function isSupportedDigestItemType(value: string): value is DigestItemType {
  return (DIGEST_ITEM_TYPES as readonly string[]).includes(value);
}

export const DIGEST_GENERATION_SOURCES = ["manual", "scheduled"] as const;

export type DigestGenerationSource = (typeof DIGEST_GENERATION_SOURCES)[number];

export function isSupportedDigestGenerationSource(
  value: string
): value is DigestGenerationSource {
  return (DIGEST_GENERATION_SOURCES as readonly string[]).includes(value);
}

export const DEMO_WORKSPACE_ID = "demo-workspace-spa-menu" as const;
export const DEMO_DIGEST_PERIOD_DAYS = 7 as const;

/** Workspaces included in scheduled digest generation for the POC. */
export const SCHEDULED_DIGEST_WORKSPACE_IDS = [DEMO_WORKSPACE_ID] as const;

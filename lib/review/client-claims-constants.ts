export const CLIENT_CLAIM_STATUSES = ["active", "paused", "archived"] as const;

export type ClientClaimStatus = (typeof CLIENT_CLAIM_STATUSES)[number];

export const CLIENT_CLAIM_SOURCE_TYPES = [
  "spa_menu",
  "product_description",
  "website",
  "social_post",
  "marketing_copy",
  "internal_note",
  "other",
] as const;

export type ClientClaimSourceType = (typeof CLIENT_CLAIM_SOURCE_TYPES)[number];

export const CLIENT_CLAIM_RISK_LEVELS = ["low", "medium", "high", "unknown"] as const;

export type ClientClaimRiskLevel = (typeof CLIENT_CLAIM_RISK_LEVELS)[number];

export function isSupportedClientClaimStatus(value: string): value is ClientClaimStatus {
  return CLIENT_CLAIM_STATUSES.includes(value as ClientClaimStatus);
}

export function isSupportedClientClaimSourceType(
  value: string | null | undefined
): value is ClientClaimSourceType | null {
  if (!value) {
    return true;
  }

  return CLIENT_CLAIM_SOURCE_TYPES.includes(value as ClientClaimSourceType);
}

export function isSupportedClientClaimRiskLevel(
  value: string | null | undefined
): value is ClientClaimRiskLevel | null {
  if (!value) {
    return true;
  }

  return CLIENT_CLAIM_RISK_LEVELS.includes(value as ClientClaimRiskLevel);
}

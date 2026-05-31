export const MAPPING_STATUSES = ["active", "paused", "archived"] as const;
export type MappingStatus = (typeof MAPPING_STATUSES)[number];

export const MAPPING_SOURCES = [
  "manual",
  "system_suggested",
  "imported",
  "seeded",
] as const;
export type MappingSource = (typeof MAPPING_SOURCES)[number];

export const MAPPING_CONFIDENCE_LEVELS = ["high", "medium", "low", "unknown"] as const;
export type MappingConfidence = (typeof MAPPING_CONFIDENCE_LEVELS)[number];

export const CLAIM_FAMILY_PROFILE_STATUSES = ["active", "paused", "archived"] as const;
export type ClaimFamilyProfileStatus = (typeof CLAIM_FAMILY_PROFILE_STATUSES)[number];

export function isSupportedMappingStatus(value: string): value is MappingStatus {
  return (MAPPING_STATUSES as readonly string[]).includes(value);
}

export function isSupportedMappingSource(value: string): value is MappingSource {
  return (MAPPING_SOURCES as readonly string[]).includes(value);
}

export function isSupportedMappingConfidence(
  value: string | null | undefined
): value is MappingConfidence {
  if (!value) {
    return false;
  }
  return (MAPPING_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export function isSupportedClaimFamilyProfileStatus(
  value: string
): value is ClaimFamilyProfileStatus {
  return (CLAIM_FAMILY_PROFILE_STATUSES as readonly string[]).includes(value);
}

import {
  CLAIM_FAMILY_PROFILES_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedClaimFamilyProfileStatus,
  type ClaimFamilyProfileStatus,
} from "@/lib/review/claim-mapping-constants";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ClaimFamilyProfileRow = {
  claim_family: string;
  display_name: string;
  description: string | null;
  default_watchlist_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeClaimFamilyProfile = {
  claim_family: string;
  display_name: string;
  description: string | null;
  default_watchlist_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ClaimFamilyProfileListResult = {
  profiles: PrivacySafeClaimFamilyProfile[];
  error?: string;
};

export const CLAIM_FAMILY_PROFILE_DISPLAY_FIELDS = [
  "claim_family",
  "display_name",
  "description",
  "default_watchlist_id",
  "status",
  "created_at",
  "updated_at",
] as const;

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "claim_family_profiles_table_missing";
  }

  return sanitized;
}

export function isClaimFamilyProfilePersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeClaimFamilyProfile(
  row: ClaimFamilyProfileRow
): PrivacySafeClaimFamilyProfile {
  return {
    claim_family: row.claim_family,
    display_name: row.display_name,
    description: row.description,
    default_watchlist_id: row.default_watchlist_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function isPrivacySafeClaimFamilyProfilePayload(
  profile: Record<string, unknown>
): boolean {
  return CLAIM_FAMILY_PROFILE_DISPLAY_FIELDS.every((field) => field in profile);
}

export async function listClaimFamilyProfiles(options?: {
  status?: ClaimFamilyProfileStatus;
}): Promise<ClaimFamilyProfileListResult> {
  if (!isClaimFamilyProfilePersistenceConfigured()) {
    return { profiles: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    let query = client.from(CLAIM_FAMILY_PROFILES_TABLE).select("*");

    const status = options?.status ?? "active";
    if (status && isSupportedClaimFamilyProfileStatus(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query
      .order("display_name", { ascending: true })
      .limit(100);

    if (error) {
      return { profiles: [], error: normalizeStoreError(error) };
    }

    return {
      profiles: ((data ?? []) as ClaimFamilyProfileRow[]).map(toPrivacySafeClaimFamilyProfile),
    };
  } catch (error) {
    return { profiles: [], error: normalizeStoreError(error) };
  }
}

export async function getClaimFamilyProfile(
  claimFamily: string
): Promise<{ profile: PrivacySafeClaimFamilyProfile | null; error?: string }> {
  if (!isClaimFamilyProfilePersistenceConfigured()) {
    return { profile: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLAIM_FAMILY_PROFILES_TABLE)
      .select("*")
      .eq("claim_family", claimFamily.trim())
      .maybeSingle();

    if (error) {
      return { profile: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { profile: null };
    }

    return {
      profile: toPrivacySafeClaimFamilyProfile(data as ClaimFamilyProfileRow),
    };
  } catch (error) {
    return { profile: null, error: normalizeStoreError(error) };
  }
}

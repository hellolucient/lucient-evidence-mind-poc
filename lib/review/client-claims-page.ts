import {
  type ReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  CLIENT_CLAIM_RISK_LEVELS,
  CLIENT_CLAIM_SOURCE_TYPES,
  CLIENT_CLAIM_STATUSES,
  isSupportedClientClaimStatus,
} from "@/lib/review/client-claims-constants";
import {
  MAPPING_CONFIDENCE_LEVELS,
  MAPPING_STATUSES,
  isSupportedMappingConfidence,
  isSupportedMappingStatus,
  type MappingConfidence,
  type MappingStatus,
} from "@/lib/review/claim-mapping-constants";
import { listClaimFamilyProfiles, type PrivacySafeClaimFamilyProfile } from "@/lib/watch/claim-family-profile-store";
import {
  createClientClaimWatchlistMapping,
  listClientClaimWatchlistMappings,
  updateClientClaimWatchlistMappingStatus,
  type ClientClaimWatchlistMappingInsertInput,
  type PrivacySafeClientClaimWatchlistMapping,
} from "@/lib/watch/client-claim-watchlist-mapping-store";
import {
  createClientClaim,
  isClientClaimsPersistenceConfigured,
  listClientClaims,
  updateClientClaimStatus,
  type ClientClaimListFilters,
  type ClientClaimInsertInput,
  type PrivacySafeClientClaim,
} from "@/lib/watch/client-claims-store";

export type ClientClaimsPageFilters = ClientClaimListFilters;

export type ClientClaimsCreateResult =
  | { ok: true; claim: PrivacySafeClientClaim }
  | { ok: false; error: string; message: string };

export type ClientClaimsStatusUpdateResult =
  | { ok: true; claim: PrivacySafeClientClaim }
  | { ok: false; error: string; message: string };

export type ClientClaimsCreateFlash =
  | { kind: "success" }
  | { kind: "error"; error: string; message: string };

export type ClientClaimsMappingCreateResult =
  | { ok: true; mapping: PrivacySafeClientClaimWatchlistMapping }
  | { ok: false; error: string; message: string };

export type ClientClaimsMappingStatusUpdateResult =
  | { ok: true; mapping: PrivacySafeClientClaimWatchlistMapping }
  | { ok: false; error: string; message: string };

export type ClientClaimsMappingCreateFlash =
  | { kind: "success" }
  | { kind: "error"; error: string; message: string };

export type ClientClaimWithMappings = PrivacySafeClientClaim & {
  mappings: PrivacySafeClientClaimWatchlistMapping[];
};

export type ClientClaimsPageData = {
  configured: boolean;
  filters: ClientClaimsPageFilters;
  claims: ClientClaimWithMappings[];
  claimFamilyProfiles: PrivacySafeClaimFamilyProfile[];
  defaultWorkspaceId: string;
  listError: string | null;
  listErrorMessage: string | null;
  mappingListError: string | null;
  mappingListErrorMessage: string | null;
  createFlash: ClientClaimsCreateFlash | null;
  mappingCreateFlash: ClientClaimsMappingCreateFlash | null;
  statusOptions: readonly string[];
  sourceTypeOptions: readonly string[];
  riskLevelOptions: readonly string[];
  mappingStatusOptions: readonly string[];
  mappingConfidenceOptions: readonly string[];
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export function parseClientClaimsPageFilters(
  params: Record<string, string | string[] | undefined>
): ClientClaimsPageFilters {
  const status = readParam(params, "status");

  return {
    workspace_id: readParam(params, "workspace_id") || undefined,
    status: status && isSupportedClientClaimStatus(status) ? status : undefined,
    claim_family: readParam(params, "claim_family") || undefined,
  };
}

export function parseClientClaimsCreateFlash(
  params: Record<string, string | string[] | undefined>
): ClientClaimsCreateFlash | null {
  if (readParam(params, "create_ok")) {
    return { kind: "success" };
  }

  const error = readParam(params, "create_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "create_error_message") ?? error,
    };
  }

  return null;
}

export function parseClientClaimsMappingCreateFlash(
  params: Record<string, string | string[] | undefined>
): ClientClaimsMappingCreateFlash | null {
  if (readParam(params, "mapping_ok")) {
    return { kind: "success" };
  }

  const error = readParam(params, "mapping_error");
  if (error) {
    return {
      kind: "error",
      error,
      message: readParam(params, "mapping_error_message") ?? error,
    };
  }

  return null;
}

export function clientClaimsErrorMessage(error: string | null | undefined): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "client_claims_table_missing":
      return "The client_claims table is missing. Apply the Phase 26 migration in Supabase.";
    case "forbidden":
      return "Claim is outside your workspace scope.";
    case "duplicate_client_claim_id":
      return "A claim with this client_claim_id already exists in the workspace.";
    case "required_fields_missing":
      return "Workspace, client_claim_id, and claim_text are required.";
    case "unsupported_client_claim_status":
      return "Unsupported claim status.";
    case "unsupported_client_claim_source_type":
      return "Unsupported claim source type.";
    case "unsupported_client_claim_risk_level":
      return "Unsupported risk level.";
    case "client_claim_not_found":
      return "Client claim not found.";
    case "claim_family_profiles_table_missing":
      return "The claim_family_profiles table is missing. Apply the Phase 27 migration in Supabase.";
    case "client_claim_watchlist_mappings_table_missing":
      return "The client_claim_watchlist_mappings table is missing. Apply the Phase 27 migration in Supabase.";
    case "duplicate_mapping":
      return "A mapping for this claim and claim family already exists in the workspace.";
    case "unsupported_mapping_status":
      return "Unsupported mapping status.";
    case "unsupported_mapping_source":
      return "Unsupported mapping source.";
    case "unsupported_mapping_confidence":
      return "Unsupported mapping confidence.";
    case "mapping_not_found":
      return "Claim-to-watchlist mapping not found.";
    case "unsupported_claim_family":
      return "Claim family must be selected from the controlled profile registry.";
    default:
      return `Server error: ${error}`;
  }
}

export async function buildClientClaimsPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<ClientClaimsPageData> {
  const filters = parseClientClaimsPageFilters(params);
  const configured = isClientClaimsPersistenceConfigured();
  const defaultWorkspaceId =
    access.mode === "operator"
      ? (access.workspaceIds[0] ?? "demo-workspace-spa-menu")
      : "demo-workspace-spa-menu";

  if (!configured) {
    return {
      configured: false,
      filters,
      claims: [],
      claimFamilyProfiles: [],
      defaultWorkspaceId,
      listError: "supabase_not_configured",
      listErrorMessage: clientClaimsErrorMessage("supabase_not_configured"),
      mappingListError: "supabase_not_configured",
      mappingListErrorMessage: clientClaimsErrorMessage("supabase_not_configured"),
      createFlash: parseClientClaimsCreateFlash(params),
      mappingCreateFlash: parseClientClaimsMappingCreateFlash(params),
      statusOptions: CLIENT_CLAIM_STATUSES,
      sourceTypeOptions: CLIENT_CLAIM_SOURCE_TYPES,
      riskLevelOptions: CLIENT_CLAIM_RISK_LEVELS,
      mappingStatusOptions: MAPPING_STATUSES,
      mappingConfidenceOptions: MAPPING_CONFIDENCE_LEVELS,
    };
  }

  const [listResult, mappingResult, profileResult] = await Promise.all([
    listClientClaims(access, filters),
    listClientClaimWatchlistMappings(access),
    listClaimFamilyProfiles(),
  ]);

  const mappingsByClaimKey = new Map<string, PrivacySafeClientClaimWatchlistMapping[]>();
  for (const mapping of mappingResult.mappings) {
    const key = `${mapping.workspace_id}:${mapping.client_claim_id}`;
    const existing = mappingsByClaimKey.get(key) ?? [];
    existing.push(mapping);
    mappingsByClaimKey.set(key, existing);
  }

  const claimsWithMappings: ClientClaimWithMappings[] = listResult.claims.map((claim) => ({
    ...claim,
    mappings:
      mappingsByClaimKey.get(`${claim.workspace_id}:${claim.client_claim_id}`) ?? [],
  }));

  return {
    configured: true,
    filters,
    claims: claimsWithMappings,
    claimFamilyProfiles: profileResult.profiles,
    defaultWorkspaceId,
    listError: listResult.error ?? null,
    listErrorMessage: clientClaimsErrorMessage(listResult.error),
    mappingListError: mappingResult.error ?? null,
    mappingListErrorMessage: clientClaimsErrorMessage(mappingResult.error),
    createFlash: parseClientClaimsCreateFlash(params),
    mappingCreateFlash: parseClientClaimsMappingCreateFlash(params),
    statusOptions: CLIENT_CLAIM_STATUSES,
    sourceTypeOptions: CLIENT_CLAIM_SOURCE_TYPES,
    riskLevelOptions: CLIENT_CLAIM_RISK_LEVELS,
    mappingStatusOptions: MAPPING_STATUSES,
    mappingConfidenceOptions: MAPPING_CONFIDENCE_LEVELS,
  };
}

export function parseClientClaimCreateFormData(formData: FormData): ClientClaimInsertInput {
  const sourceType = String(formData.get("claim_source_type") ?? "").trim();
  const riskLevel = String(formData.get("risk_level") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();

  return {
    workspace_id: String(formData.get("workspace_id") ?? "").trim(),
    client_claim_id: String(formData.get("client_claim_id") ?? "").trim(),
    claim_text: String(formData.get("claim_text") ?? "").trim(),
    claim_source_type: sourceType ? (sourceType as ClientClaimInsertInput["claim_source_type"]) : null,
    claim_source_label: String(formData.get("claim_source_label") ?? "").trim() || null,
    source_url: String(formData.get("source_url") ?? "").trim() || null,
    claim_family: String(formData.get("claim_family") ?? "").trim() || null,
    risk_level: riskLevel ? (riskLevel as ClientClaimInsertInput["risk_level"]) : null,
    status: (isSupportedClientClaimStatus(status) ? status : "active") as ClientClaimInsertInput["status"],
  };
}

export function buildClientClaimsCreateRedirectPath(options: {
  returnQuery: string;
  result: ClientClaimsCreateResult;
}): string {
  const params = new URLSearchParams(options.returnQuery);
  params.delete("create_ok");
  params.delete("create_error");
  params.delete("create_error_message");

  if (options.result.ok) {
    params.set("create_ok", "1");
  } else {
    params.set("create_error", options.result.error);
    params.set("create_error_message", options.result.message);
  }

  const query = params.toString();
  return query ? `/client-claims?${query}` : "/client-claims";
}

export async function processClientClaimCreateSubmission(
  formData: FormData,
  access: ReviewQueueAccessContext
): Promise<{ redirectPath: string; result: ClientClaimsCreateResult }> {
  const returnQuery = String(formData.get("return_query") ?? "").trim();
  const input = parseClientClaimCreateFormData(formData);

  if (!input.workspace_id || !input.client_claim_id || !input.claim_text) {
    const result: ClientClaimsCreateResult = {
      ok: false,
      error: "required_fields_missing",
      message: clientClaimsErrorMessage("required_fields_missing") ?? "Required fields missing.",
    };
    return {
      result,
      redirectPath: buildClientClaimsCreateRedirectPath({ returnQuery, result }),
    };
  }

  const storeResult = await createClientClaim(input, access);
  const result: ClientClaimsCreateResult = storeResult.ok
    ? storeResult
    : {
        ok: false,
        error: storeResult.error,
        message: clientClaimsErrorMessage(storeResult.error) ?? storeResult.error,
      };

  return {
    result,
    redirectPath: buildClientClaimsCreateRedirectPath({ returnQuery, result }),
  };
}

export function parseClientClaimStatusFormData(formData: FormData): {
  workspaceId: string;
  clientClaimId: string;
  status: string;
  returnQuery: string;
} {
  return {
    workspaceId: String(formData.get("workspace_id") ?? "").trim(),
    clientClaimId: String(formData.get("client_claim_id") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    returnQuery: String(formData.get("return_query") ?? "").trim(),
  };
}

export function buildClientClaimsStatusRedirectPath(options: {
  returnQuery: string;
  result: ClientClaimsStatusUpdateResult;
}): string {
  const params = new URLSearchParams(options.returnQuery);
  params.delete("status_ok");
  params.delete("status_error");
  params.delete("status_error_message");

  if (options.result.ok) {
    params.set("status_ok", "1");
  } else {
    params.set("status_error", options.result.error);
    params.set("status_error_message", options.result.message);
  }

  const query = params.toString();
  return query ? `/client-claims?${query}` : "/client-claims";
}

export async function processClientClaimStatusSubmission(
  formData: FormData,
  access: ReviewQueueAccessContext
): Promise<{ redirectPath: string; result: ClientClaimsStatusUpdateResult }> {
  const parsed = parseClientClaimStatusFormData(formData);
  const returnQuery = parsed.returnQuery;

  if (!parsed.workspaceId || !parsed.clientClaimId || !parsed.status) {
    const result: ClientClaimsStatusUpdateResult = {
      ok: false,
      error: "required_fields_missing",
      message: "Workspace, client_claim_id, and status are required.",
    };
    return {
      result,
      redirectPath: buildClientClaimsStatusRedirectPath({ returnQuery, result }),
    };
  }

  if (!isSupportedClientClaimStatus(parsed.status)) {
    const result: ClientClaimsStatusUpdateResult = {
      ok: false,
      error: "unsupported_client_claim_status",
      message: clientClaimsErrorMessage("unsupported_client_claim_status") ?? "Unsupported status.",
    };
    return {
      result,
      redirectPath: buildClientClaimsStatusRedirectPath({ returnQuery, result }),
    };
  }

  const storeResult = await updateClientClaimStatus(
    parsed.workspaceId,
    parsed.clientClaimId,
    parsed.status,
    access
  );
  const result: ClientClaimsStatusUpdateResult = storeResult.ok
    ? storeResult
    : {
        ok: false,
        error: storeResult.error,
        message: clientClaimsErrorMessage(storeResult.error) ?? storeResult.error,
      };

  return {
    result,
    redirectPath: buildClientClaimsStatusRedirectPath({ returnQuery, result }),
  };
}

export function parseClientClaimMappingCreateFormData(
  formData: FormData
): ClientClaimWatchlistMappingInsertInput {
  const confidence = String(formData.get("mapping_confidence") ?? "").trim();
  const status = String(formData.get("mapping_status") ?? "active").trim();

  return {
    workspace_id: String(formData.get("workspace_id") ?? "").trim(),
    client_claim_id: String(formData.get("client_claim_id") ?? "").trim(),
    claim_family: String(formData.get("claim_family") ?? "").trim(),
    watchlist_id: String(formData.get("watchlist_id") ?? "").trim() || null,
    mapping_status: (isSupportedMappingStatus(status) ? status : "active") as MappingStatus,
    mapping_confidence: confidence
      ? ((isSupportedMappingConfidence(confidence)
          ? confidence
          : null) as MappingConfidence | null)
      : null,
    mapping_source: "manual",
  };
}

export function buildClientClaimsMappingCreateRedirectPath(options: {
  returnQuery: string;
  result: ClientClaimsMappingCreateResult;
}): string {
  const params = new URLSearchParams(options.returnQuery);
  params.delete("mapping_ok");
  params.delete("mapping_error");
  params.delete("mapping_error_message");

  if (options.result.ok) {
    params.set("mapping_ok", "1");
  } else {
    params.set("mapping_error", options.result.error);
    params.set("mapping_error_message", options.result.message);
  }

  const query = params.toString();
  return query ? `/client-claims?${query}` : "/client-claims";
}

export async function processClientClaimMappingCreateSubmission(
  formData: FormData,
  access: ReviewQueueAccessContext,
  knownClaimFamilies: readonly string[]
): Promise<{ redirectPath: string; result: ClientClaimsMappingCreateResult }> {
  const returnQuery = String(formData.get("return_query") ?? "").trim();
  const input = parseClientClaimMappingCreateFormData(formData);

  if (!input.workspace_id || !input.client_claim_id || !input.claim_family) {
    const result: ClientClaimsMappingCreateResult = {
      ok: false,
      error: "required_fields_missing",
      message: "Workspace, client_claim_id, and claim family are required.",
    };
    return {
      result,
      redirectPath: buildClientClaimsMappingCreateRedirectPath({ returnQuery, result }),
    };
  }

  if (!knownClaimFamilies.includes(input.claim_family)) {
    const result: ClientClaimsMappingCreateResult = {
      ok: false,
      error: "unsupported_claim_family",
      message:
        clientClaimsErrorMessage("unsupported_claim_family") ??
        "Claim family must be selected from the controlled profile registry.",
    };
    return {
      result,
      redirectPath: buildClientClaimsMappingCreateRedirectPath({ returnQuery, result }),
    };
  }

  const storeResult = await createClientClaimWatchlistMapping(input, access);
  const result: ClientClaimsMappingCreateResult = storeResult.ok
    ? storeResult
    : {
        ok: false,
        error: storeResult.error,
        message: clientClaimsErrorMessage(storeResult.error) ?? storeResult.error,
      };

  return {
    result,
    redirectPath: buildClientClaimsMappingCreateRedirectPath({ returnQuery, result }),
  };
}

export function parseClientClaimMappingStatusFormData(formData: FormData): {
  workspaceId: string;
  clientClaimId: string;
  claimFamily: string;
  mappingStatus: string;
  returnQuery: string;
} {
  return {
    workspaceId: String(formData.get("workspace_id") ?? "").trim(),
    clientClaimId: String(formData.get("client_claim_id") ?? "").trim(),
    claimFamily: String(formData.get("claim_family") ?? "").trim(),
    mappingStatus: String(formData.get("mapping_status") ?? "").trim(),
    returnQuery: String(formData.get("return_query") ?? "").trim(),
  };
}

export function buildClientClaimsMappingStatusRedirectPath(options: {
  returnQuery: string;
  result: ClientClaimsMappingStatusUpdateResult;
}): string {
  const params = new URLSearchParams(options.returnQuery);
  params.delete("mapping_status_ok");
  params.delete("mapping_status_error");
  params.delete("mapping_status_error_message");

  if (options.result.ok) {
    params.set("mapping_status_ok", "1");
  } else {
    params.set("mapping_status_error", options.result.error);
    params.set("mapping_status_error_message", options.result.message);
  }

  const query = params.toString();
  return query ? `/client-claims?${query}` : "/client-claims";
}

export async function processClientClaimMappingStatusSubmission(
  formData: FormData,
  access: ReviewQueueAccessContext
): Promise<{ redirectPath: string; result: ClientClaimsMappingStatusUpdateResult }> {
  const parsed = parseClientClaimMappingStatusFormData(formData);
  const returnQuery = parsed.returnQuery;

  if (!parsed.workspaceId || !parsed.clientClaimId || !parsed.claimFamily || !parsed.mappingStatus) {
    const result: ClientClaimsMappingStatusUpdateResult = {
      ok: false,
      error: "required_fields_missing",
      message: "Workspace, client_claim_id, claim family, and mapping status are required.",
    };
    return {
      result,
      redirectPath: buildClientClaimsMappingStatusRedirectPath({ returnQuery, result }),
    };
  }

  if (!isSupportedMappingStatus(parsed.mappingStatus)) {
    const result: ClientClaimsMappingStatusUpdateResult = {
      ok: false,
      error: "unsupported_mapping_status",
      message: clientClaimsErrorMessage("unsupported_mapping_status") ?? "Unsupported mapping status.",
    };
    return {
      result,
      redirectPath: buildClientClaimsMappingStatusRedirectPath({ returnQuery, result }),
    };
  }

  const storeResult = await updateClientClaimWatchlistMappingStatus(
    parsed.workspaceId,
    parsed.clientClaimId,
    parsed.claimFamily,
    parsed.mappingStatus,
    access
  );
  const result: ClientClaimsMappingStatusUpdateResult = storeResult.ok
    ? storeResult
    : {
        ok: false,
        error: storeResult.error,
        message: clientClaimsErrorMessage(storeResult.error) ?? storeResult.error,
      };

  return {
    result,
    redirectPath: buildClientClaimsMappingStatusRedirectPath({ returnQuery, result }),
  };
}

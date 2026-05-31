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

export type ClientClaimsPageData = {
  configured: boolean;
  filters: ClientClaimsPageFilters;
  claims: PrivacySafeClientClaim[];
  defaultWorkspaceId: string;
  listError: string | null;
  listErrorMessage: string | null;
  createFlash: ClientClaimsCreateFlash | null;
  statusOptions: readonly string[];
  sourceTypeOptions: readonly string[];
  riskLevelOptions: readonly string[];
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
      defaultWorkspaceId,
      listError: "supabase_not_configured",
      listErrorMessage: clientClaimsErrorMessage("supabase_not_configured"),
      createFlash: parseClientClaimsCreateFlash(params),
      statusOptions: CLIENT_CLAIM_STATUSES,
      sourceTypeOptions: CLIENT_CLAIM_SOURCE_TYPES,
      riskLevelOptions: CLIENT_CLAIM_RISK_LEVELS,
    };
  }

  const listResult = await listClientClaims(access, filters);

  return {
    configured: true,
    filters,
    claims: listResult.claims,
    defaultWorkspaceId,
    listError: listResult.error ?? null,
    listErrorMessage: clientClaimsErrorMessage(listResult.error),
    createFlash: parseClientClaimsCreateFlash(params),
    statusOptions: CLIENT_CLAIM_STATUSES,
    sourceTypeOptions: CLIENT_CLAIM_SOURCE_TYPES,
    riskLevelOptions: CLIENT_CLAIM_RISK_LEVELS,
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

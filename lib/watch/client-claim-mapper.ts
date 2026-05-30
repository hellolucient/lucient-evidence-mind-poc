export type ClientClaimStatus = "active" | "draft" | "archived";

export type ClientClaimRiskLevel = "low" | "medium" | "high";

export type ClientClaimRecord = {
  id: string;
  workspace_id: string;
  claim_text: string;
  claim_context: string;
  source_type: string;
  source_label: string;
  claim_family_id: string;
  status: ClientClaimStatus;
  risk_level: ClientClaimRiskLevel;
  created_at: string;
  updated_at: string;
};

export type ClaimFamilyClientMapping = {
  claim_family_id: string;
  client_claim_id: string;
  workspace_id: string;
};

const DEMO_WORKSPACE_ID = "demo-workspace-spa-menu";

export const DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS: ClientClaimRecord = {
  id: "demo-claim-magnesium-stress-001",
  workspace_id: DEMO_WORKSPACE_ID,
  claim_text:
    "Magnesium therapy helps reduce cortisol and supports stress recovery.",
  claim_context: "Spa menu treatment description for magnesium recovery offering.",
  source_type: "spa_menu_description",
  source_label: "Demo Spa Magnesium Recovery Treatment",
  claim_family_id: "magnesium_cortisol_stress",
  status: "active",
  risk_level: "medium",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
};

const CLIENT_CLAIMS: ClientClaimRecord[] = [DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS];

const CLAIM_FAMILY_MAPPINGS: ClaimFamilyClientMapping[] = [
  {
    claim_family_id: "magnesium_cortisol_stress",
    client_claim_id: DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS.id,
    workspace_id: DEMO_WORKSPACE_ID,
  },
];

const claimsById = new Map(CLIENT_CLAIMS.map((claim) => [claim.id, claim]));

export function listClientClaims(): ClientClaimRecord[] {
  return CLIENT_CLAIMS.map((claim) => ({ ...claim }));
}

export function getClientClaimById(clientClaimId: string): ClientClaimRecord | null {
  const claim = claimsById.get(clientClaimId);
  return claim ? { ...claim } : null;
}

export function findAffectedClientClaimsForClaimFamily(
  claimFamilyId: string
): ClientClaimRecord[] {
  const claimIds = CLAIM_FAMILY_MAPPINGS.filter(
    (mapping) => mapping.claim_family_id === claimFamilyId
  ).map((mapping) => mapping.client_claim_id);

  return claimIds
    .map((claimId) => claimsById.get(claimId))
    .filter((claim): claim is ClientClaimRecord => Boolean(claim))
    .map((claim) => ({ ...claim }));
}

export function listClientClaimsForWorkspace(workspaceId: string): ClientClaimRecord[] {
  return CLIENT_CLAIMS.filter((claim) => claim.workspace_id === workspaceId).map(
    (claim) => ({ ...claim })
  );
}

export function listClaimFamilyMappings(): ClaimFamilyClientMapping[] {
  return CLAIM_FAMILY_MAPPINGS.map((mapping) => ({ ...mapping }));
}

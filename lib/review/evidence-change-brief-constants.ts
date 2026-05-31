export const EVIDENCE_CHANGE_BRIEF_STATUSES = [
  "draft",
  "ready_for_review",
  "reviewed",
  "archived",
] as const;

export type EvidenceChangeBriefStatus = (typeof EVIDENCE_CHANGE_BRIEF_STATUSES)[number];

export const EVIDENCE_SIGNAL_VALUES = [
  "supportive",
  "mixed",
  "weak",
  "contradictory",
  "safety_signal",
  "unclear",
] as const;

export type EvidenceSignalValue = (typeof EVIDENCE_SIGNAL_VALUES)[number];

export const RISK_IMPLICATION_VALUES = [
  "no_change",
  "monitor",
  "wording_review_recommended",
  "escalation_recommended",
  "claim_not_supported",
] as const;

export type RiskImplicationValue = (typeof RISK_IMPLICATION_VALUES)[number];

export function isSupportedEvidenceChangeBriefStatus(
  value: string
): value is EvidenceChangeBriefStatus {
  return (EVIDENCE_CHANGE_BRIEF_STATUSES as readonly string[]).includes(value);
}

export function isSupportedEvidenceSignalValue(value: string): value is EvidenceSignalValue {
  return (EVIDENCE_SIGNAL_VALUES as readonly string[]).includes(value);
}

export function isSupportedRiskImplicationValue(value: string): value is RiskImplicationValue {
  return (RISK_IMPLICATION_VALUES as readonly string[]).includes(value);
}

export const DEMO_MAGNESIUM_CLAIM_FAMILY = "magnesium_cortisol_stress" as const;
export const DEMO_WORKSPACE_ID = "demo-workspace-spa-menu" as const;

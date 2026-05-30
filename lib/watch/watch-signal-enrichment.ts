import type { EvidenceSource } from "@/lib/evidence-stubs";
import {
  aggregateSignalClassifications,
  buildNoMaterialChangeSignalClassification,
  classifyEvidenceSources,
  type EvidenceSignalCategory,
  type EvidenceSignalClassification,
  type TopicSignalClassificationSummary,
} from "./evidence-signal-classifier";

export type SignalClassificationFields = {
  signal_classification:
    | TopicSignalClassificationSummary
    | EvidenceSignalClassification;
  signal: EvidenceSignalCategory;
  evidence_direction: EvidenceSignalClassification["evidence_direction"];
  reason_codes: string[];
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
};

export function buildSignalClassificationFields(
  claimFamilyId: string,
  sources: EvidenceSource[]
): {
  signal_classifications: EvidenceSignalClassification[];
  fields: SignalClassificationFields | null;
} {
  if (sources.length === 0) {
    const none = buildNoMaterialChangeSignalClassification();
    return {
      signal_classifications: [],
      fields: {
        signal_classification: none,
        signal: none.signal,
        evidence_direction: none.evidence_direction,
        reason_codes: none.reason_codes,
        human_review_required: none.human_review_required,
        client_claim_re_review_required: none.client_claim_re_review_required,
      },
    };
  }

  const signal_classifications = classifyEvidenceSources(claimFamilyId, sources);
  const aggregate = aggregateSignalClassifications(signal_classifications);

  if (!aggregate) {
    return { signal_classifications, fields: null };
  }

  return {
    signal_classifications,
    fields: {
      signal_classification: aggregate,
      signal: aggregate.signal,
      evidence_direction: aggregate.evidence_direction,
      reason_codes: aggregate.reason_codes,
      human_review_required: aggregate.human_review_required,
      client_claim_re_review_required: aggregate.client_claim_re_review_required,
    },
  };
}

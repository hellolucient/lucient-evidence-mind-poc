import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const WATCHLIST_TOPICS_TABLE = "watchlist_topics";
const WATCH_RUNS_TABLE = "watch_runs";
const EVIDENCE_ALERTS_TABLE = "evidence_alerts";
const EVIDENCE_REVIEW_ITEMS_TABLE = "evidence_review_items";
const EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE = "evidence_review_item_audit_events";
const EVIDENCE_REVIEW_ITEM_NOTES_TABLE = "evidence_review_item_notes";
const CLIENT_CLAIMS_TABLE = "client_claims";
const CLAIM_FAMILY_PROFILES_TABLE = "claim_family_profiles";
const CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE = "client_claim_watchlist_mappings";
const EVIDENCE_CHANGE_BRIEFS_TABLE = "evidence_change_briefs";
const EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE = "evidence_change_brief_claims";
const EVIDENCE_MIND_DIGESTS_TABLE = "evidence_mind_digests";
const EVIDENCE_MIND_DIGEST_ITEMS_TABLE = "evidence_mind_digest_items";
const EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE = "evidence_mind_watchtower_narratives";
const EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE =
  "evidence_mind_watchtower_narrative_diffs";
const EXTERNAL_MIND_HANDOFFS_TABLE = "external_mind_handoffs";
const EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE = "external_mind_handoff_send_events";
const EXTERNAL_MIND_HANDOFF_RECEIPTS_TABLE = "external_mind_handoff_receipts";
const CLAIM_SOURCE_DOCUMENTS_TABLE = "claim_source_documents";
const CLAIM_EXTRACTION_RUNS_TABLE = "claim_extraction_runs";
const CANDIDATE_WELLNESS_CLAIMS_TABLE = "candidate_wellness_claims";
const WELLNESS_CLAIMS_TABLE = "wellness_claims";
const CLAIM_RESEARCH_RUNS_TABLE = "claim_research_runs";
const CLAIM_RESEARCH_CITATIONS_TABLE = "claim_research_citations";
const SOURCE_INTAKE_DOCUMENTS_TABLE = "source_intake_documents";
const MIND_CLAIM_EXTRACTION_JOBS_TABLE = "mind_claim_extraction_jobs";
const CANDIDATE_CLAIMS_TABLE = "candidate_claims";
const MIND_CLAIM_RISK_BRIEF_JOBS_TABLE = "mind_claim_risk_brief_jobs";
const MIND_CLAIM_RISK_BRIEFS_TABLE = "mind_claim_risk_briefs";
const MIND_CLAIM_INTELLIGENCE_AUDIT_EVENTS_TABLE = "mind_claim_intelligence_audit_events";

export function getSupabaseEnvConfig(): {
  url: string | null;
  serviceRoleKey: string | null;
  hasSupabaseUrl: boolean;
  hasSupabaseServiceRoleKey: boolean;
  supabaseUrlHost: string | null;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  let supabaseUrlHost: string | null = null;
  if (url) {
    try {
      supabaseUrlHost = new URL(url).host;
    } catch {
      supabaseUrlHost = null;
    }
  }

  return {
    url,
    serviceRoleKey,
    hasSupabaseUrl: Boolean(url),
    hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
    supabaseUrlHost,
  };
}

export function createSupabaseServerClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseEnvConfig();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export {
  WATCHLIST_TOPICS_TABLE,
  WATCH_RUNS_TABLE,
  EVIDENCE_ALERTS_TABLE,
  EVIDENCE_REVIEW_ITEMS_TABLE,
  EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE,
  EVIDENCE_REVIEW_ITEM_NOTES_TABLE,
  CLIENT_CLAIMS_TABLE,
  CLAIM_FAMILY_PROFILES_TABLE,
  CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE,
  EVIDENCE_CHANGE_BRIEFS_TABLE,
  EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE,
  EVIDENCE_MIND_DIGESTS_TABLE,
  EVIDENCE_MIND_DIGEST_ITEMS_TABLE,
  EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE,
  EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE,
  EXTERNAL_MIND_HANDOFFS_TABLE,
  EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE,
  EXTERNAL_MIND_HANDOFF_RECEIPTS_TABLE,
  CLAIM_SOURCE_DOCUMENTS_TABLE,
  CLAIM_EXTRACTION_RUNS_TABLE,
  CANDIDATE_WELLNESS_CLAIMS_TABLE,
  WELLNESS_CLAIMS_TABLE,
  CLAIM_RESEARCH_RUNS_TABLE,
  CLAIM_RESEARCH_CITATIONS_TABLE,
  SOURCE_INTAKE_DOCUMENTS_TABLE,
  MIND_CLAIM_EXTRACTION_JOBS_TABLE,
  CANDIDATE_CLAIMS_TABLE,
  MIND_CLAIM_RISK_BRIEF_JOBS_TABLE,
  MIND_CLAIM_RISK_BRIEFS_TABLE,
  MIND_CLAIM_INTELLIGENCE_AUDIT_EVENTS_TABLE,
};

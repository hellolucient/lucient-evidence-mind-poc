import {
  buildPersistenceStatus,
  calculateNextCheckUtc,
  getDueWatchTopics,
  mergeKnownPmids,
  resolveCurrentQueryHash,
  resolveWatchlistStore,
  type StoredLastAlert,
  type StoredLastHeartbeat,
  type WatchlistStore,
  type WatchlistStoreSelection,
  type WatchlistStoreStatus,
  type WatchTopicState,
} from "./watchlist-state";
import { buildWatchCheckResponse, type WatchCheckResponse } from "./watch-check";
import { buildEvidenceAlertCandidates } from "./watch/evidence-alert-store";
import type { PubMedFetchFilters } from "./pubmed-retrieval";

export type RunDueRequestBody = {
  workspace_id?: string;
  force?: boolean;
  dry_run?: boolean;
  max_watches?: number;
  context?: string;
  debug_only?: boolean;
};

export type WatchRunResultStatus = "completed" | "skipped" | "error";

export type WatchRunTopicResult = {
  watch_topic_id: string;
  claim_family: string;
  status: WatchRunResultStatus;
  previous_known_pmids_count: number;
  current_known_pmids_count: number;
  new_pmids: string[];
  query_hash: string;
  query_version: string;
  query_strategy_changed?: boolean;
  previous_query_hash?: string;
  current_query_hash?: string;
  query_strategy_change_recommendation?: string;
  evidence_delta: WatchCheckResponse["evidence_delta"];
  evidence_change_alert: WatchCheckResponse["evidence_change_alert"];
  heartbeat: {
    emitted: boolean;
    summary: string;
    no_material_change: boolean;
  };
  state_update: {
    updated: boolean;
    last_checked_utc: string | null;
    next_check_utc: string | null;
    baseline_pmids_added: string[];
  };
  error_message?: string;
  new_evidence_candidates?: ReturnType<typeof buildEvidenceAlertCandidates>;
};

export type PersistenceWarning = {
  durable: boolean;
  reason: string;
  next_step: string;
};

export type PersistenceStatus = WatchlistStoreStatus;

export type RunDueResponse = {
  run_id: string;
  generated_at: string;
  mode: "scheduled_watch_simulation";
  force: boolean;
  dry_run: boolean;
  watches_found: number;
  watches_run: number;
  watches_skipped: number;
  results: WatchRunTopicResult[];
  privacy_boundary: {
    scheduled_runner_receives: string[];
    scheduled_runner_does_not_receive: string[];
    app_maps_back_to_clients: true;
  };
  persistence_status: PersistenceStatus;
  persistence_warning: PersistenceWarning;
  limitations: string[];
  watch_run_logged?: boolean;
  watch_run_id?: string | null;
};

export type WatchRunFailedResponse = {
  error: "watch_run_failed";
  message: string;
  generated_at: string;
  debug: {
    route: "/api/watch/run-due";
    phase: "11";
    stage: string;
  };
};

const DEFAULT_SCHEDULED_FILTERS: PubMedFetchFilters = {
  source_types: ["pubmed"],
  use_real_pubmed: true,
  max_sources: 5,
  recency_years: 10,
  use_structured_query: true,
};

const RUN_DUE_PERSISTENCE_WARNING_IN_MEMORY: PersistenceWarning = {
  durable: false,
  reason:
    "Current POC store is in-memory only. Vercel serverless memory may reset between invocations.",
  next_step: "Configure Supabase env vars or choose durable persistence provider.",
};

const RUN_DUE_PERSISTENCE_WARNING_SUPABASE: PersistenceWarning = {
  durable: true,
  reason: "Watchlist state is persisted to Supabase watchlist_topics.",
  next_step: "Configure Vercel cron or scheduled trigger for autonomous monitoring.",
};

const RUN_DUE_LIMITATIONS_BASE = [
  "POC scheduler simulation only",
  "No real cron configured yet",
  "No client workspace mapping yet",
  "No non-PubMed regulatory source integration yet",
];

function buildPersistenceWarning(
  selection: WatchlistStoreSelection
): PersistenceWarning {
  if (selection.env_debug.selected_store === "supabase") {
    return RUN_DUE_PERSISTENCE_WARNING_SUPABASE;
  }

  return RUN_DUE_PERSISTENCE_WARNING_IN_MEMORY;
}

function buildRunDueLimitations(selection: WatchlistStoreSelection): string[] {
  if (selection.env_debug.selected_store === "supabase") {
    return [
      ...RUN_DUE_LIMITATIONS_BASE,
      "Phase 11 uses SupabaseWatchlistStore for durable watchlist persistence",
    ];
  }

  return [
    ...RUN_DUE_LIMITATIONS_BASE,
    selection.env_debug.fallback_reason
      ? `Supabase fallback active: ${selection.env_debug.fallback_reason}`
      : "Phase 11 fell back to in-memory WatchlistStore adapter",
  ];
}

const RUN_DUE_PRIVACY_BOUNDARY: RunDueResponse["privacy_boundary"] = {
  scheduled_runner_receives: [
    "watch topic",
    "claim family",
    "query strategy",
    "baseline PMIDs",
    "source metadata",
    "appraisal summary",
  ],
  scheduled_runner_does_not_receive: [
    "client exact wording",
    "client IDs",
    "brand confidential copy",
    "private legal notes",
  ],
  app_maps_back_to_clients: true,
};

function buildSkippedResult(topic: WatchTopicState): WatchRunTopicResult {
  return {
    watch_topic_id: topic.watch_topic_id,
    claim_family: topic.claim_family,
    status: "skipped",
    previous_known_pmids_count: topic.baseline.known_pmids.length,
    current_known_pmids_count: topic.baseline.known_pmids.length,
    new_pmids: [],
    query_hash: topic.query_strategy.query_hash,
    query_version: topic.query_strategy.query_version,
    evidence_delta: {
      change_level: "none",
      direction: "no_change",
      delta_summary: "Watch topic not due for scheduled check.",
      delta_confidence: 1,
      contributing_sources_to_delta: [],
      non_contributing_sources: [],
      alert_reason_codes: ["WATCH_NOT_DUE"],
      alert_threshold_explanation:
        "Scheduled check skipped because next_check_utc is in the future and force=false.",
    },
    evidence_change_alert: {
      alert_required: false,
      alert_type: "none",
      affected_claim_family_id: topic.claim_family,
      affected_workspace_ids_visible_to_mind: false,
      app_should_map_to_private_workspaces: true,
      alert_summary: "Watch not due.",
    },
    heartbeat: {
      emitted: false,
      summary: "Watch not due; no heartbeat emitted.",
      no_material_change: true,
    },
    state_update: {
      updated: false,
      last_checked_utc: topic.last_checked_utc,
      next_check_utc: topic.next_check_utc,
      baseline_pmids_added: [],
    },
  };
}

function buildHeartbeat(
  check: WatchCheckResponse,
  generatedAt: string
): StoredLastHeartbeat {
  const noMaterial =
    !check.evidence_change_alert.alert_required ||
    check.evidence_delta.change_level === "none" ||
    check.evidence_delta.change_level === "minor";

  if (noMaterial) {
    return {
      emitted: true,
      summary:
        "Watch checked successfully. No material evidence change requiring human review.",
      no_material_change: true,
      generated_at: generatedAt,
    };
  }

  return {
    emitted: false,
    summary: "Material alert emitted; heartbeat suppressed.",
    no_material_change: false,
    generated_at: generatedAt,
  };
}

function buildStoredAlert(
  check: WatchCheckResponse,
  generatedAt: string
): StoredLastAlert {
  return {
    alert_type: check.evidence_change_alert.alert_type,
    alert_summary: check.evidence_change_alert.alert_summary,
    generated_at: generatedAt,
    contributing_sources_to_delta: check.evidence_delta.contributing_sources_to_delta,
    evidence_delta_change_level: check.evidence_delta.change_level,
    delta_confidence: check.evidence_delta.delta_confidence,
  };
}

export async function runWatchTopicCheck(
  store: WatchlistStore,
  topic: WatchTopicState,
  workspaceId: string,
  dryRun: boolean,
  filters: PubMedFetchFilters = DEFAULT_SCHEDULED_FILTERS
): Promise<WatchRunTopicResult> {
  const generatedAt = new Date().toISOString();
  const previousKnown = topic.baseline.known_pmids;
  const previousHash = topic.query_strategy.query_hash;
  const currentHash = resolveCurrentQueryHash(topic);
  const queryStrategyChanged = previousHash !== currentHash;

  try {
    const check = await buildWatchCheckResponse(
      workspaceId,
      topic.watch_topic_id,
      topic.claim_family,
      topic.query_strategy.raw_query,
      {
        last_checked_date:
          topic.last_checked_utc?.slice(0, 10) ?? generatedAt.slice(0, 10),
        known_pmids: previousKnown,
        baseline_evidence_grade: topic.baseline.baseline_evidence_grade,
        baseline_policy: topic.baseline.baseline_policy,
      },
      filters
    );

    const { merged, added } =
      check.pubmed_check.status === "success"
        ? mergeKnownPmids(previousKnown, check.pubmed_check.found_pmids)
        : { merged: previousKnown, added: [] as string[] };

    const heartbeat = buildHeartbeat(check, generatedAt);
    const nextCheck = calculateNextCheckUtc(generatedAt, topic.frequency);
    const checkSucceeded = check.pubmed_check.status === "success";

    const result: WatchRunTopicResult = {
      watch_topic_id: topic.watch_topic_id,
      claim_family: topic.claim_family,
      status: checkSucceeded ? "completed" : "error",
      previous_known_pmids_count: previousKnown.length,
      current_known_pmids_count: merged.length,
      new_pmids: check.pubmed_check.new_pmids,
      query_hash: currentHash,
      query_version: topic.query_strategy.query_version,
      evidence_delta: check.evidence_delta,
      evidence_change_alert: check.evidence_change_alert,
      heartbeat: {
        emitted: heartbeat.emitted,
        summary: heartbeat.summary,
        no_material_change: heartbeat.no_material_change,
      },
      state_update: {
        updated: !dryRun && checkSucceeded,
        last_checked_utc: dryRun ? topic.last_checked_utc : generatedAt,
        next_check_utc: dryRun ? topic.next_check_utc : nextCheck,
        baseline_pmids_added: added,
      },
    };

    if (queryStrategyChanged) {
      result.query_strategy_changed = true;
      result.previous_query_hash = previousHash;
      result.current_query_hash = currentHash;
      result.query_strategy_change_recommendation =
        "Reset or re-baseline this watch before interpreting deltas.";
    }

    if (checkSucceeded && check.pubmed_check.new_pmids.length > 0) {
      result.new_evidence_candidates = buildEvidenceAlertCandidates(check, topic);
    }

    if (!checkSucceeded) {
      result.error_message = "PubMed check failed during scheduled watch run.";
      result.state_update.updated = false;
    }

    if (!dryRun && checkSucceeded) {
      const heartbeatUpdate =
        heartbeat.emitted && !check.evidence_change_alert.alert_required
          ? heartbeat
          : null;

      await store.updateWatchTopicState(topic.watch_topic_id, {
        last_checked_utc: generatedAt,
        next_check_utc: nextCheck,
        baseline: {
          known_pmids: merged,
          baseline_created_utc:
            topic.baseline.baseline_created_utc ?? generatedAt,
        },
        query_strategy: {
          query_hash: currentHash,
          query_version: topic.query_strategy.query_version,
        },
        last_alert: check.evidence_change_alert.alert_required
          ? buildStoredAlert(check, generatedAt)
          : null,
        last_heartbeat: heartbeatUpdate,
      });
    }

    return result;
  } catch (error) {
    return {
      watch_topic_id: topic.watch_topic_id,
      claim_family: topic.claim_family,
      status: "error",
      previous_known_pmids_count: previousKnown.length,
      current_known_pmids_count: previousKnown.length,
      new_pmids: [],
      query_hash: currentHash,
      query_version: topic.query_strategy.query_version,
      evidence_delta: {
        change_level: "none",
        direction: "unclear",
        delta_summary: "Scheduled watch check failed.",
        delta_confidence: 0,
        contributing_sources_to_delta: [],
        non_contributing_sources: [],
        alert_reason_codes: ["SCHEDULED_WATCH_ERROR"],
        alert_threshold_explanation: "Watch check threw an error.",
      },
      evidence_change_alert: {
        alert_required: false,
        alert_type: "none",
        affected_claim_family_id: topic.claim_family,
        affected_workspace_ids_visible_to_mind: false,
        app_should_map_to_private_workspaces: true,
        alert_summary: "Scheduled watch check error.",
      },
      heartbeat: {
        emitted: false,
        summary: "Watch check failed; no heartbeat emitted.",
        no_material_change: true,
      },
      state_update: {
        updated: false,
        last_checked_utc: topic.last_checked_utc,
        next_check_utc: topic.next_check_utc,
        baseline_pmids_added: [],
      },
      error_message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function buildRunDueResponse(
  body: RunDueRequestBody
): Promise<RunDueResponse> {
  const now = new Date().toISOString();
  const workspaceId = body.workspace_id?.trim() || "demo-phase-10";
  const force = body.force === true;
  const dryRun = body.dry_run === true;
  const maxWatches =
    typeof body.max_watches === "number" && body.max_watches > 0
      ? Math.floor(body.max_watches)
      : 5;

  const selection = await resolveWatchlistStore();
  const store = selection.store;
  await store.seedDefaultWatchTopicsIfEmpty();
  const topics = await store.listWatchTopics();
  const { due, skipped } = getDueWatchTopics(topics, force, now);
  const toRun = due.slice(0, maxWatches);
  const results: WatchRunTopicResult[] = [];

  for (const topic of skipped) {
    results.push(buildSkippedResult(topic));
  }

  for (const topic of toRun) {
    results.push(await runWatchTopicCheck(store, topic, workspaceId, dryRun));
  }

  const activeCount = topics.filter((topic) => topic.active).length;
  const completed = results.filter((result) => result.status === "completed").length;
  const skippedCount = results.filter((result) => result.status === "skipped").length;
  const persistenceStatus = buildPersistenceStatus(selection);

  return {
    run_id: `${workspaceId}-run-${Date.now()}`,
    generated_at: now,
    mode: "scheduled_watch_simulation",
    force,
    dry_run: dryRun,
    watches_found: activeCount,
    watches_run: completed,
    watches_skipped: skippedCount,
    results,
    privacy_boundary: RUN_DUE_PRIVACY_BOUNDARY,
    persistence_status: persistenceStatus,
    persistence_warning: buildPersistenceWarning(selection),
    limitations: buildRunDueLimitations(selection),
  };
}

export function buildWatchRunFailedResponse(
  error: unknown,
  stage = "unknown"
): WatchRunFailedResponse {
  const message =
    error instanceof Error ? error.message : "Unknown error during watch run.";

  return {
    error: "watch_run_failed",
    message,
    generated_at: new Date().toISOString(),
    debug: {
      route: "/api/watch/run-due",
      phase: "11",
      stage,
    },
  };
}

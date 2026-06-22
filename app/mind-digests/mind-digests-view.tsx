import type { ReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import type { MindDigestsPageData } from "@/lib/review/mind-digests-page";
import {
  formatWatchtowerNarrativeDiffLabel,
  formatWatchtowerNarrativeDiffSignalLabel,
} from "@/lib/review/mind-digests-view-ui";

import { ReviewQueueAuthPanel } from "../review-items/review-queue-auth-panel";

const GENERATE_DEMO_PATH = "/mind-digests/generate-demo";
const GENERATE_NARRATIVE_PATH = "/mind-digests/generate-narrative";
const CREATE_HANDOFF_PATH = "/mind-digests/create-handoff";
const SEND_HANDOFF_PATH = "/mind-handoffs/send";
const REVIEW_HANDOFF_PATH = "/mind-handoffs/review";

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "1.5rem",
    maxWidth: "1100px",
    margin: "0 auto",
  } as const,
  header: {
    marginBottom: "1rem",
  } as const,
  nav: {
    marginTop: "0.5rem",
    fontSize: "0.875rem",
  } as const,
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    background: "#fff",
  } as const,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8125rem",
  } as const,
  th: {
    textAlign: "left" as const,
    borderBottom: "1px solid #e2e8f0",
    padding: "0.5rem",
    color: "#64748b",
  } as const,
  td: {
    borderBottom: "1px solid #f1f5f9",
    padding: "0.5rem",
    verticalAlign: "top" as const,
  } as const,
  button: {
    padding: "0.45rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  buttonSecondary: {
    padding: "0.45rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  buttonDanger: {
    padding: "0.45rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #b91c1c",
    background: "#fff",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  buttonDisabled: {
    padding: "0.45rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "#f1f5f9",
    color: "#94a3b8",
    cursor: "not-allowed",
    fontSize: "0.8125rem",
  } as const,
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  success: {
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  detailLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginBottom: "0.15rem",
  } as const,
  detailValue: {
    marginBottom: "0.75rem",
    fontSize: "0.875rem",
  } as const,
  selectedRow: {
    background: "#eff6ff",
  } as const,
  note: {
    fontSize: "0.8125rem",
    color: "#64748b",
    marginBottom: "0.75rem",
  } as const,
  codePreview: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.75rem",
    fontSize: "0.75rem",
    overflowX: "auto" as const,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    marginTop: "0.5rem",
  } as const,
  chipList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.35rem",
    marginTop: "0.25rem",
  } as const,
  chip: {
    display: "inline-block",
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    fontSize: "0.75rem",
    color: "#334155",
  } as const,
};

type MindDigestsViewProps = {
  pageData: MindDigestsPageData;
  authStatus: ReviewQueueAuthPanelData;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }

  return `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
}

function formatGenerationSource(source: string): string {
  return source === "scheduled" ? "Scheduled" : "Manual";
}

function formatReviewStatus(status: string): string {
  return status.replaceAll("_", " ");
}

function formatHandoffDestinationLabel(
  destination: MindDigestsPageData["selectedHandoffDestination"]
): string {
  return destination === "hellominds" ? "HelloMinds" : "test sink";
}

export function MindDigestsView({ pageData, authStatus }: MindDigestsViewProps) {
  const selectedDigestId = pageData.selectedDigest?.id ?? null;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Mind digests</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9375rem" }}>
          Internal watchtower summaries built from stored evidence alerts, review items, briefs, and
          mapped claims. Phase 35 adds durable watchtower narratives from digests. Phase 34 requires
          operator approval before external Mind handoff send; real Animoca Mind delivery remains
          disabled unless explicitly enabled in server configuration.
        </p>
        <nav style={styles.nav}>
          <a href="/review-items">Review queue</a>
          {" · "}
          <a href="/client-claims">Client claims</a>
          {" · "}
          <a href="/evidence-briefs">Evidence briefs</a>
          {" · "}
          <a href="/mind-digests">Mind digests</a>
        </nav>
      </header>

      <ReviewQueueAuthPanel authStatus={authStatus} />

      {!pageData.configured && pageData.listErrorMessage ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      {pageData.handoffFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.handoffFlash.duplicate_skipped
            ? "An active Mind handoff already exists for this digest — showing existing handoff."
            : "Payload created, pending operator review."}
        </div>
      ) : null}

      {pageData.reviewFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.reviewFlash.action === "approve"
            ? "Handoff payload approved. Send to test sink is now available."
            : pageData.reviewFlash.action === "reject"
              ? "Handoff payload rejected."
              : "Changes requested for handoff payload."}
        </div>
      ) : null}

      {pageData.reviewFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.reviewFlash.message}</div>
      ) : null}

      {pageData.narrativeFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.narrativeFlash.duplicate_skipped
            ? "A watchtower narrative already exists for this digest — showing existing narrative."
            : "Watchtower narrative generated."}
        </div>
      ) : null}

      {pageData.narrativeFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.narrativeFlash.message}</div>
      ) : null}

      {pageData.handoffFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.handoffFlash.message}</div>
      ) : null}

      {pageData.sendFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.sendFlash.result === "test_sink_sent"
            ? "Test sink send completed. Handoff marked as sent."
            : "Mind handoff send completed."}
        </div>
      ) : null}

      {pageData.sendFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.sendFlash.message}</div>
      ) : null}

      {pageData.generateFlash?.kind === "success" ? (
        <div style={styles.success}>
          {pageData.generateFlash.duplicate_skipped
            ? "An active digest already exists for this period — showing existing digest."
            : "Demo Mind digest generated."}
        </div>
      ) : null}

      {pageData.generateFlash?.kind === "error" ? (
        <div style={styles.error}>{pageData.generateFlash.message}</div>
      ) : null}

      {pageData.listErrorMessage && pageData.configured ? (
        <div style={styles.error}>{pageData.listErrorMessage}</div>
      ) : null}

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Generate demo digest</h2>
        <p style={styles.note}>
          Creates a template digest for workspace {pageData.defaultWorkspaceId} covering the last 7
          days, summarizing existing evidence briefs, review items, alerts, and mappings where
          available.
        </p>
        <form action={GENERATE_DEMO_PATH} method="post">
          <input type="hidden" name="workspace_id" value={pageData.defaultWorkspaceId} />
          <button type="submit" style={styles.button}>
            Generate demo digest
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Digests</h2>
        {pageData.digests.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            No Mind digests yet.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Highest risk</th>
                <th style={styles.th}>Affected claims</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {pageData.digests.map((digest) => (
                <tr
                  key={digest.id}
                  style={digest.id === selectedDigestId ? styles.selectedRow : undefined}
                >
                  <td style={styles.td}>
                    <a href={`/mind-digests?digest_id=${encodeURIComponent(digest.id)}`}>
                      {digest.digest_title}
                    </a>
                  </td>
                  <td style={styles.td}>
                    {formatPeriod(digest.period_start, digest.period_end)}
                  </td>
                  <td style={styles.td}>{digest.status}</td>
                  <td style={styles.td}>{formatGenerationSource(digest.generation_source)}</td>
                  <td style={styles.td}>{digest.highest_risk_implication}</td>
                  <td style={styles.td}>{digest.affected_client_claims_count}</td>
                  <td style={styles.td}>{formatTimestamp(digest.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pageData.detailErrorMessage ? (
        <div style={styles.error}>{pageData.detailErrorMessage}</div>
      ) : null}

      {pageData.selectedDigest ? (
        <section style={styles.section}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Digest detail</h2>
          <div style={styles.detailLabel}>Summary</div>
          <div style={styles.detailValue}>{pageData.selectedDigest.digest_summary}</div>

          <div style={styles.detailLabel}>Generation source</div>
          <div style={styles.detailValue}>
            {formatGenerationSource(pageData.selectedDigest.generation_source)}
          </div>

          <div style={styles.detailLabel}>Recommended focus</div>
          <div style={styles.detailValue}>{pageData.selectedDigest.recommended_focus}</div>

          <div style={styles.detailLabel}>Watch activity</div>
          <div style={styles.detailValue}>
            Watchlists checked: {pageData.selectedDigest.watchlists_checked_count} · New alerts:{" "}
            {pageData.selectedDigest.new_alerts_count} · Review items:{" "}
            {pageData.selectedDigest.review_items_count} · Briefs:{" "}
            {pageData.selectedDigest.briefs_count}
          </div>

          <div style={styles.detailLabel}>Affected scope</div>
          <div style={styles.detailValue}>
            Claim families: {pageData.selectedDigest.affected_claim_families_count} · Client claims:{" "}
            {pageData.selectedDigest.affected_client_claims_count}
          </div>

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1rem" }}>Digest item snapshots</h3>
          {pageData.selectedDigestItems.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
              No item snapshots were recorded for this digest.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Claim family</th>
                  <th style={styles.th}>Client claim</th>
                  <th style={styles.th}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {pageData.selectedDigestItems.map((item) => (
                  <tr key={`${item.digest_id}:${item.item_type}:${item.title_snapshot}:${item.item_ref_id ?? ""}`}>
                    <td style={styles.td}>{item.item_type}</td>
                    <td style={styles.td}>{item.title_snapshot}</td>
                    <td style={styles.td}>{item.claim_family ?? "—"}</td>
                    <td style={styles.td}>{item.client_claim_id ?? "—"}</td>
                    <td style={styles.td}>{item.risk_implication ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1.5rem" }}>Watchtower narrative</h3>
          <p style={styles.note}>
            Generates a durable, evidence-constrained interpretation from this digest using
            deterministic templates only. The narrative explains what changed, why it matters, and
            recommended operator focus — without medical advice or unverified citations.
          </p>

          {pageData.narrativesConfigured ? (
            <>
              <form action={GENERATE_NARRATIVE_PATH} method="post">
                <input type="hidden" name="digest_id" value={pageData.selectedDigest.id} />
                <button type="submit" style={styles.button}>
                  Generate watchtower narrative
                </button>
              </form>

              {pageData.selectedDigestNarrative ? (
                <div style={{ marginTop: "1rem" }}>
                  <div style={styles.detailLabel}>Latest narrative</div>
                  <div style={styles.detailValue}>
                    {pageData.selectedDigestNarrative.title} · Risk posture:{" "}
                    {formatReviewStatus(pageData.selectedDigestNarrative.risk_posture)} · Generated:{" "}
                    {formatTimestamp(pageData.selectedDigestNarrative.generated_at)}
                  </div>

                  <div style={styles.detailLabel}>Summary</div>
                  <div style={styles.detailValue}>{pageData.selectedDigestNarrative.summary_text}</div>

                  {pageData.selectedDigestNarrative.what_changed_text ? (
                    <>
                      <div style={styles.detailLabel}>What changed</div>
                      <div style={styles.detailValue}>
                        {pageData.selectedDigestNarrative.what_changed_text}
                      </div>
                    </>
                  ) : null}

                  {pageData.selectedDigestNarrative.why_it_matters_text ? (
                    <>
                      <div style={styles.detailLabel}>Why it matters</div>
                      <div style={styles.detailValue}>
                        {pageData.selectedDigestNarrative.why_it_matters_text}
                      </div>
                    </>
                  ) : null}

                  {pageData.selectedDigestNarrative.operator_focus_text ? (
                    <>
                      <div style={styles.detailLabel}>Operator focus</div>
                      <div style={styles.detailValue}>
                        {pageData.selectedDigestNarrative.operator_focus_text}
                      </div>
                    </>
                  ) : null}

                  {pageData.selectedDigestNarrative.recommended_next_action_text ? (
                    <>
                      <div style={styles.detailLabel}>Recommended next action</div>
                      <div style={styles.detailValue}>
                        {pageData.selectedDigestNarrative.recommended_next_action_text}
                      </div>
                    </>
                  ) : null}

                  <h4 style={{ fontSize: "0.875rem", marginTop: "1.25rem" }}>
                    Watchtower Narrative Diff
                  </h4>
                  {pageData.diffsConfigured ? (
                    pageData.selectedDigestWatchtowerNarrativeDiff ? (
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={styles.detailLabel}>Deterministic summary</div>
                        <div style={styles.detailValue}>
                          {pageData.selectedDigestWatchtowerNarrativeDiff.deterministic_summary}
                        </div>

                        <div style={styles.detailLabel}>Interpretation change level</div>
                        <div style={styles.detailValue}>
                          {formatWatchtowerNarrativeDiffLabel(
                            pageData.selectedDigestWatchtowerNarrativeDiff.interpretation_change_level
                          )}
                        </div>

                        <div style={styles.detailLabel}>Risk posture change</div>
                        <div style={styles.detailValue}>
                          {formatWatchtowerNarrativeDiffLabel(
                            pageData.selectedDigestWatchtowerNarrativeDiff.risk_posture_change
                          )}
                        </div>

                        <div style={styles.detailLabel}>Urgency change</div>
                        <div style={styles.detailValue}>
                          {formatWatchtowerNarrativeDiffLabel(
                            pageData.selectedDigestWatchtowerNarrativeDiff.urgency_change
                          )}
                        </div>

                        <div style={styles.detailLabel}>Operator focus change</div>
                        <div style={styles.detailValue}>
                          {formatWatchtowerNarrativeDiffLabel(
                            pageData.selectedDigestWatchtowerNarrativeDiff.operator_focus_change
                          )}
                        </div>

                        <div style={styles.detailLabel}>Recommended action change</div>
                        <div style={styles.detailValue}>
                          {formatWatchtowerNarrativeDiffLabel(
                            pageData.selectedDigestWatchtowerNarrativeDiff.recommended_action_change
                          )}
                        </div>

                        <div style={styles.detailLabel}>Change signals</div>
                        {pageData.selectedDigestWatchtowerNarrativeDiff.change_signals.length ===
                        0 ? (
                          <div style={styles.detailValue}>No change signals recorded.</div>
                        ) : (
                          <div style={styles.chipList}>
                            {pageData.selectedDigestWatchtowerNarrativeDiff.change_signals.map(
                              (signal) => (
                                <span key={signal} style={styles.chip}>
                                  {formatWatchtowerNarrativeDiffSignalLabel(signal)}
                                </span>
                              )
                            )}
                          </div>
                        )}

                        <div style={styles.detailLabel}>Previous narrative</div>
                        <div style={styles.detailValue}>
                          {pageData.selectedDigestWatchtowerNarrativeDiff.previous_narrative_id ??
                            "This is the first narrative in the current workspace sequence."}
                        </div>

                        <div style={styles.detailLabel}>Compared at</div>
                        <div style={styles.detailValue}>
                          {formatTimestamp(
                            pageData.selectedDigestWatchtowerNarrativeDiff.compared_at
                          )}
                        </div>
                      </div>
                    ) : (
                      <p style={{ ...styles.note, marginTop: "0.5rem" }}>
                        No diff has been stored for this narrative yet.
                      </p>
                    )
                  ) : (
                    <p style={{ ...styles.note, marginTop: "0.5rem" }}>
                      Watchtower narrative diff storage is not configured.
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ ...styles.note, marginTop: "0.75rem" }}>
                  No watchtower narrative exists for this digest yet.
                </p>
              )}
            </>
          ) : (
            <p style={{ ...styles.note, marginTop: "0.75rem" }}>
              Watchtower narrative storage is not configured.
            </p>
          )}

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1.5rem" }}>External Mind handoff</h3>
          <p style={styles.note}>
            Creates a durable privacy-safe payload for operator review before any send. Test sink is
            the safe default. HelloMinds creates a production-format payload for validation — it
            does not send or approve automatically.
          </p>

          {pageData.handoffsConfigured ? (
            <>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <form action={CREATE_HANDOFF_PATH} method="post">
                  <input type="hidden" name="digest_id" value={pageData.selectedDigest.id} />
                  <input type="hidden" name="destination" value="test_sink" />
                  <button type="submit" style={styles.button}>
                    Create test sink handoff
                  </button>
                </form>
                <form action={CREATE_HANDOFF_PATH} method="post">
                  <input type="hidden" name="digest_id" value={pageData.selectedDigest.id} />
                  <input type="hidden" name="destination" value="hellominds" />
                  <button type="submit" style={styles.buttonSecondary}>
                    Create HelloMinds handoff
                  </button>
                </form>
              </div>
              <p style={{ ...styles.note, marginTop: "0.5rem", marginBottom: 0 }}>
                Both destinations require separate operator approval before send. Only approved test
                sink handoffs can be sent from this page.
              </p>

              <div style={{ marginTop: "0.75rem" }}>
                <div style={styles.detailLabel}>View handoff by destination</div>
                <nav style={{ ...styles.nav, marginTop: "0.25rem" }}>
                  <a
                    href={`/mind-digests?digest_id=${encodeURIComponent(pageData.selectedDigest.id)}`}
                    aria-current={
                      pageData.selectedHandoffDestination === "test_sink" ? "page" : undefined
                    }
                  >
                    test sink
                    {pageData.selectedHandoffDestination === "test_sink" ? " (viewing)" : ""}
                  </a>
                  {" · "}
                  <a
                    href={`/mind-digests?digest_id=${encodeURIComponent(pageData.selectedDigest.id)}&handoff_destination=hellominds`}
                    aria-current={
                      pageData.selectedHandoffDestination === "hellominds" ? "page" : undefined
                    }
                  >
                    HelloMinds
                    {pageData.selectedHandoffDestination === "hellominds" ? " (viewing)" : ""}
                  </a>
                </nav>
              </div>

              {pageData.selectedDigestHandoff ? (
                <div style={{ marginTop: "1rem" }}>
                  <div style={styles.detailLabel}>Latest handoff</div>
                  <div style={styles.detailValue}>
                    Destination: {pageData.selectedDigestHandoff.destination} · Payload version:{" "}
                    {pageData.selectedDigestHandoff.payload_version} · Status:{" "}
                    {pageData.selectedDigestHandoff.status} · Review:{" "}
                    {formatReviewStatus(pageData.selectedDigestHandoff.review_status)} · Created:{" "}
                    {formatTimestamp(pageData.selectedDigestHandoff.created_at)}
                    {pageData.selectedDigestHandoff.approved_at
                      ? ` · Approved: ${formatTimestamp(pageData.selectedDigestHandoff.approved_at)}`
                      : ""}
                    {pageData.selectedDigestHandoff.sent_at
                      ? ` · Sent: ${formatTimestamp(pageData.selectedDigestHandoff.sent_at)}`
                      : ""}
                  </div>

                  {pageData.selectedDigestHandoff.status !== "sent" &&
                  (pageData.selectedDigestHandoff.review_status === "pending_review" ||
                    pageData.selectedDigestHandoff.review_status === "changes_requested") ? (
                    <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <form action={REVIEW_HANDOFF_PATH} method="post">
                        <input
                          type="hidden"
                          name="handoff_id"
                          value={pageData.selectedDigestHandoff.id}
                        />
                        <input
                          type="hidden"
                          name="digest_id"
                          value={pageData.selectedDigest.id}
                        />
                        {pageData.selectedHandoffDestination !== "test_sink" ? (
                          <input
                            type="hidden"
                            name="handoff_destination"
                            value={pageData.selectedHandoffDestination}
                          />
                        ) : null}
                        <input type="hidden" name="review_action" value="approve" />
                        <button type="submit" style={styles.button}>
                          Approve payload
                        </button>
                      </form>
                      <form action={REVIEW_HANDOFF_PATH} method="post">
                        <input
                          type="hidden"
                          name="handoff_id"
                          value={pageData.selectedDigestHandoff.id}
                        />
                        <input
                          type="hidden"
                          name="digest_id"
                          value={pageData.selectedDigest.id}
                        />
                        {pageData.selectedHandoffDestination !== "test_sink" ? (
                          <input
                            type="hidden"
                            name="handoff_destination"
                            value={pageData.selectedHandoffDestination}
                          />
                        ) : null}
                        <input type="hidden" name="review_action" value="reject" />
                        <button type="submit" style={styles.buttonDanger}>
                          Reject payload
                        </button>
                      </form>
                      <form action={REVIEW_HANDOFF_PATH} method="post">
                        <input
                          type="hidden"
                          name="handoff_id"
                          value={pageData.selectedDigestHandoff.id}
                        />
                        <input
                          type="hidden"
                          name="digest_id"
                          value={pageData.selectedDigest.id}
                        />
                        {pageData.selectedHandoffDestination !== "test_sink" ? (
                          <input
                            type="hidden"
                            name="handoff_destination"
                            value={pageData.selectedHandoffDestination}
                          />
                        ) : null}
                        <input type="hidden" name="review_action" value="request_changes" />
                        <button type="submit" style={styles.buttonSecondary}>
                          Request changes
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {pageData.selectedDigestHandoff.review_status === "rejected" ? (
                    <p style={{ ...styles.note, marginTop: "0.75rem" }}>
                      This handoff was rejected and cannot be sent until a new payload is created and
                      approved.
                    </p>
                  ) : null}

                  {pageData.selectedDigestHandoff.status === "ready" &&
                  pageData.selectedDigestHandoff.destination === "test_sink" &&
                  pageData.selectedDigestHandoff.review_status === "approved" ? (
                    <form action={SEND_HANDOFF_PATH} method="post" style={{ marginTop: "0.75rem" }}>
                      <input
                        type="hidden"
                        name="handoff_id"
                        value={pageData.selectedDigestHandoff.id}
                      />
                      <input
                        type="hidden"
                        name="digest_id"
                        value={pageData.selectedDigest.id}
                      />
                      <button type="submit" style={styles.button}>
                        Send to test sink
                      </button>
                    </form>
                  ) : null}

                  {pageData.selectedDigestHandoff.status === "ready" &&
                  pageData.selectedDigestHandoff.destination === "test_sink" &&
                  pageData.selectedDigestHandoff.review_status !== "approved" ? (
                    <div style={{ marginTop: "0.75rem" }}>
                      <button type="button" disabled style={styles.buttonDisabled}>
                        Send to test sink
                      </button>
                      <p style={{ ...styles.note, marginTop: "0.35rem", marginBottom: 0 }}>
                        Send is disabled until an operator approves this payload (
                        {formatReviewStatus(pageData.selectedDigestHandoff.review_status)}).
                      </p>
                    </div>
                  ) : null}

                  {pageData.selectedDigestHandoff.send_result_json ? (
                    <>
                      <div style={styles.detailLabel}>Send result</div>
                      <div style={styles.detailValue}>
                        Result: {pageData.selectedDigestHandoff.send_result_json.result}
                        {pageData.selectedDigestHandoff.send_result_json.test_sink_only
                          ? " · Test sink only"
                          : ""}
                        {pageData.selectedDigestHandoff.send_attempted_at
                          ? ` · Attempted: ${formatTimestamp(pageData.selectedDigestHandoff.send_attempted_at)}`
                          : ""}
                      </div>
                    </>
                  ) : null}

                  <div style={styles.detailLabel}>Payload preview</div>
                  <pre style={styles.codePreview}>
                    {JSON.stringify(pageData.selectedDigestHandoff.payload_json, null, 2)}
                  </pre>

                  {pageData.sendEventsConfigured ? (
                    <>
                      <h4 style={{ fontSize: "0.875rem", marginTop: "1.25rem" }}>Send history</h4>
                      {pageData.selectedDigestHandoffSendEvents.length === 0 ? (
                        <p style={{ ...styles.note, marginTop: "0.5rem" }}>
                          No send events recorded for this handoff yet.
                        </p>
                      ) : (
                        <table style={{ ...styles.table, marginTop: "0.5rem" }}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Event</th>
                              <th style={styles.th}>Result</th>
                              <th style={styles.th}>Destination</th>
                              <th style={styles.th}>Actor</th>
                              <th style={styles.th}>Access</th>
                              <th style={styles.th}>Attempted</th>
                              <th style={styles.th}>Completed</th>
                              <th style={styles.th}>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageData.selectedDigestHandoffSendEvents.map((event, index) => (
                              <tr key={`${event.event_type}:${event.attempted_at}:${index}`}>
                                <td style={styles.td}>{event.event_type}</td>
                                <td style={styles.td}>{event.result ?? "—"}</td>
                                <td style={styles.td}>{event.destination}</td>
                                <td style={styles.td}>{event.actor_type}</td>
                                <td style={styles.td}>{event.access_mode ?? "—"}</td>
                                <td style={styles.td}>{formatTimestamp(event.attempted_at)}</td>
                                <td style={styles.td}>
                                  {event.completed_at ? formatTimestamp(event.completed_at) : "—"}
                                </td>
                                <td style={styles.td}>{event.error_message ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                <p style={{ ...styles.note, marginTop: "0.75rem" }}>
                  No Mind handoff payload exists for this digest at destination{" "}
                  {formatHandoffDestinationLabel(pageData.selectedHandoffDestination)} yet.
                </p>
              )}
            </>
          ) : (
            <p style={{ ...styles.note, marginTop: "0.75rem" }}>
              External Mind handoff storage is not configured.
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}

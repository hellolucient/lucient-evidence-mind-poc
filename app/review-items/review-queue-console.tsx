"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { REVIEW_QUEUE_STATUS_OPTIONS } from "@/lib/review/review-queue-constants";
import type {
  ReviewQueuePageData,
  ReviewQueueStatusCounts,
} from "@/lib/review/review-queue-types";

const REVIEW_ITEMS_UPDATE_PATH = "/review-items/update";

type ReviewQueueConsoleProps = {
  initialData: ReviewQueuePageData;
};

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "1.5rem 2rem",
    maxWidth: "1280px",
    margin: "0 auto",
  } as const,
  subtitle: {
    color: "#444",
    marginTop: "0.25rem",
  } as const,
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: "0.625rem",
    margin: "1.25rem 0",
  } as const,
  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "0.625rem 0.875rem",
    background: "#fafafa",
  } as const,
  cardActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  } as const,
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.625rem",
    marginBottom: "0.75rem",
  } as const,
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    fontSize: "0.8125rem",
  } as const,
  input: {
    padding: "0.45rem 0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.8125rem",
  } as const,
  activeFilters: {
    fontSize: "0.8125rem",
    color: "#555",
    marginBottom: "1rem",
  } as const,
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
    gap: "1rem",
    alignItems: "start",
  } as const,
  tableWrap: {
    overflowX: "auto" as const,
    border: "1px solid #ddd",
    borderRadius: "8px",
    WebkitOverflowScrolling: "touch" as const,
  } as const,
  table: {
    width: "100%",
    minWidth: "980px",
    borderCollapse: "collapse" as const,
    fontSize: "0.8125rem",
    tableLayout: "fixed" as const,
  } as const,
  th: {
    textAlign: "left" as const,
    padding: "0.5rem 0.625rem",
    borderBottom: "1px solid #ddd",
    background: "#f5f5f5",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  } as const,
  td: {
    padding: "0.5rem 0.625rem",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle" as const,
  } as const,
  cellCompact: {
    minWidth: "72px",
    maxWidth: "110px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  } as const,
  cellMedium: {
    minWidth: "120px",
    maxWidth: "160px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  } as const,
  cellWide: {
    minWidth: "140px",
    maxWidth: "180px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  } as const,
  cellSummary: {
    minWidth: "240px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  } as const,
  cellUpdated: {
    minWidth: "130px",
    maxWidth: "150px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  } as const,
  row: {
    cursor: "pointer",
  } as const,
  rowSelected: {
    background: "#eff6ff",
    boxShadow: "inset 3px 0 0 #2563eb",
  } as const,
  panel: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1rem 1.125rem",
    background: "#fafafa",
  } as const,
  detailRow: {
    marginBottom: "0.625rem",
    fontSize: "0.8125rem",
    lineHeight: 1.45,
  } as const,
  detailValue: {
    wordBreak: "break-word" as const,
  } as const,
  detailLabel: {
    color: "#666",
    fontSize: "0.6875rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: "0.125rem",
  } as const,
  statusUpdateRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center" as const,
    marginTop: "0.75rem",
    flexWrap: "wrap" as const,
  } as const,
  actionButton: {
    padding: "0.45rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  primaryButton: {
    padding: "0.55rem 1rem",
    borderRadius: "6px",
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
  } as const,
  primaryButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  } as const,
  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  } as const,
  info: {
    color: "#444",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
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
    marginTop: "0.75rem",
  } as const,
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function buildQueryString(filters: ReviewQueuePageData["filters"], selectedId?: string): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.workspace_id) {
    params.set("workspace_id", filters.workspace_id);
  }
  if (filters.claim_family) {
    params.set("claim_family", filters.claim_family);
  }
  if (filters.signal) {
    params.set("signal", filters.signal);
  }
  if (selectedId) {
    params.set("selected_id", selectedId);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildReturnQuery(
  filters: ReviewQueuePageData["filters"],
  selectedId?: string
): string {
  return buildQueryString(filters, selectedId).replace(/^\?/, "");
}

function buildFilterKey(filters: ReviewQueuePageData["filters"]): string {
  return [
    filters.status ?? "",
    filters.workspace_id ?? "",
    filters.claim_family ?? "",
    filters.signal ?? "",
  ].join("|");
}

function describeActiveFilters(filters: ReviewQueuePageData["filters"]): string {
  const parts: string[] = [];

  if (filters.status) {
    parts.push(`status=${filters.status}`);
  }
  if (filters.workspace_id) {
    parts.push(`workspace_id=${filters.workspace_id}`);
  }
  if (filters.claim_family) {
    parts.push(`claim_family=${filters.claim_family}`);
  }
  if (filters.signal) {
    parts.push(`signal=${filters.signal}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "No filters applied";
}

function StatusCards({
  counts,
  activeStatus,
  onSelectStatus,
}: {
  counts: ReviewQueueStatusCounts;
  activeStatus?: string;
  onSelectStatus: (status: string | undefined) => void;
}) {
  return (
    <div style={styles.cards}>
      {REVIEW_QUEUE_STATUS_OPTIONS.map((status) => {
        const isActive = activeStatus === status;
        return (
          <button
            key={status}
            type="button"
            onClick={() => onSelectStatus(isActive ? undefined : status)}
            style={{
              ...styles.card,
              ...(isActive ? styles.cardActive : {}),
              cursor: "pointer",
              textAlign: "left" as const,
            }}
          >
            <div style={{ fontSize: "0.6875rem", color: "#666" }}>{status}</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>{counts[status]}</div>
          </button>
        );
      })}
    </div>
  );
}

export function ReviewQueueConsole({ initialData }: ReviewQueueConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData.effectiveSelectedId
  );

  const appliedFilters = initialData.filters;
  const updateFlash = initialData.updateFlash;

  useEffect(() => {
    setSelectedId(initialData.effectiveSelectedId);
  }, [initialData.effectiveSelectedId]);

  const selectedItem =
    initialData.selectedItem?.id === selectedId ? initialData.selectedItem : null;
  const isSelectionPending = Boolean(selectedId && selectedId !== initialData.effectiveSelectedId);

  function navigateWithFilters(
    nextFilters: ReviewQueuePageData["filters"],
    nextSelectedId?: string | null
  ) {
    const resolvedSelectedId =
      nextSelectedId === null ? undefined : (nextSelectedId ?? selectedId ?? undefined);

    startTransition(() => {
      router.push(`/review-items${buildQueryString(nextFilters, resolvedSelectedId)}`);
    });
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    navigateWithFilters(
      {
        status: String(formData.get("status") || "") || undefined,
        workspace_id: String(formData.get("workspace_id") || "") || undefined,
        claim_family: String(formData.get("claim_family") || "") || undefined,
        signal: String(formData.get("signal") || "") || undefined,
      },
      null
    );
  }

  function handleClearFilters() {
    navigateWithFilters({}, null);
  }

  function handleSelectItem(id: string) {
    setSelectedId(id);
    navigateWithFilters(appliedFilters, id);
  }

  return (
    <main style={styles.page}>
      <header>
        <h1 style={{ marginBottom: 0 }}>lucient Evidence Mind — Review Queue</h1>
        <p style={styles.subtitle}>
          Evidence changes mapped to affected client/workspace claims.
        </p>
      </header>

      {!initialData.configured && (
        <div style={styles.error}>
          Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load review
          items.
        </div>
      )}

      {initialData.listErrorMessage && (
        <div style={styles.error}>{initialData.listErrorMessage}</div>
      )}

      {initialData.configured && !initialData.listError && (
        <>
          <StatusCards
            counts={initialData.statusCounts}
            activeStatus={appliedFilters.status}
            onSelectStatus={(status) =>
              navigateWithFilters({ ...appliedFilters, status }, selectedId)
            }
          />

          <form
            key={buildFilterKey(appliedFilters)}
            style={styles.filters}
            onSubmit={handleFilterSubmit}
          >
            <label style={styles.label}>
              Status
              <select
                name="status"
                defaultValue={appliedFilters.status ?? ""}
                style={styles.input}
              >
                <option value="">All statuses</option>
                {REVIEW_QUEUE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Workspace ID
              <input
                name="workspace_id"
                defaultValue={appliedFilters.workspace_id ?? ""}
                style={styles.input}
                placeholder="demo-workspace-spa-menu"
              />
            </label>
            <label style={styles.label}>
              Claim family
              <input
                name="claim_family"
                defaultValue={appliedFilters.claim_family ?? ""}
                style={styles.input}
                placeholder="magnesium_cortisol_stress"
              />
            </label>
            <label style={styles.label}>
              Signal
              <input
                name="signal"
                defaultValue={appliedFilters.signal ?? ""}
                style={styles.input}
                placeholder="human_review_required"
              />
            </label>
            <label style={styles.label}>
              <span>&nbsp;</span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="submit" style={styles.actionButton} disabled={isPending}>
                  Apply filters
                </button>
                <button
                  type="button"
                  style={styles.actionButton}
                  disabled={isPending}
                  onClick={handleClearFilters}
                >
                  Clear
                </button>
              </div>
            </label>
          </form>

          <p style={styles.activeFilters}>
            Active query: {describeActiveFilters(appliedFilters)}
          </p>

          <p style={{ fontSize: "0.8125rem", color: "#666", marginBottom: "1rem" }}>
            Showing {initialData.filteredCount} item{initialData.filteredCount === 1 ? "" : "s"}
            {isPending ? " (refreshing…)" : ""}
          </p>
        </>
      )}

      <div style={styles.layout}>
        <section style={styles.tableWrap}>
          {initialData.items.length === 0 && initialData.configured && !initialData.listError ? (
            <div style={{ padding: "1rem" }}>No review items found for the current filters.</div>
          ) : (
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: "88px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "72px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "280px" }} />
                <col style={{ width: "140px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Signal</th>
                  <th style={styles.th}>Severity</th>
                  <th style={styles.th}>Claim family</th>
                  <th style={styles.th}>Workspace</th>
                  <th style={styles.th}>Client claim</th>
                  <th style={styles.th}>Summary</th>
                  <th style={styles.th}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {initialData.items.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        ...styles.row,
                        ...(isSelected ? styles.rowSelected : {}),
                      }}
                      onClick={() => handleSelectItem(item.id)}
                      aria-selected={isSelected}
                    >
                      <td style={{ ...styles.td, ...styles.cellCompact }} title={item.status}>
                        {item.status}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellMedium }} title={item.signal ?? ""}>
                        {item.signal ?? "—"}
                      </td>
                      <td
                        style={{ ...styles.td, ...styles.cellCompact }}
                        title={item.severity ?? ""}
                      >
                        {item.severity ?? "—"}
                      </td>
                      <td
                        style={{ ...styles.td, ...styles.cellWide }}
                        title={item.claim_family}
                      >
                        {item.claim_family}
                      </td>
                      <td
                        style={{ ...styles.td, ...styles.cellWide }}
                        title={item.workspace_id}
                      >
                        {item.workspace_id}
                      </td>
                      <td
                        style={{ ...styles.td, ...styles.cellWide }}
                        title={item.client_claim_id}
                      >
                        {item.client_claim_id}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellSummary }} title={item.summary ?? ""}>
                        {item.summary ?? "—"}
                      </td>
                      <td
                        style={{ ...styles.td, ...styles.cellUpdated }}
                        title={formatTimestamp(item.updated_at)}
                      >
                        {formatTimestamp(item.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside style={styles.panel}>
          <h2 style={{ marginTop: 0, fontSize: "0.9375rem" }}>Review item detail</h2>

          {!selectedItem && initialData.items.length === 0 && (
            <div style={styles.info}>No review items available to inspect.</div>
          )}

          {!selectedItem && !isSelectionPending && initialData.items.length > 0 && (
            <div style={styles.info}>Select a review item from the table to inspect it.</div>
          )}

          {isSelectionPending && (
            <div style={styles.info}>Loading item details…</div>
          )}

          {initialData.selectedErrorMessage && selectedId && (
            <div style={styles.error}>{initialData.selectedErrorMessage}</div>
          )}

          {selectedItem && (
            <>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>ID</div>
                <div style={styles.detailValue}>{selectedItem.id}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Status</div>
                <div style={styles.detailValue}>{selectedItem.status}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Signal</div>
                <div style={styles.detailValue}>{selectedItem.signal ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Severity</div>
                <div style={styles.detailValue}>{selectedItem.severity ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Workspace ID</div>
                <div style={styles.detailValue}>{selectedItem.workspace_id}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Client claim ID</div>
                <div style={styles.detailValue}>{selectedItem.client_claim_id}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Claim family</div>
                <div style={styles.detailValue}>{selectedItem.claim_family}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Evidence alert ID</div>
                <div style={styles.detailValue}>{selectedItem.evidence_alert_id ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Watch run ID</div>
                <div style={styles.detailValue}>{selectedItem.watch_run_id ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Summary</div>
                <div style={styles.detailValue}>{selectedItem.summary ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Created</div>
                <div style={styles.detailValue}>{formatTimestamp(selectedItem.created_at)}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Updated</div>
                <div style={styles.detailValue}>{formatTimestamp(selectedItem.updated_at)}</div>
              </div>

              <div>
                <div style={styles.detailLabel}>Update status</div>
                <form
                  key={`${selectedItem.id}:${selectedItem.status}`}
                  action={REVIEW_ITEMS_UPDATE_PATH}
                  method="POST"
                  style={styles.statusUpdateRow}
                >
                  <input type="hidden" name="review_item_id" value={selectedItem.id} />
                  <input
                    type="hidden"
                    name="return_query"
                    value={buildReturnQuery(appliedFilters, selectedItem.id)}
                  />
                  <select
                    name="status"
                    defaultValue={selectedItem.status}
                    style={{ ...styles.input, minWidth: "180px" }}
                    required
                  >
                    {REVIEW_QUEUE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button type="submit" style={styles.primaryButton}>
                    Save status change
                  </button>
                </form>
              </div>

              {updateFlash?.kind === "error" && (
                <div style={styles.error}>{updateFlash.message}</div>
              )}
              {updateFlash?.kind === "success" && (
                <div style={styles.success}>
                  Status updated to {updateFlash.status}. List and summary cards refreshed.
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updateReviewItemStatusAction } from "./actions";
import {
  REVIEW_QUEUE_STATUS_OPTIONS,
  type ReviewQueuePageData,
  type ReviewQueueStatusCounts,
} from "@/lib/review/review-queue-ui";

type ReviewQueueConsoleProps = {
  initialData: ReviewQueuePageData;
};

const styles = {
  page: {
    fontFamily: "system-ui, sans-serif",
    padding: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  } as const,
  subtitle: {
    color: "#444",
    marginTop: "0.25rem",
  } as const,
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "0.75rem",
    margin: "1.5rem 0",
  } as const,
  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    background: "#fafafa",
  } as const,
  cardActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  } as const,
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  } as const,
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    fontSize: "0.875rem",
  } as const,
  input: {
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
  } as const,
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    gap: "1rem",
    alignItems: "start",
  } as const,
  tableWrap: {
    overflowX: "auto" as const,
    border: "1px solid #ddd",
    borderRadius: "8px",
  } as const,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.875rem",
  } as const,
  th: {
    textAlign: "left" as const,
    padding: "0.625rem",
    borderBottom: "1px solid #ddd",
    background: "#f5f5f5",
  } as const,
  td: {
    padding: "0.625rem",
    borderBottom: "1px solid #eee",
    verticalAlign: "top" as const,
  } as const,
  rowSelected: {
    background: "#eff6ff",
  } as const,
  rowButton: {
    width: "100%",
    textAlign: "left" as const,
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    font: "inherit",
  } as const,
  panel: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1rem",
    background: "#fafafa",
  } as const,
  detailRow: {
    marginBottom: "0.75rem",
    fontSize: "0.875rem",
  } as const,
  detailLabel: {
    color: "#666",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } as const,
  actions: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    marginTop: "1rem",
  } as const,
  actionButton: {
    padding: "0.4rem 0.75rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",
  } as const,
  actionButtonActive: {
    borderColor: "#2563eb",
    background: "#2563eb",
    color: "#fff",
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

function truncate(value: string | null, maxLength = 80): string {
  if (!value) {
    return "—";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
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
            <div style={{ fontSize: "0.75rem", color: "#666" }}>{status}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{counts[status]}</div>
          </button>
        );
      })}
    </div>
  );
}

export function ReviewQueueConsole({ initialData }: ReviewQueueConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedId = initialData.selectedItem?.id;
  const filterInputs = useMemo(
    () => ({
      status: initialData.filters.status ?? "",
      workspace_id: initialData.filters.workspace_id ?? "",
      claim_family: initialData.filters.claim_family ?? "",
      signal: initialData.filters.signal ?? "",
    }),
    [initialData.filters]
  );

  function navigateWithFilters(
    nextFilters: ReviewQueuePageData["filters"],
    nextSelectedId?: string
  ) {
    startTransition(() => {
      router.push(`/review-items${buildQueryString(nextFilters, nextSelectedId)}`);
    });
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    navigateWithFilters({
      status: String(formData.get("status") || "") || undefined,
      workspace_id: String(formData.get("workspace_id") || "") || undefined,
      claim_family: String(formData.get("claim_family") || "") || undefined,
      signal: String(formData.get("signal") || "") || undefined,
    });
  }

  function handleSelectItem(id: string) {
    setActionError(null);
    setActionMessage(null);
    navigateWithFilters(initialData.filters, id);
  }

  async function handleStatusUpdate(status: string) {
    if (!selectedId) {
      return;
    }

    setActionError(null);
    setActionMessage(null);

    const result = await updateReviewItemStatusAction(selectedId, status);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setActionMessage(`Status updated to ${result.item.status}.`);
    startTransition(() => {
      router.refresh();
    });
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
            activeStatus={initialData.filters.status}
            onSelectStatus={(status) =>
              navigateWithFilters({ ...initialData.filters, status })
            }
          />

          <form style={styles.filters} onSubmit={handleFilterSubmit}>
            <label style={styles.label}>
              Status
              <select name="status" defaultValue={filterInputs.status} style={styles.input}>
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
                defaultValue={filterInputs.workspace_id}
                style={styles.input}
                placeholder="demo-workspace-spa-menu"
              />
            </label>
            <label style={styles.label}>
              Claim family
              <input
                name="claim_family"
                defaultValue={filterInputs.claim_family}
                style={styles.input}
                placeholder="magnesium_cortisol_stress"
              />
            </label>
            <label style={styles.label}>
              Signal
              <input
                name="signal"
                defaultValue={filterInputs.signal}
                style={styles.input}
                placeholder="human_review_required"
              />
            </label>
            <label style={styles.label}>
              <span>&nbsp;</span>
              <button type="submit" style={styles.actionButton} disabled={isPending}>
                Apply filters
              </button>
            </label>
          </form>

          <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
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
                    <tr key={item.id} style={isSelected ? styles.rowSelected : undefined}>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.rowButton}
                          onClick={() => handleSelectItem(item.id)}
                        >
                          {item.status}
                        </button>
                      </td>
                      <td style={styles.td}>{item.signal ?? "—"}</td>
                      <td style={styles.td}>{item.severity ?? "—"}</td>
                      <td style={styles.td}>{item.claim_family}</td>
                      <td style={styles.td}>{item.workspace_id}</td>
                      <td style={styles.td}>{item.client_claim_id}</td>
                      <td style={styles.td}>{truncate(item.summary)}</td>
                      <td style={styles.td}>{formatTimestamp(item.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside style={styles.panel}>
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Review item detail</h2>

          {!selectedId && (
            <div style={styles.info}>Select a review item from the table to inspect it.</div>
          )}

          {initialData.selectedErrorMessage && (
            <div style={styles.error}>{initialData.selectedErrorMessage}</div>
          )}

          {initialData.selectedItem && (
            <>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>ID</div>
                <div>{initialData.selectedItem.id}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Status</div>
                <div>{initialData.selectedItem.status}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Signal</div>
                <div>{initialData.selectedItem.signal ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Severity</div>
                <div>{initialData.selectedItem.severity ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Workspace ID</div>
                <div>{initialData.selectedItem.workspace_id}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Client claim ID</div>
                <div>{initialData.selectedItem.client_claim_id}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Claim family</div>
                <div>{initialData.selectedItem.claim_family}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Evidence alert ID</div>
                <div>{initialData.selectedItem.evidence_alert_id ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Watch run ID</div>
                <div>{initialData.selectedItem.watch_run_id ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Summary</div>
                <div>{initialData.selectedItem.summary ?? "—"}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Created</div>
                <div>{formatTimestamp(initialData.selectedItem.created_at)}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Updated</div>
                <div>{formatTimestamp(initialData.selectedItem.updated_at)}</div>
              </div>

              <div>
                <div style={styles.detailLabel}>Update status</div>
                <div style={styles.actions}>
                  {REVIEW_QUEUE_STATUS_OPTIONS.map((status) => {
                    const isActive = initialData.selectedItem?.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusUpdate(status)}
                        style={{
                          ...styles.actionButton,
                          ...(isActive ? styles.actionButtonActive : {}),
                        }}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {actionError && <div style={styles.error}>{actionError}</div>}
              {actionMessage && <div style={styles.success}>{actionMessage}</div>}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

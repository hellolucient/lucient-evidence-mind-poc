import type { ReviewQueueAccessContext } from "@/lib/operator-auth";

export type ReviewQueueAuthPanelData = {
  mode: "operator" | "break_glass";
  accessLabel: string;
  operatorEmail: string | null;
  workspaceScopeLabel: string;
  showLogout: boolean;
};

const OPERATOR_ACCESS_LABEL = "Supabase operator session";
const BREAK_GLASS_ACCESS_LABEL = "Break-glass internal access active";

export function formatReviewQueueWorkspaceScope(
  access: ReviewQueueAccessContext
): string {
  if (access.mode === "break_glass") {
    return "All workspaces (break-glass)";
  }

  if (access.workspaceIds.length === 0) {
    return "No workspace scope";
  }

  return access.workspaceIds.join(", ");
}

export function buildReviewQueueAuthPanelData(
  access: ReviewQueueAccessContext,
  operatorEmail: string | null | undefined
): ReviewQueueAuthPanelData {
  if (access.mode === "operator") {
    const safeEmail = sanitizeOperatorEmail(operatorEmail);

    return {
      mode: "operator",
      accessLabel: OPERATOR_ACCESS_LABEL,
      operatorEmail: safeEmail,
      workspaceScopeLabel: formatReviewQueueWorkspaceScope(access),
      showLogout: true,
    };
  }

  return {
    mode: "break_glass",
    accessLabel: BREAK_GLASS_ACCESS_LABEL,
    operatorEmail: null,
    workspaceScopeLabel: formatReviewQueueWorkspaceScope(access),
    showLogout: false,
  };
}

export function sanitizeOperatorEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }

  return trimmed;
}

export function reviewQueueAuthPanelSafeFields(
  panel: ReviewQueueAuthPanelData
): Record<string, unknown> {
  return {
    mode: panel.mode,
    accessLabel: panel.accessLabel,
    operatorEmail: panel.operatorEmail,
    workspaceScopeLabel: panel.workspaceScopeLabel,
    showLogout: panel.showLogout,
  };
}

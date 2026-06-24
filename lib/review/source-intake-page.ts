import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  isSourceIntakePersistenceConfigured,
  listSourceIntakeDocuments,
} from "@/lib/watch/source-intake-store";

export type SourceIntakePageData = {
  configured: boolean;
  defaultWorkspaceId: string;
  recentDocuments: Array<{
    source_document_id: string;
    title: string | null;
    source_type: string;
    created_at: string;
  }>;
  listError: string | null;
  listErrorMessage: string | null;
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

export function parseSourceIntakePageWorkspaceId(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): string {
  const fromQuery = readParam(params, "workspace_id");
  if (fromQuery?.trim()) {
    return fromQuery.trim();
  }

  if (access.mode === "operator") {
    return access.workspaceIds[0] ?? "demo-workspace-spa-menu";
  }

  return "demo-workspace-spa-menu";
}

export async function buildSourceIntakePageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<SourceIntakePageData> {
  const defaultWorkspaceId = parseSourceIntakePageWorkspaceId(params, access);

  if (!isSourceIntakePersistenceConfigured()) {
    return {
      configured: false,
      defaultWorkspaceId,
      recentDocuments: [],
      listError: "supabase_not_configured",
      listErrorMessage:
        "Supabase is not configured. Apply Phase 45 migration and set Supabase credentials.",
    };
  }

  const list = await listSourceIntakeDocuments(access, {
    workspace_id: defaultWorkspaceId,
    limit: 20,
  });

  return {
    configured: true,
    defaultWorkspaceId,
    recentDocuments: list.documents.map((doc) => ({
      source_document_id: doc.source_document_id,
      title: doc.title,
      source_type: doc.source_type,
      created_at: doc.created_at,
    })),
    listError: list.error ?? null,
    listErrorMessage: list.error
      ? "Unable to load source documents. Apply Phase 45 migration in Supabase."
      : null,
  };
}

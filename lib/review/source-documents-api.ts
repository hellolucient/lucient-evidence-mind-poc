/**
 * Phase 45 — source intake documents API aggregation.
 */
import { applyWorkspaceScopeToListFilters, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { MIND_CLAIM_INTELLIGENCE_PHASE } from "@/lib/review/mind-claim-intelligence-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  createSourceIntakeDocument,
  getSourceIntakeDocumentById,
  isSourceIntakePersistenceConfigured,
  listSourceIntakeDocuments,
  SOURCE_INTAKE_DOCUMENT_PRIVATE_FIELDS,
  type PrivacySafeSourceIntakeDocument,
} from "@/lib/watch/source-intake-store";
import { recordMindClaimIntelligenceAuditEvent } from "@/lib/watch/mind-claim-intelligence-audit-store";

export const SOURCE_DOCUMENTS_API_ROUTE = "/api/source-documents" as const;
export const sourceDocumentDetailApiRoute = (id: string) =>
  `/api/source-documents/${encodeURIComponent(id)}` as const;

export async function buildCreateSourceDocumentApiResponse(
  body: {
    workspace_id?: string;
    title?: string | null;
    source_text?: string;
    source_type?: string;
    created_by?: string | null;
  },
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "workspace_id_required",
        phase: CURRENT_WATCH_PHASE,
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
        route: SOURCE_DOCUMENTS_API_ROUTE,
      },
    };
  }

  const result = await createSourceIntakeDocument(
    {
      workspace_id: workspaceId,
      title: body.title,
      source_text: body.source_text ?? "",
      source_type: (body.source_type as "spa_wellness_copy") ?? "spa_wellness_copy",
      created_by: body.created_by,
    },
    access
  );

  if (!result.ok) {
    return {
      status: result.error === "forbidden" ? 403 : 400,
      body: {
        ok: false,
        error: result.error,
        phase: CURRENT_WATCH_PHASE,
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
        route: SOURCE_DOCUMENTS_API_ROUTE,
      },
    };
  }

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: workspaceId,
      entity_type: "source_intake_document",
      entity_id: result.document.source_document_id,
      event_type: "created",
      event_summary: "Source intake document saved.",
      actor: body.created_by ?? null,
    },
    access
  );

  return {
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      route: SOURCE_DOCUMENTS_API_ROUTE,
      configured: isSourceIntakePersistenceConfigured(),
      document: result.document,
    },
  };
}

export async function buildListSourceDocumentsApiResponse(
  searchParams: URLSearchParams,
  access: ReviewQueueAccessContext
): Promise<Record<string, unknown>> {
  const filters = applyWorkspaceScopeToListFilters(
    {
      workspace_id: searchParams.get("workspace_id") ?? undefined,
      limit: Number(searchParams.get("limit")) || undefined,
    },
    access
  );

  const list = await listSourceIntakeDocuments(access, filters);

  return {
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
    route: SOURCE_DOCUMENTS_API_ROUTE,
    configured: isSourceIntakePersistenceConfigured(),
    count: list.documents.length,
    documents: list.documents,
    list_error: list.error ?? null,
  };
}

export async function buildSourceDocumentDetailApiResponse(
  documentId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const lookup = await getSourceIntakeDocumentById(documentId, access);

  if (lookup.error === "forbidden") {
    return {
      status: 403,
      body: {
        ok: false,
        error: "forbidden",
        phase: CURRENT_WATCH_PHASE,
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  if (!lookup.document) {
    return {
      status: 404,
      body: {
        ok: false,
        error: lookup.error ?? "source_document_not_found",
        phase: CURRENT_WATCH_PHASE,
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      configured: isSourceIntakePersistenceConfigured(),
      document: lookup.document,
    },
  };
}

export function isPrivacySafeSourceDocumentPayload(
  payload: Record<string, unknown>
): payload is PrivacySafeSourceIntakeDocument {
  for (const field of SOURCE_INTAKE_DOCUMENT_PRIVATE_FIELDS) {
    if (field in payload) {
      return false;
    }
  }

  return "source_document_id" in payload;
}

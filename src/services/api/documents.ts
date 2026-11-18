import { z } from "zod";
import { buildSimulatedUploadAnalysis, getMockAnalysis, mockDocuments } from "@/lib/mock-data/documents";
import { documentAnalysisSchema, documentSchema } from "@/lib/validation/contracts";
import type { DocumentRecord, DocumentType } from "@/types";
import { ApiError, resolve } from "./client";

/** Documents uploaded during this browser session (mock mode only; lost on reload). */
const sessionUploads = new Map<string, DocumentRecord>();
let uploadCounter = 1043;

/** GET /documents — uploaded documents and their analysis status. */
export function getDocuments() {
  return resolve({
    path: "/documents",
    schema: z.array(documentSchema),
    mock: () => [...Array.from(sessionUploads.values()).reverse(), ...mockDocuments],
  });
}

/**
 * POST /documents (multipart/form-data: file, document_type)
 * Registers a PDF for analysis. In mock mode the file never leaves the
 * browser and its contents are not read.
 */
export function uploadDocument(file: File, documentType: DocumentType, uploadedBy: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("document_type", documentType);
  return resolve({
    path: "/documents",
    method: "POST",
    body: form,
    schema: documentSchema,
    mock: () => {
      const record: DocumentRecord = {
        document_id: `DOC-${uploadCounter++}`,
        file_name: file.name,
        document_type: documentType,
        manufacturer_name: null,
        size_bytes: file.size,
        page_count: null,
        uploaded_at: new Date().toISOString(),
        uploaded_by: uploadedBy,
        analysis_status: "queued",
      };
      sessionUploads.set(record.document_id, record);
      return record;
    },
  });
}

/** Mock-only helper: advances an uploaded document through its simulated processing states. */
export function setMockDocumentStatus(documentId: string, status: DocumentRecord["analysis_status"]) {
  const record = sessionUploads.get(documentId);
  if (record) sessionUploads.set(documentId, { ...record, analysis_status: status });
}

/** GET /documents/{document_id}/analysis — classification and clause extraction results. */
export function getDocumentAnalysis(documentId: string) {
  return resolve({
    path: `/documents/${encodeURIComponent(documentId)}/analysis`,
    schema: documentAnalysisSchema,
    mock: () => {
      const seeded = getMockAnalysis(documentId);
      if (seeded) return seeded;
      const uploaded = sessionUploads.get(documentId);
      if (uploaded) return buildSimulatedUploadAnalysis(uploaded);
      throw new ApiError(`No analysis found for ${documentId}.`, "http", 404);
    },
  });
}

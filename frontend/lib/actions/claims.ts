"use server";

// ─── Claims Server Actions ───────────────────────────────────────────────────
// Handles fetching claims list, claim details, OCR processing, and submission.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPostMultipart, API_PREFIX } from "@/lib/api/client";
import type {
  ClaimSummary,
  DetailedClaim,
  ReimbursementRaw,
  DocumentUploadResponse,
  EditDocumentRequest,
  EditDocumentResponse,
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/api/types";
import { mapReimbursementToClaim } from "@/lib/api/types";

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all claims, optionally filtered by status. */
export async function getClaims(status?: string): Promise<ClaimSummary[]> {
  const query = status && status !== "All" ? `?status=${status}` : "";
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/${query}`);
  if (result.data) return result.data.map(mapReimbursementToClaim);
  return [];
}

/** Fetch full details of a specific claim. */
export async function getClaimById(
  id: string
): Promise<DetailedClaim | null> {
  const result = await apiGet<ReimbursementRaw>(`${API_PREFIX}/reimbursements/${id}`);
  if (!result.data) return null;
  const summary = mapReimbursementToClaim(result.data);
  return {
    ...summary,
    timeline: [],
    receipts: [],
    clientName: "",
    purpose: "",
  };
}

/** Upload receipt files to backend for OCR processing. */
export async function uploadDocuments(files: File[]): Promise<DocumentUploadResponse | { error: string }> {
  try {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    const result = await apiPostMultipart<DocumentUploadResponse>(`${API_PREFIX}/documents/upload`, form);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

/** Send human OCR corrections to a specific document. */
export async function editDocument(
  documentId: string,
  edits: EditDocumentRequest
): Promise<EditDocumentResponse | { error: string }> {
  try {
    const result = await apiPost<EditDocumentResponse>(`${API_PREFIX}/documents/${documentId}/edits`, edits);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Edit failed" };
  }
}

/** Run compliance analysis on an uploaded settlement against a policy. */
export async function analyzeCompliance(
  req: AnalyzeRequest
): Promise<AnalyzeResponse | { error: string }> {
  try {
    const result = await apiPost<AnalyzeResponse>(`${API_PREFIX}/reimbursements/analyze`, req);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Analysis failed" };
  }
}

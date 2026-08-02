const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-token"}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Mirrors the 9 endpoints defined in the product brief §7.3 / backend/app/api

export const createAsset = (payload: {
  modality: string;
  owner: string;
  topic?: string;
  concept_tags?: string[];
  storage_url: string;
  permission_scope?: string[];
}) => request<{ asset_id: string; job_id: string; status: string; duplicate: boolean }>("/api/assets", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const startProcessingJob = (assetId: string) =>
  request<{ job_id: string; asset_id: string; stage: string }>("/api/processing-jobs", {
    method: "POST",
    body: JSON.stringify({ asset_id: assetId }),
  });

export const getProcessingJob = (jobId: string) =>
  request<{ job_id: string; asset_id: string; stage: string; error: string | null }>(
    `/api/processing-jobs/${jobId}`
  );

export const generateEmbeddings = (segmentIds: string[]) =>
  request<{ updated_count: number }>("/api/embeddings", {
    method: "POST",
    body: JSON.stringify({ segment_ids: segmentIds }),
  });

export type EvidenceItem = {
  segment_id: string;
  asset_id: string;
  modality: string;
  text_content: string;
  timestamp_start: number | null;
  timestamp_end: number | null;
  similarity: number;
  permitted: boolean;
  match_type: "text" | "visual";
};

export const runQuery = (questionText: string, topK = 10) =>
  request<{
    query_id: string;
    retrieved_evidence: EvidenceItem[];
    agent_plan: { search_terms: string; top_k: number; reasoning: string };
  }>("/api/query", {
    method: "POST",
    body: JSON.stringify({ question_text: questionText, top_k: topK }),
  });

export const synthesize = (queryId: string, retrievedEvidence: EvidenceItem[]) =>
  request<{
    insight_id: string;
    answer_text: string;
    citations: Record<string, unknown>[];
    confidence: number | null;
    status: string;
  }>("/api/synthesize", {
    method: "POST",
    body: JSON.stringify({ query_id: queryId, retrieved_evidence: retrievedEvidence }),
  });

export const archiveProcessingJob = (jobId: string) =>
  request<{ job_id: string; asset_id: string; stage: string; error: string | null }>(
    `/api/processing-jobs/${jobId}/archive`,
    { method: "POST" }
  );

export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export const getAuditLog = (limit = 50) => request<AuditLogEntry[]>(`/api/audit-log?limit=${limit}`);

export const getInsight = (insightId: string) =>
  request<{
    insight_id: string;
    query_id: string;
    answer_text: string;
    citations: Record<string, unknown>[];
    confidence: number | null;
    status: string;
  }>(`/api/insights/${insightId}`);

export const submitReviewFeedback = (payload: {
  insight_id: string;
  decision: "accept" | "edit" | "reject" | "escalate";
  notes?: string;
}) =>
  request<{ feedback_id: string; insight_id: string; decision: string }>("/api/review-feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMetrics = () => request<Record<string, unknown>>("/api/metrics");

# API Documentation

Base URL: `http://localhost:8000` (local) — see `deployment/backend_hosting.md` for production.

All routes require `Authorization: Bearer <token>`.

## POST /api/assets

Register a new video, image, slide, transcript, quiz, or discussion asset.

```json
// Request
{
  "modality": "video",
  "owner": "content-team@coursera.org",
  "topic": "Backpropagation",
  "concept_tags": ["neural-networks"],
  "storage_url": "https://storage.example.com/backprop.mp4",
  "permission_scope": ["course:neural-networks-101"]
}
// Response
{ "asset_id": "uuid", "job_id": "uuid", "status": "uploaded" }
```

## POST /api/processing-jobs

Start preprocessing, segmentation, extraction, and metadata normalization.

```json
// Request
{ "asset_id": "uuid" }
// Response
{ "job_id": "uuid", "asset_id": "uuid", "stage": "uploaded" }
```

## GET /api/processing-jobs/{job_id}

Retrieve job status, warnings, failures, and output records.

```json
{ "job_id": "uuid", "asset_id": "uuid", "stage": "indexed", "error": null }
```

## POST /api/embeddings

Generate or refresh embeddings for approved asset segments.

```json
// Request
{ "segment_ids": ["uuid", "uuid"] }
// Response
{ "updated_count": 2 }
```

## POST /api/query

Accept a unified user query and run permission-aware retrieval across modalities.

```json
// Request
{ "question_text": "Why are learners struggling with backpropagation?", "top_k": 10 }
// Response
{ "query_id": "uuid", "retrieved_evidence": [ { "segment_id": "uuid", "modality": "discussion", "text_content": "...", "similarity": 0.81 } ] }
```

## POST /api/synthesize

Generate grounded insight packs from retrieved evidence.

```json
// Request
{ "query_id": "uuid", "retrieved_evidence": [ /* from /api/query */ ] }
// Response
{ "insight_id": "uuid", "answer_text": "...", "citations": [ { "segment_id": "uuid", "reason": "..." } ], "confidence": 0.74, "status": "pending_review" }
```

## GET /api/insights/{insight_id}

Retrieve generated output, citations, evidence records, and status.

## POST /api/review-feedback

Store accept, edit, reject, escalation, and quality-feedback actions.

```json
// Request
{ "insight_id": "uuid", "decision": "accept", "notes": "Matches what we saw in support tickets." }
// Response
{ "feedback_id": "uuid", "insight_id": "uuid", "decision": "accept" }
```

## GET /api/metrics

Return pipeline health, retrieval quality, review outcomes, and usage metrics.

```json
{
  "pipeline_health": { "total_jobs": 12, "failed_jobs": 1, "failure_rate": 0.083 },
  "review_outcomes": { "total_insights": 5, "reviewed_insights": 3, "pending_review": 2 }
}
```

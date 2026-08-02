# Architecture

## Workflow

```
Input (video/image/slide/transcript/quiz/discussion)
  -> Preprocessing (pipelines/)
  -> Embeddings (ai/embeddings/)
  -> Unified Query (backend/app/api/query.py)
  -> Retrieval (ai/retrieval/, permission-aware pgvector search)
  -> LLM Synthesis (ai/synthesis/, cited + grounded)
  -> Human Review (backend/app/api/review_feedback.py)
```

This matches the product brief's required workflow exactly (§1, §6.1).

## Repo-to-layer mapping

| Doc layer (§6.2) | Repo folder |
|---|---|
| Frontend/Product Layer | `frontend/` |
| Backend/API Layer | `backend/` |
| AI Workflow Layer | `ai/` |
| Media Processing | `pipelines/` |
| Multimodal Data Layer | Postgres + pgvector, managed via `backend/app/database/` |

## Data flow detail

1. `POST /api/assets` registers an asset and creates a `ProcessingJob` in stage `uploaded`.
2. `POST /api/processing-jobs` (or a worker) runs the matching `pipelines/*_processing` step, producing `raw_units`.
3. `pipelines/indexing/index_segments.py` normalizes those units (`ai/preprocessing`), embeds them (`ai/embeddings`), and writes `Segment` rows — job advances to `indexed`.
4. `POST /api/query` embeds the question and runs permission-aware cosine-similarity search (`ai/retrieval`) across all modalities in one call.
5. `POST /api/synthesize` passes only the retrieved, permitted evidence to the LLM (`ai/synthesis`), which must cite every claim.
6. `POST /api/review-feedback` records a human decision (accept/edit/reject/escalate) before an insight is treated as approved.

## Design principle

Every `Segment` retains `asset_id`, `modality`, and `timestamp_start/end`, so
every citation in a synthesized insight can be traced back to its exact
source — required by doc §5.4 and graded under "Evidence Traceability" (§3).

## Non-goals for v1

- Raw pixel/CLIP-style image embeddings (using OCR/caption text instead — see `pipelines/image_processing/`)
- Multi-service deployment (single FastAPI backend + single Next.js frontend, not microservices)
- Automated job workers/queues (jobs are tracked via a `ProcessingJob` status column, invoked synchronously for the demo)

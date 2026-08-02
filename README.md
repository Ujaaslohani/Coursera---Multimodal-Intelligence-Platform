# Coursera Multimodal Intelligence Platform

A governed AI platform for cross-modal learning analytics, content intelligence,
and evidence-backed improvement recommendations. Built against the product
brief's specification: input (video/image/text/quiz/slide/discussion) →
preprocessing → embeddings → unified query → retrieval → LLM synthesis →
human review.

## Repository structure

This repo follows the structure specified in the product brief §7.1. Backend
API routes match §7.3 exactly; everything else follows the brief's intended
folder responsibilities, with implementation details (frameworks, extra
helper modules) filled in where the brief left them open.

```
├── frontend/     # Next.js product UI — dashboards, query workspace, evidence panel
├── backend/      # FastAPI service — asset/job/query/synthesis/review APIs (§7.3)
├── ai/           # Embedding generation, retrieval ranking, LLM synthesis, prompts, eval
├── pipelines/    # Modality-specific preprocessing: video, image, text, indexing
├── data/         # Sample assets, schemas, sample queries, evaluation cases
├── docs/         # Architecture notes, API docs, deployment guide, demo script, screenshots
├── tests/        # Functional, retrieval, AI-output, and edge-case tests
└── deployment/   # Vercel/backend hosting notes, environment setup
```

## Status

Everything below has been **run for real**, not just written: real Supabase
Postgres+pgvector database, real OpenAI embeddings/synthesis, real HTTP
requests against a running backend, real browser sessions against a running
frontend.

| Folder | Status |
|---|---|
| `backend/` | 9 API routes from §7.3, all verified over live HTTP with a real signed JWT. Real auth (HS256, `PyJWT`, `permitted_sources` claim actually enforced — see `backend/scripts/mint_dev_token.py`). Duplicate-asset detection implemented and tested. `POST /api/processing-jobs` actually runs the pipeline synchronously (not just a status flip) — verified taking a job from `uploaded` to `indexed` over HTTP. CORS enabled for the frontend origin. |
| `frontend/` | Next.js app, all 6 product surfaces, driven end-to-end with Playwright against the live backend — asset registration, query + cited evidence, dashboards, all confirmed rendering with real data and zero console errors. `next` bumped 14.2.15→14.2.35 (critical→high severity npm audit fix; full remediation needs a major-version bump out of this project's scope, but the app doesn't use the flagged features — no Server Actions/Middleware/`next/image`). |
| `ai/` | Preprocessing, embeddings, permission-aware retrieval, LLM synthesis with citations, prompts, evaluation harness — proven producing grounded, cross-modal, cited answers against real seeded data. |
| `pipelines/` | Text/discussion/quiz cleaning and slide-PDF extraction (PyMuPDF) run for real. Video (ffmpeg) and image OCR (tesseract) are **not runnable in this environment** — verified missing, not assumed; jobs for those modalities fail visibly with a clear error rather than silently no-op'ing. See `pipelines/README.md`. |
| `data/` | Hand-authored demo course (backprop, all 6 modalities) + real data pulled live from Hugging Face (`data/scripts/fetch_datasets.py`) — both seeded into the live database. |
| `docs/` | Architecture, API documentation, deployment guide, demo script. |
| `tests/` | Functional/retrieval/AI-output/edge-case tests. AI-output tests are pure-unit and verified passing. DB-dependent tests skip cleanly without `TEST_DATABASE_URL` (deliberately out of scope for now). |
| `deployment/` | Notes written; **nothing deployed yet** (deliberately out of scope for now). |

**Known, deliberate gaps** (not deployment, not silently skipped): no
`TEST_DATABASE_URL`-backed test run yet, no git repo initialized yet, no
deployment to Vercel/Render yet, no demo video yet.

## Design principle

Every generated insight must retain source lineage (asset ID, segment ID,
modality, timestamp) back to the original video, image, slide, transcript,
quiz, or discussion evidence it was built from. No recommendation is treated
as operationally approved until a human reviewer accepts it.

## Getting started

Each top-level folder has its own README. To run the full stack locally, see
`deployment/environment_setup.md` — it starts the backend (which pulls in
`ai/` and `pipelines/`) and the frontend together. To see the intended user
flow end to end, read `docs/demo_script.md`.

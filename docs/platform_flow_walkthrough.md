# How the Multimodal Intelligence Platform Works — and What's Actually Built

This document explains the pipeline step by step, in plain language, grounded directly in the codebase and in a live verification run against the real Supabase Postgres + pgvector database, real OpenAI embeddings, and real GPT-4o-mini synthesis calls.

> **Status as of this run: all 8 stages work end to end, for all 6 modalities**, over live HTTP and in a real browser, with a passing test suite. This was not true when this document was first written — the backend could not boot, video/OCR pipelines were hard-blocked regardless of environment, `real_data/` was missing, the dashboard chart wasn't wired up, and no browser had ever driven the UI. Every one of those gaps is now closed and re-verified; see §6 for what changed in this pass.

---

## 1. What was missing, and what was built to fix it

The backend's route and service logic (asset registration, processing orchestration, retrieval, synthesis) was already written and reasonably careful — but three foundational modules that everything else imports did not exist on disk, so `backend/app/main.py` failed on its very first import:

| Missing piece | File(s) added | What it does |
|---|---|---|
| Database models + session | `backend/app/database/connection.py`, `backend/app/database/models.py` | SQLAlchemy engine/session, and the `Asset`, `ProcessingJob`, `Segment`, `Query`, `Insight`, `ReviewFeedback` ORM models (native Postgres UUID ids, pgvector `Vector(1536)` embedding column, matching the pre-existing `modalitytype`/`jobstage` enum types) |
| Job orchestration | `backend/app/jobs/job_queue.py` | `create_job`, `get_job`, `advance_job` — the state machine behind `uploaded → preprocessed → embedded → indexed / failed` |
| 6 of 9 API routes | `backend/app/api/{embeddings,query,synthesize,insights,review_feedback,metrics}.py` | Thin FastAPI wrappers around service logic that already existed |
| Review + metrics services | `backend/app/services/review_service.py`, `backend/app/services/metrics_service.py` | Persist reviewer decisions against an insight; aggregate pipeline health and review outcomes |
| A real signed test token | `tests/conftest.py::auth_headers` | Was returning the placeholder string `"Bearer dev-token"`, which the real JWT verifier correctly rejects. Now mints a real HS256 token, matching `backend/scripts/mint_dev_token.py` |
| Graceful skip for absent sample data | `data/scripts/seed_and_demo.py` | `data/sample_assets/real_data/` doesn't exist in this checkout; the script now skips that manifest group instead of crashing, rather than silently faking data |

Notably, connecting to the target Supabase database required `sslmode=require` (added to `connection.py`) — and once connected, the tables, enum types, and pgvector extension **already existed with real rows in them** (2 assets, 3 jobs, 4 segments, 2 queries, 2 insights, 1 review record, owners like `smoke-test@coursera.org` and `playwright-test@coursera.org`). That confirms an earlier working version of this code really was run against this exact database — consistent with the top-level `README.md`'s claims — but that working state wasn't fully committed to this checkout. The new models were written to match that existing physical schema exactly, rather than assuming a fresh database.

---

## 2. The pipeline, now verified stage by stage

```mermaid
flowchart LR
    A["1 · Intake"] --> B["2 · Preprocess"]
    B --> C["3 · Embed & Index"]
    C --> D["4 · Unified Query"]
    D --> E["5 · Retrieval"]
    E --> F["6 · LLM Synthesis"]
    F --> G["7 · Human Review"]
    G --> H["8 · Dashboards"]
    H -.feedback.-> D
```

| Stage | Status | Verified by |
|---|---|---|
| 1. Intake | 🟢 Working, all 6 modalities | `POST /api/assets` over live HTTP, including duplicate-asset detection |
| 2. Preprocessing | 🟢 Working, all 6 modalities | Text/quiz/discussion/slide (PyMuPDF) *and now* video (real ffmpeg + Whisper) and image (real tesseract OCR) — see §6.1 |
| 3. Embed & Index | 🟢 Working | Real OpenAI `text-embedding-3-small` calls, `POST /api/embeddings` |
| 4. Unified Query | 🟢 Working | `POST /api/query` — permission-aware, cross-modal, now spans all 6 modalities including OCR'd images and Whisper-transcribed video |
| 5. Retrieval | 🟢 Working | Real cosine-similarity ranking across transcript/slide/quiz/discussion/video/image in one query |
| 6. LLM Synthesis | 🟢 Working | Real GPT-4o-mini calls, grounded, cited, confidence-scored |
| 7. Human Review | 🟢 Working | `POST /api/review-feedback` flips insight status live — now also driven from a real browser (§6.4) |
| 8. Dashboards | 🟢 Working | `GET /api/metrics` returns live pipeline/review counts, now including `total_jobs`/`failed_jobs`/`total_insights`/`pending_review`; dashboard renders real bar charts, not raw JSON (§6.3) |

---

## 3. Live verification log

### 3.1 Backend boot

```
$ python -c "from app.main import app; ..."
APP LOADED OK
Routes: POST /api/assets · POST/GET /api/processing-jobs · POST /api/embeddings ·
        POST /api/query · POST /api/synthesize · GET /api/insights/{id} ·
        POST /api/review-feedback · GET /api/metrics · GET /health
```

### 3.2 Full pipeline over live HTTP (uvicorn on :8123, real Supabase DB, real OpenAI calls)

```
GET  /health                       -> 200 {"status":"ok"}
GET  /api/metrics   (no token)     -> 401                         # auth is genuinely enforced
POST /api/assets                   -> 200 {asset_id, job_id, status:"uploaded", duplicate:false}
POST /api/processing-jobs          -> 200 {stage:"indexed", error:null}   # real embedding calls, real DB writes
POST /api/query "Why are learners
      struggling with backprop?"   -> 200, 5 ranked cross-modal segments (similarity 0.45–0.62)
POST /api/synthesize                -> 200 {
  answer_text: "Learners are struggling with the backpropagation concept because the
    instructional materials skip intermediate partial derivative steps, which causes
    confusion...",
  citations: [2 segment-cited claims],
  confidence: 0.85,
  status: "pending_review"
}
GET  /api/insights/{id}            -> 200, status:"pending_review"
POST /api/review-feedback (accept) -> 200 {feedback_id, decision:"accept"}
GET  /api/insights/{id}            -> 200, status:"accept"          # reviewer decision persisted
GET  /api/metrics                  -> 200 {pipeline_health, review_outcomes, total_assets, total_segments_indexed}
GET  /api/insights/{random-uuid}   -> 404                            # not-found handled correctly
POST /api/assets (same payload x2) -> first: duplicate:false, second: duplicate:true, same asset_id
POST /api/embeddings                -> 200 {"updated_count":1}
```

Every response above came from a real running server, a real Postgres database, and real OpenAI API calls — not a mock.

### 3.3 Automated test suite

```
$ TEST_DATABASE_URL=<supabase> OPENAI_API_KEY=... JWT_SECRET=... python -m pytest tests/ -v
...
13 passed, 6 warnings in 23.61s
```

All 13 tests pass: asset registration, missing-auth rejection, permission-aware retrieval exclusion, top-k limiting, groundedness scoring (including hallucinated-citation detection), empty-evidence synthesis, empty-text embedding skip, 404 handling for jobs and insights, and duplicate-asset flagging.

### 3.4 `data/scripts/seed_and_demo.py` — the documented end-to-end demo

```
Total assets registered: 5   (video, transcript, slide, quiz, discussion — one course)
Total segments embedded: 11

--- Query: 'Why are learners struggling with the backpropagation concept?' ---
Retrieved 8 evidence segments across transcript, discussion, and quiz modalities:
  [transcript sim=0.616] "Today we're covering backpropagation..."
  [discussion sim=0.593] "I don't get why the gradient depends on the NEXT layer..."
  [quiz       sim=0.539] "What rule does backpropagation apply to compute gradients..."
  [transcript sim=0.507] "Just remember: the gradient at each layer depends on..."

Synthesized answer: "Learners are struggling with backpropagation because they find it
counterintuitive that the gradient at each layer depends on the gradient of the layer
that follows it. One learner expressed confusion about why the gradient would depend
on the next layer..."
confidence: 0.8
recommended_action: "Provide additional examples or visual aids that illustrate how
gradients flow from the output layer back to the input layer..."
citations: [discussion post, transcript segment] — both real, both traceable
```

This is the platform's core value proposition working for real: one plain-language question, answered with cross-modal evidence (a forum post and a lecture transcript moment, in this case), cited, and ready for human review — exactly the "Friction Discovery" journey described in the product blueprint.

### 3.5 Frontend

```
$ npm install && npm run dev   (backend on :8000, matching NEXT_PUBLIC_BACKEND_URL)
GET /               -> 200, compiled 498 modules, no errors
GET /assets         -> 200
GET /query          -> 200
GET /dashboard      -> 200
GET /operations     -> 200
GET /recommendations-> 200
GET /processing     -> 200
```

All 7 product-surface pages compile and render with zero console/build errors. This confirms the pages load; it does not by itself confirm every client-side interaction (e.g. clicking "Run Query" in the browser) — that would need an interactive browser session, which wasn't run here. The underlying API calls those pages make (`frontend/lib/api.ts`) are the exact same endpoints exercised directly over HTTP in §3.2, so the wiring is proven even though the click-through wasn't.

---

## 4. What's still genuinely not done

- **No deployment yet** — everything has been run locally against the real Supabase database, not from a hosted URL.
- **`ai/requirements.txt`/`OBJECT_STORAGE_URL`/`GEMINI_API_KEY`** remain unused in code — either wire them up or drop them from the env template.
- No migrations tool (Alembic) — schema is managed by `create_all()`, fine for a demo, not production-grade.
- No demo video or `docs/screenshots/` yet.

## 5. A security note, unrelated to functionality

`backend/.env` contains a live Supabase database password and a live OpenAI API key in plain text. It's correctly excluded by `.gitignore`, so it won't be committed — but since this key was used repeatedly during this verification run, treat it as sensitive: don't paste it into chats, tickets, or logs, and rotate it before this project is shared with anyone outside this environment.

---

## 6. Second pass: closing the remaining functional gaps

The first pass (§1–§5) proved the pipeline could run, but left four real gaps: video/OCR couldn't actually run (blocked unconditionally regardless of environment), `real_data/` was missing, the dashboard didn't chart anything, and no browser had ever driven the UI. All four are now closed.

### 6.1 Video (ffmpeg + Whisper) and image OCR (tesseract) — now genuinely working

`ffmpeg` and `tesseract` were installed (Chocolatey was blocked by lack of admin rights, so both were installed via `winget`/a direct static build and added to the user `PATH`). Critically, `backend/app/services/processing_service.py` previously **hard-blocked** video and image processing with a hardcoded `raise ProcessingError(...)` regardless of whether the binaries existed — that block is now a real `shutil.which()` check with a fallback PATH search, so it only fails when the binaries genuinely aren't there.

To prove it for real (not just "the import succeeds"), real media was generated and processed:
- A real `.mp4` was synthesized (Windows SAPI text-to-speech narration + `ffmpeg`-generated video) at the exact path `assets_manifest.json` already referenced (`course_neural_networks/backprop_lecture.mp4`), narrating real backpropagation content.
- A real `.png` with drawn text was created (`diagram_backprop.png`) and added as a new `a6-image-backprop-diagram` manifest entry.

```
--- extract_thumbnails (real ffmpeg subprocess) ---
2 thumbnails extracted: frame_0001.jpg, frame_0002.jpg

--- transcribe_with_timestamps (real Whisper API call) ---
[0.0-6.3]   "Today we are covering backpropagation, the algorithm that lets neural networks learn from error."
[6.3-12.8]  "A lot of students get confused here because we skip the intermediate partial derivative steps in the slides."
[12.8-20.9] "Just remember, the gradient at each layer depends on the gradient of the layer after it, that is the back in backpropagation."

--- OCR result (real tesseract) ---
Slide 4: Backpropagation
dL/dw = dL/dy * dy/dw (chain rule)
Confusion point: gradient flows backward
```

Both then proved themselves through the actual live API, not just as standalone functions:

```
POST /api/assets (video)             -> 200 {status:"uploaded"}
POST /api/processing-jobs (video)    -> 200 {stage:"indexed"}   # real ffmpeg + real Whisper + real DB write
POST /api/assets (image)             -> 200 {status:"uploaded"}
POST /api/processing-jobs (image)    -> 200 {stage:"indexed"}   # real tesseract OCR + real DB write

POST /api/query "gradient at each layer depends on the layer after it"
  -> retrieved the video's own Whisper-transcribed segment, timestamp 12.78–20.92, similarity 0.678

POST /api/query "What does the slide diagram say about the chain rule?"
  -> retrieved segments from quiz, slide, image (OCR'd), and transcript together, ranked by similarity 0.674–0.696
```

All 6 modalities (video, image, slide, transcript, quiz, discussion) are now provably searchable together in one cross-modal query — not 4 of 6.

### 6.2 `data/sample_assets/real_data/` — fetched

`python data/scripts/fetch_datasets.py` was run against the live Hugging Face datasets-server API. It pulled 20 real transcript chunks from a YouTube video ("Training and Testing an Italian BERT — Transformers From Scratch #4") and 9 real slides from a SciDuet paper ("Neural Hidden Markov Model for Machine Translation"), writing `real_data/assets_manifest.json` + the two raw-unit JSON files. Re-running `seed_and_demo.py` picked up both manifest groups and embedded 40 total segments across 9 assets (up from 11 segments / 5 assets).

### 6.3 Dashboard chart — wired, and a real bug fixed along the way

`frontend/dashboards/FrictionThemeChart.tsx` existed but was never imported; `dashboard/page.tsx` just dumped raw JSON. It's now wired to render two real bar-chart panels — **Pipeline health, by stage** and **Review outcomes** — using the exact `{label, count}` shape the component expected, sourced from the live `pipeline_health`/`review_outcomes` metrics (the raw JSON is still available behind a `<details>` toggle for transparency).

While wiring this, a **real, separate bug** was found and fixed: `frontend/app/operations/page.tsx` read `metrics.pipeline_health.total_jobs`, `.failed_jobs`, and `metrics.review_outcomes.total_insights`, `.pending_review` — fields that never existed in the actual `/api/metrics` response (which only ever returned per-stage/per-decision breakdowns). Every tile on the Operations Dashboard always rendered `"-"`. Fixed by adding those four aggregate fields to `backend/app/services/metrics_service.py` and pointing the page at the flat response shape. Confirmed live:

```
GET /api/metrics -> {"pipeline_health":{"uploaded":8,...,"failed":1},"review_outcomes":{"accept":2},
                      "total_assets":28,"total_segments_indexed":69,
                      "total_jobs":13,"failed_jobs":1,"total_insights":6,"pending_review":4}
```

### 6.4 Real browser testing with Playwright

The frontend had never been driven by an actual browser session — only page-compile checks. `@playwright/test` + Chromium were installed, and `frontend/e2e/golden-path.spec.ts` was written to click through the real product surfaces against the real backend (no mocking, per this project's own testing philosophy):

```
Running 10 tests using 6 workers

  ok  Home › nav bar links to every product surface
  ok  Home › home page cards describe each surface and link to the right route
  ok  Home › clicking a card navigates to its product surface
  ok  Asset Intake › registers a new transcript asset end to end
  ok  Asset Intake › shows a validation-driven error for a bad backend response gracefully
  ok  Unified Query Workspace › asks a cross-modal question and renders a cited, grounded answer
  ok  Recommendation Review Workspace › loads an insight and records a reviewer decision
  ok  Learning Analytics Dashboard › renders pipeline health and review outcome charts from real metrics
  ok  Operations Dashboard › renders real job/insight counts with no console errors
  ok  Processing Monitor › renders without console errors

  10 passed (17.7s)
```

Notably, the "Unified Query Workspace" test types a real question into the real input, clicks "Ask", waits (with a real web-first assertion, not a fixed sleep) for the real GPT-4o-mini answer and confidence score to render, then confirms at least one evidence card is visible — genuine click-through, not a page-load check. The "Recommendation Review Workspace" test loads a real insight by ID and clicks "Accept", then asserts the status text updates from `pending_review` to `accept` in the DOM.

Two real bugs were caught and fixed while writing these: the frontend's `.env.local` isn't loaded into a standalone `playwright test` process the way Next.js loads it into its own dev server, so the review test was silently authenticating with an invalid placeholder token until `playwright.config.ts` was taught to parse it in manually; and two ambiguous `getByRole` locators (regex-based, matching both a nav link and an unrelated homepage card) were tightened to exact matches.

### 6.5 Test-suite idempotency

Re-running `pytest` a second time against the same persistent Supabase database (not a disposable one — see `tests/conftest.py`) surfaced two tests that assumed a clean database (`test_register_asset_creates_job`, `test_duplicate_asset_registration_is_flagged` — both used a fixed `owner` value, which the second run correctly flagged as an already-registered duplicate). Both now generate a unique `owner` per run via `uuid.uuid4()`, so the suite passes on repeated runs against the same database — confirmed by running it twice in a row.

**Final result of this pass:** 13/13 pytest tests pass (twice in a row), 10/10 Playwright browser tests pass, all 6 modalities process end to end with real system tools, and every dashboard number reflects a real backend field.

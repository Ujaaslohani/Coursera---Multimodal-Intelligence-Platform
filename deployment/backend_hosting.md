# Backend hosting (Render, Docker)

**Live:** https://coursera-multimodal-intelligence-platform.onrender.com

The backend needs a persistent host, not serverless — `pipelines/` shells
out to `ffmpeg` and `tesseract`, which aren't available on Vercel/serverless
functions and aren't installable via pip. Render's default native Python
runtime doesn't provide them either, so the backend is deployed as a
**Docker web service** using `backend/Dockerfile`, which installs both via
`apt-get` at build time.

## Render setup (what's actually deployed)

1. Service type: **Web Service**, environment **Docker**.
2. Root/build context: **repo root** (not `backend/`) — `backend/Dockerfile`
   does `COPY backend/requirements.txt`, `COPY ai/requirements.txt`, etc.
   relative to repo root, and the app imports `ai/`/`pipelines/` as
   top-level packages (`ENV PYTHONPATH=/app:/app/backend` inside the
   Dockerfile).
3. Dockerfile path: `backend/Dockerfile`.
4. Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`,
   `CORS_ALLOWED_ORIGINS` (set to the deployed frontend origin).
5. Render builds the image and runs its `CMD`, which starts uvicorn bound to
   `$PORT`.

Before trusting a Render build, build and run the same Dockerfile locally
(`docker build -t backend . && docker run -p 8000:8000 --env-file backend/.env backend`,
run from the repo root) and confirm `GET /health` works — this is what
caught issues before they hit Render.

## Free-tier behavior

Render's free tier spins the service down after inactivity. Two distinct
symptoms follow from this, and they're not the same problem:

- **Cold start:** the first request after idling is just slow (can be
  30-60s) but eventually returns a normal `200`.
- **`502` with `x-render-routing: no-deploy`:** the instance was
  **OOM-killed** — confirmed cause on this deployment. The free tier's
  512MB memory limit is tight once the local CLIP model
  (`sentence-transformers`) is loaded alongside FastAPI/SQLAlchemy; under
  memory pressure Render kills and restarts the instance, which briefly
  shows as "no active deployment" until it comes back on its own. Check
  Render's metrics tab for a memory spike/restart event rather than
  assuming a crashed deploy. Longer-term fix is more memory (paid plan) or
  moving CLIP inference out of the main API process.

The frontend doesn't currently distinguish between these — both show up as
"Failed to fetch" or stat tiles stuck on `—`.

## Database

Use Supabase (or any managed Postgres) with the `pgvector` extension enabled:

```sql
create extension if not exists vector;
```

`backend/app/database/connection.py` reads `DATABASE_URL` from the
environment; `Base.metadata.create_all()` runs at startup and creates tables
if they don't already exist (fine for this project's scope — no migration
tool is set up).

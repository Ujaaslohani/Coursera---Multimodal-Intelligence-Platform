# Deployment Guide

See `deployment/` for the per-target notes this summarizes.

## Backend

1. Provision Postgres with the `pgvector` extension enabled (Supabase does this by default).
2. Set `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET` as environment variables on the host (Render/Railway).
3. Deploy `backend/` with start command:
   `PYTHONPATH=.:./backend uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   (repo root must be the working directory so `ai/` and `pipelines/` resolve — see `backend/README.md`.)

## Frontend

1. Deploy `frontend/` to Vercel, root directory set to `frontend/`.
2. Set `NEXT_PUBLIC_BACKEND_URL` to the deployed backend URL.

## Media pipelines

`pipelines/` requires system binaries (`ffmpeg`, `tesseract-ocr`) not available
on Vercel/serverless — run preprocessing jobs on the same host as the backend
(Render/Railway) or as a separate worker with those binaries installed.

## Verifying a deployment

1. `GET /health` on the backend returns `{"status": "ok"}`.
2. Seed `data/sample_assets/assets_manifest.json` via `/api/assets`.
3. Run one query from `data/sample_queries.json` through `/api/query` + `/api/synthesize`.
4. Confirm the frontend Query Workspace renders the cited answer.

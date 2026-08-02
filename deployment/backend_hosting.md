# Backend hosting (Render / Railway)

The backend needs a persistent host, not serverless — `pipelines/` shells
out to `ffmpeg` and `tesseract`, which aren't available on Vercel functions.

## Render / Railway setup

1. Root directory: repo root (not `backend/`) — the start command needs both
   `backend/` and `ai/`/`pipelines/` on `PYTHONPATH`.
2. Build command:
   ```
   pip install -r backend/requirements.txt -r ai/requirements.txt -r pipelines/requirements.txt
   ```
   Also install system packages `ffmpeg` and `tesseract-ocr` (Render: add an
   `apt-packages` or Dockerfile step; Railway: use a Nixpacks config or Dockerfile).
3. Start command:
   ```
   PYTHONPATH=.:./backend uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`.

## Database

Use Supabase (or any managed Postgres) with the `pgvector` extension enabled:

```sql
create extension if not exists vector;
```

`backend/app/database/connection.py` reads `DATABASE_URL` from the
environment; `Base.metadata.create_all()` runs at startup and creates tables
if they don't already exist (fine for this project's scope — no migration
tool is set up).

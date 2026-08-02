# Environment variables

## backend/.env

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string, pgvector extension enabled |
| `OPENAI_API_KEY` | Used by `ai/embeddings`, `ai/synthesis`, `pipelines/video_processing` (Whisper) |
| `GEMINI_API_KEY` | Optional alternate LLM for synthesis |
| `JWT_SECRET` | Token verification in `backend/app/auth/dependencies.py` (replace the stub verification before real use) |
| `OBJECT_STORAGE_URL` / `OBJECT_STORAGE_KEY` | Raw asset storage (Supabase Storage or S3) |

## frontend/.env.local

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend base URL |
| `NEXT_PUBLIC_DEV_TOKEN` | Demo-only bearer token |

## Local full-stack run

```bash
# terminal 1 — backend
pip install -r backend/requirements.txt -r ai/requirements.txt -r pipelines/requirements.txt
cp backend/.env.example backend/.env   # fill in values

# macOS/Linux
PYTHONPATH=.:./backend uvicorn app.main:app --reload
# Windows (PowerShell): $env:PYTHONPATH=".;./backend"; uvicorn app.main:app --reload
# Windows (Git Bash):   PYTHONPATH=".;./backend" uvicorn app.main:app --reload

# terminal 2 — frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Never commit filled-in `.env` files — only `.env.example` is tracked.

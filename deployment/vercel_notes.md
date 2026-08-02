# Vercel — frontend deployment

1. Import the repo into Vercel, set **Root Directory** to `frontend/`.
2. Framework preset: Next.js (auto-detected from `frontend/package.json`).
3. Environment variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_BACKEND_URL` — the deployed backend's public URL
   - `NEXT_PUBLIC_DEV_TOKEN` — only for demo auth; replace with real auth before any real launch
4. Build command: `npm run build` (default). Output: `.next` (default).
5. Vercel auto-deploys on push to the default branch; use preview deployments for PRs.

No secrets belonging to the LLM, embeddings, or database ever go in the
frontend's environment — those stay backend-only per doc §5.4/§7.3.

# Vercel — frontend deployment (alternative; not what's actually deployed)

The live frontend is deployed on **Netlify**, not Vercel — see
`deployment/netlify_notes.md` for the actual setup and the gotcha that was
hit. These notes are kept as a valid alternative, since Vercel is also a
first-class Next.js host and this would work if switching later.

1. Import the repo into Vercel, set **Root Directory** to `frontend/`.
2. Framework preset: Next.js (auto-detected from `frontend/package.json`).
3. Environment variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_BACKEND_URL` — the deployed backend's public URL
   - `NEXT_PUBLIC_BACKEND_TOKEN` — only for demo auth; replace with real auth before any real launch
4. Build command: `npm run build` (default). Output: `.next` (default).
5. Vercel auto-deploys on push to the default branch; use preview deployments for PRs.

No secrets belonging to the LLM, embeddings, or database ever go in the
frontend's environment — those stay backend-only per doc §5.4/§7.3. Note
that anything prefixed `NEXT_PUBLIC_` (including the demo token above) is
still inlined into the public client bundle regardless of host — see the
"Known issue — exposed token" note in `docs/deployment_guide.md`.

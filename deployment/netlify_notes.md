# Netlify — frontend deployment (actually used)

**Live:** https://courseramip.netlify.app

## Setup

1. Import the repo into Netlify, set **Base directory** to `frontend/`.
2. Build command: `npm run build`. Publish directory: `.next`.
3. Environment variables (Site settings → Environment variables):
   - `NEXT_PUBLIC_BACKEND_URL` — the deployed backend's public URL
   - `NEXT_PUBLIC_BACKEND_TOKEN` — demo auth token; see the exposed-token
     caveat in `docs/deployment_guide.md`.
4. Netlify auto-deploys on push to the default branch.

## The gotcha: dashboard auto-detection silently not attaching the plugin

Netlify's dashboard reported the site as Next.js and the build "succeeded,"
but every single route 404'd once deployed. The build log was the tell:

```
0 new function(s) to upload
```

That line means `@netlify/plugin-nextjs` never actually attached to the
build, even though the dashboard's framework auto-detection claimed Next.js.
Without the plugin, Netlify just serves the `.next` output directory as
static files instead of routing requests through Next.js's server runtime —
so every page (including `/`) 404s, because there's no static `index.html`
matching Next.js's App Router output.

**Fix:** stop relying on dashboard auto-detection and declare the plugin
explicitly in `frontend/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

After adding this and redeploying, the build log showed functions actually
being uploaded, and all routes started resolving correctly.

## Verifying after deploy

- Hit every top-level route directly (not just `/`) — `/assets`,
  `/processing`, `/query`, `/recommendations`, `/dashboard`, `/operations`,
  `/audit-log` — a plugin misattach shows up as 404s on all of them, not
  just missing API data.
- Open the deployed site in a real browser and check the console for CORS
  errors — confirms the backend's `CORS_ALLOWED_ORIGINS` actually includes
  the Netlify origin.

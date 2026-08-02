# frontend

Next.js product experience for the Coursera Multimodal Intelligence Platform,
implementing the surfaces from the product brief §5.2 / §7.6.

## Structure

```
app/            # Next.js App Router pages, one route per product surface
  assets/           # Asset Intake Console
  processing/       # Multimodal Processing Monitor
  query/            # Unified Query Workspace + Evidence Panel
  dashboard/        # Learning Analytics Dashboard
  recommendations/  # Recommendation Review Workspace
  operations/       # Operations and Governance Dashboard
components/     # Shared UI (Navbar, EvidencePanel)
dashboards/     # Reusable chart components for analytics surfaces
lib/            # Typed API client — one function per backend/app/api route
styles/         # Tailwind globals
```

All data comes from `coursera-mip` backend via `lib/api.ts`; no model or
database credentials are ever referenced from the frontend, per doc §5.4/§7.3.

## Run locally

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_BACKEND_URL at the backend
npm run dev
```

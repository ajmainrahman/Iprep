# FlyStudy

A dual-mode study-abroad companion: **Fly** tracks university applications, scholarships, test scores, and document checklists; **Study Journey** is a full IELTS preparation tracker with score tracking, study logs, vocab bank, and mindset coaching.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` — source of truth for all tables
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/ielts-tracker/src/pages/`
- CSS theme + colors: `artifacts/ielts-tracker/src/index.css`
- Date utilities: `artifacts/ielts-tracker/src/lib/utils/date.ts`
- Checklist templates (default): `DEFAULT_TEMPLATES` constant in `HigherStudyPrep.tsx`

## Architecture decisions

- Landing page → dual-mode navigation: `AppMode = 'home' | 'fly' | 'study'` (state in `App.tsx`; no router)
- Dynamic requirements: stored as `requirementsJson TEXT` (JSON array `[{label, done}]`) in `higher_study_applications`; old boolean columns kept for backward compat
- Checklist templates: 5 built-in defaults in frontend (no DB); custom templates stored in `checklist_templates` table
- CSS fly-mode: `.fly-mode` class on root div overrides `--sidebar-*` CSS vars to indigo; study mode uses default teal/navy vars
- Date formatting: always use `fmtDate()` and `daysUntil()` from `src/lib/utils/date.ts` — never `new Date(isoString)` directly (avoids timezone-off-by-one bugs)

## Product

- **Landing**: Full-screen Nordic aurora hero with ✈️ Fly + 📚 Study Journey cards; country flags for Denmark, Finland, Norway, Sweden; Erasmus badge
- **Fly (Higher Study)**: Overview dashboard, Applications (dynamic checklist per app, template picker), Test Scores (GRE/GMAT/TOEFL/etc.), Scholarships, Doc Templates (5 built-in + custom)
- **Study Journey (IELTS)**: Dashboard, Score Tracker, Study Log, Practice Tracker, 1000-word Vocab Bank, Mindset Corner

## User preferences

- App name: **FlyStudy**
- Theme: Nordic / Aurora — dark indigo landing, indigo sidebar for Fly mode, teal sidebar for Study mode
- Erasmus countries always featured: Denmark 🇩🇰, Finland 🇫🇮, Norway 🇳🇴, Sweden 🇸🇪

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

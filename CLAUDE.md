# CLAUDE.md

Guidance for agents working on the CMPLX iT Design app.

## Product

Internal system of record for **project statuses** and **design briefs**. CMPLX-native. Do not fork or copy the private Soho House Dashboard — use it only as a distant schema/pattern reference (UUID PKs, soft delete, snake_case SQL, ENUMs, editor RLS).

## Stack

Vite + React 19 + TypeScript + Tailwind 4 + Supabase (Postgres + Auth). Vercel SPA.

Env vars (Vite-prefixed, required for live mode):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Without them, `src/lib/supabase.ts` sets `dataMode` to `demo` and `src/lib/api.ts` uses `src/lib/demo-store.ts` (localStorage, labeled DEMO seed).

## Layout

```
db/                    SQL migrations — apply 001 → 002 → 003 → 004
src/lib/               types, api, auth, supabase, demo store, categories
src/components/        screens + small UI primitives
```

Prefer more files under `src/lib` and `src/components` over a giant `App.tsx`.

## Auth (v1)

Editors only. Table `public.editors` + `public.is_editor()`. No partners, viewers, or share links. Signed-out users get `Landing` only.

After Auth sign-in, resolve the allowlist row (`editors.email` ilike jwt email). If missing, show `NotEditor`.

## Domain (v1)

- `projects.status`: `pending | on_track | at_risk | behind`
- `design_briefs.status`: `draft | active | in_review | approved`
- Soft delete via `deleted_at` (no client HARD DELETE grants on projects, briefs, or spaces)
- One brief per project
- Checklist: 15 rows from `TECHNOLOGY_CATEGORIES` / `technology_categories`
- Project narratives: `design_intent`, `constraints`, `open_decisions`
- v1.1 spaces: `project_spaces` plus `space_system_narratives` (null `category_key` is the overview; otherwise an in-scope standard-15 key)

## In / out of MVP

**In:** editor CRUD, project list/detail, status notes, brief editor, print CSS, demo seed, spaces, per-space system narrative.

**Out:** partners, exec links, finance, RAID, equipment / BoM quantities, uploads, SharePoint, Tract, Soho House AM features, S1–S8 storyboard, PDF export, Granola design-review import.

Do not invent fake production client data. Seed/demo rows must stay labeled `DEMO —`.

## Conventions

- UUID PKs, snake_case columns, SQL ENUMs
- App talks to Supabase with the same snake_case field names
- Print: `.no-print` / `.print-only` in `src/index.css`; `window.print()` on the brief
- Keep README.md accurate when behavior or env changes

# CMPLX iT Design

System of record for **project statuses** and **design briefs** — so CMPLX can scale without inventing status in chat or sheets.

Smarter systems. Simpler spaces.

This is a clean CMPLX-native product (Vite + React + Tailwind + Supabase). It is **not** a fork of any client dashboard.

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS 4**
- **Supabase** — Postgres + Auth
- **Vercel-ready** SPA (`vercel.json` rewrites)

## What is in MVP

- Editor-only Auth (email/password or magic link)
- Single allowlist table `editors` + `is_editor()` RLS helper
- **Projects** with status `pending | on_track | at_risk | behind`, owner, dates, soft delete
- **Status notes** stream (`status_updates`) — project row still holds current status
- **One design brief per project**: header, standard-15 hospitality-tech checklist, three narratives (`design_intent`, `constraints`, `open_decisions`)
- Create / update flows for projects and briefs
- Browser print stylesheet on the brief (good enough for sharing; no PDF pipeline)
- Clearly labeled **DEMO** seed data only — no fake live-client records

## What is out of MVP

Partners, exec share links, finance, RAID, equipment, file uploads, SharePoint, Tract, Soho House account-manager features, and the full S1–S8 storyboard.

## Environment

Copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

If those vars are **missing**, the app boots a **demo mode**: local seed data, no network, banner on every screen. Demo data is labeled `DEMO — …` and lives in `localStorage`.

## Local run

```bash
npm install
npm run dev
```

Open the printed local URL. With no env file, choose **Enter demo workspace**.

```bash
npm run build
npm run preview
```

## Supabase setup

1. Create a project.
2. In the SQL editor, run in order:
   - `db/001_schema.sql` — enums, tables, triggers, standard-15 categories
   - `db/002_rls.sql` — `is_editor()`, grants, editor-only policies
   - `db/003_seed.sql` — optional DEMO rows + `editor@demo.cmplx`
3. Authentication → add an Auth user whose email is in `public.editors`.
   Replace the demo email with a real CMPLX editor before anything live.
4. Auth → URL configuration: add `http://localhost:5173` and the Vercel origin.
5. Put the project URL and **publishable** (legacy: anon) key in Vercel / `.env.local`.

Editors table is an allowlist. Sign-in alone is not enough — the email must match `editors.email`. Mutations to `editors` are SQL / service-role only.

## Vercel

- Framework preset: Vite
- Output: `dist`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- SPA fallback is already in `vercel.json`

## Domain model (v1)

| Table | Notes |
| --- | --- |
| `editors` | Email allowlist |
| `projects` | UUID PK, owner, status enum, dates, `deleted_at` |
| `status_updates` | Dated notes; `project_id`, author, body |
| `design_briefs` | 1:1 with project; header + three narratives |
| `technology_categories` | Seeded standard-15 (also a constant in `src/lib/categories.ts`) |
| `brief_scope_items` | Per-brief checklist rows |

## App map

- `/` → redirects to `/projects` (signed-out users see the landing gate)
- `/projects` — list + status pills
- `/projects/new` — create
- `/projects/:id` — status, notes, link/create brief
- `/projects/:id/brief` — editor + print

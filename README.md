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
3. Invite each editor (allowlist row + Auth invite). See below.
4. Auth → URL configuration: Site URL `https://cmplx-design-app.vercel.app`, plus redirect URLs for that origin and `http://localhost:5173`.
5. Put the project URL and **publishable** (legacy: anon) key in Vercel / `.env.local`.

Editors table is an allowlist. Sign-in alone is not enough — the email must match `editors.email`. Mutations to `editors` are SQL / service-role only. The app does not offer public signup. Magic links use `shouldCreateUser: false`, so an email link only works after the Auth user exists.

## Invite an editor

Both steps are required. Mail goes out through Supabase's built-in mailer.

1. Insert the email into `public.editors` (SQL editor or service role). Match the invite address; `is_editor()` compares case-insensitively.

```sql
insert into public.editors (email, display_name)
values ('sc@cmplxit.io', 'SC')
on conflict (email) do nothing;
```

2. In the Supabase dashboard, Authentication → Users → Invite user, with that same email. The invite link signs them in and opens the app. To choose a password afterward, use **Forgot password** on the sign-in page. **Email link** also works once that Auth user exists.

3. Confirm URL configuration allows the redirect:
   - Site URL: `https://cmplx-design-app.vercel.app`
   - Redirect URLs: `https://cmplx-design-app.vercel.app` and `http://localhost:5173`

`sc@cmplxit.io` is already on `editors` and is a confirmed Auth user. Skip the insert. If an old invite link fails, open the live app, choose **Email link** or **Forgot password**, and use `sc@cmplxit.io`. Expired links are one-time; the sign-in page explains how to request another.

Someone who can sign in but is missing from `editors` sees the not-editor screen. They contact CMPLX to be added. There is no in-app signup.

### Check the Vercel deploy

1. Open https://cmplx-design-app.vercel.app signed out. The landing page separates email link and password, and says invites come from CMPLX.
2. Open https://cmplx-design-app.vercel.app/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired and confirm the expired-link message, then request a new link for an Auth user that already exists.
3. Sign in as an allowlisted editor and confirm the app lands on `/projects`.
4. An Auth user who is not on `editors` sees the not-editor screen, with contact instructions and sign out.

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

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

## What v1.1 adds

- **Spaces** on a project (`project_spaces`): name, sort order, optional short note, soft delete
- **System narrative** per space (`space_system_narratives`): one overview (`category_key` null) and one note per in-scope standard-15 category
- The three project-level narratives stay. Spaces do not replace them
- Demo mode stores spaces and narratives in the same `localStorage` seed. An older demo cache picks up the labeled seed spaces on next load

## What v1.2 adds

- **Bill of materials** (`bom_items`): equipment lines on a project — name, description, quantity, unit, optional manufacturer / model / SKU, optional space, optional standard-15 category, notes, sort order, soft delete
- No prices or vendor files. Cable fill is a separate tool and does not write these lines.
- Editors add, edit, reorder, and remove lines on the project page, and can filter by space or category
- The same list prints at the end of the design brief
- Archiving a space keeps the lines and clears `space_id`
- Demo mode stores lines in the same `localStorage` seed. An older demo cache picks up the labeled seed lines on next load

## Tools

- **Cable fill** (`/tools/cable-fill`): NEC Chapter 9 conduit fill for editors, including demo mode. Pick conduit type and trade size, add preset or custom cables (outside diameter and count), and read fill percent against Table 1. The screen also draws a cross section and checks Table 2 bend radius, jam ratio, and a best-practice bend/run derate. State stays in the browser session. It does not create projects, briefs, or bill-of-materials lines, and it needs no env vars.
- **UPS** (`/tools/ups`): IT-load UPS sizing for editors, including demo mode. Add preset or custom devices (label, watts, quantity), set power factor, safety margin, and UPS efficiency, then either enter battery watt-hours to read runtime or enter a target runtime to read required watt-hours. The screen recommends a common VA tier and marks load percent pass, warn, or fail against an 80% ceiling. State stays in the browser session. It does not create projects, briefs, or bill-of-materials lines, and it needs no env vars.

## What is out of MVP

Partners, exec share links, finance, RAID, file uploads, SharePoint, Tract, Soho House account-manager features, the full S1–S8 storyboard, and Granola design-review import.

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
   - `db/004_spaces_narrative.sql` — `project_spaces`, `space_system_narratives`, editor RLS, DEMO spaces when the 003 projects exist
   - `db/005_bom.sql` — `bom_items`, editor RLS, DEMO equipment lines when the 003 projects and 004 spaces exist

   Apply `004` before using a build that includes v1.1. It needs Postgres 15+ (`UNIQUE NULLS NOT DISTINCT`), which is the Supabase default. Editors get select, insert, and update only — removing a space sets `deleted_at`. There is no client delete grant. `004` also revokes the default anon grants Supabase puts on new tables.

   Apply `005` before using a build that includes v1.2. It is safe to re-run the DEMO insert (`on conflict do nothing`). Editors get select, insert, and update only — removing a line sets `deleted_at`. `005` revokes the default anon grants Supabase puts on the new table. Archiving a space (setting `project_spaces.deleted_at`) clears `bom_items.space_id` for that room; the lines stay on the project.
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

## Domain model

| Table | Notes |
| --- | --- |
| `editors` | Email allowlist |
| `projects` | UUID PK, owner, status enum, dates, `deleted_at` |
| `status_updates` | Dated notes; `project_id`, author, body |
| `design_briefs` | 1:1 with project; header + three narratives (`design_intent`, `constraints`, `open_decisions`) |
| `technology_categories` | Seeded standard-15 (also a constant in `src/lib/categories.ts`) |
| `brief_scope_items` | Per-brief checklist rows |
| `project_spaces` | Rooms or zones on a project. `name`, `sort_order`, `note`, `deleted_at` |
| `space_system_narratives` | Per space. `category_key` null is the overview; otherwise a standard-15 key. One row per `(space_id, category_key)` |
| `bom_items` | Equipment lines on a project. Quantity is `numeric(12,3)`. `space_id` and `category_key` are optional. `deleted_at` removes a line |

## App map

- `/` → redirects to `/projects` (signed-out users see the landing gate)
- `/projects` — list + status pills
- `/projects/new` — create
- `/projects/:id` — status, notes, space list (add, rename, reorder, remove), bill of materials (`#bill-of-materials`), link/create brief
- `/projects/:id/brief` — editor + print, including the system narrative (`#system-narrative`) and the bill of materials (`#bill-of-materials`)
- `/tools/cable-fill` — NEC conduit fill calculator. Linked from the header. Editors and demo mode. No project id. Session state only. Signed-out visitors still see the landing page.
- `/tools/ups` — IT-load UPS calculator. Linked from the header. Editors and demo mode. No project id. Session state only. Signed-out visitors still see the landing page.

## Verify spaces (v1.1)

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. If this browser already had a demo cache from before v1.1, use **Reset demo data** once so the labeled seed is current.
2. Open **DEMO — North Dock Clubhouse**, then the brief.
3. Confirm **Project narrative** still has design intent, constraints, and open decisions.
4. Under **System narrative**, confirm Lobby, Dock-side room, and Back of house. Lobby should already have an overview plus wireless and access-control notes.
5. Add a space (for example F&B), move it with Up / Down, write an overview and a note on an in-scope category, then **Save system narrative**. Reload and confirm the text is still there.
6. Print the brief. Each space with text prints under the project narrative, without the add / save controls.
7. On the project page, rename or remove a space, **Save spaces**, reopen the brief, and confirm the list matches.

**DEMO — Harbor Inn Guest Rooms** is a second check: Guest rooms and Circulation, with category notes only for systems in scope on that brief.

Live Supabase: run `db/004_spaces_narrative.sql` after 001–003, sign in as an allowlisted editor, and repeat steps 2–7. The 003 DEMO projects get the same sample spaces when that seed was applied.

## Verify the bill of materials (v1.2)

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. A demo cache from before v1.2 picks up the seed lines on next load. Use **Reset demo data** if you want the labeled seed back in full.
2. Open **DEMO — North Dock Clubhouse**. Under **Bill of materials**, confirm five lines: ceiling access point (Lobby, wireless, qty 8), members door reader, dock-side projector, service-corridor cabinet, and 500 m of category cable. Manufacturer on the seed rows is `DEMO`.
3. Filter to Lobby, then to wireless. Clear both filters. Move a line with Up / Down, change a quantity to `12.5` and the unit to `m`, and **Save bill of materials**. Reload and confirm the order and the quantity.
4. **Add line** (name only). Set a space and an in-scope category, then save. Reload and confirm the line is still there.
5. **Remove** a line, reload, and confirm it is gone.
6. Open the brief and print (or print preview). The bill of materials is the last section, with quantity, item, space, category, and notes, and without the add / save controls.
7. On the project page, remove a space that has equipment. Save spaces, reload the bill of materials, and confirm those lines are still there with space **Unassigned**.
8. Open **DEMO — Atrium Bar Refresh** and confirm the empty equipment state. **DEMO — Harbor Inn Guest Rooms** has three lines (84 panels, 84 locks, 12 corridor access points).

Live Supabase: run `db/005_bom.sql` after 001–004, sign in as an allowlisted editor, and repeat steps 2–8. The 003 DEMO projects get the same sample lines when that seed and the 004 spaces were applied.

## Verify cable fill

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. Open **Cable fill** in the header.
2. The sample EMT 1" run (eight Cat6A UTP plus one 12-strand fiber, two 90° bends, 75 ft) reads over the recommended limit. The cross section, fill bar, and status all show that.
3. Change the trade size to 2". Fill drops inside the limit.
4. Add a preset, then a custom cable (name, OD, quantity). **Clear all** returns the empty state.
5. Set one cable quantity to 3 and confirm a jam-ratio line. Set 90° bends to 5 and confirm the 360° failure.
6. At about 390px wide, the header, cable rows, and fill panel stay inside the viewport.

Signed out, `/tools/cable-fill` stays on the landing page. An allowlisted editor in live mode uses the same route after sign-in.

## Verify UPS

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. Open **UPS** in the header.
2. The seed load (two 1U servers, one 24-port switch, one firewall) at power factor 0.9, 25% margin, 94% efficiency, and 2,400 Wh recommends a 750 VA tier, about 76% of that tier (warn, still under 80%), and a runtime in minutes. The derived runtime field is read-only.
3. Change a quantity or the watts. Totals, tier, load percent, and runtime follow.
4. Switch to **Runtime → battery**, enter a target in minutes, and confirm required watt-hours is read-only. Switch back and confirm battery watt-hours is editable again.
5. Raise the load, or use the 20% margin, until load percent of the tier is above 80%. Status reads fail.
6. At about 390px wide, the header, device rows, and sizing panel stay inside the viewport.

Signed out, `/tools/ups` stays on the landing page. An allowlisted editor in live mode uses the same route after sign-in.

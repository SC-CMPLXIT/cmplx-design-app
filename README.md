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

## What v1.3 adds

- **Kickoff questionnaire** at `/projects/:id/kickoff`. One per project. Editors only. No share link.
- **Systems** (`technology_systems`) are the scope checklist: General, Carrier & riser, IT infrastructure, Network / Wi-Fi, Display / video, Audio, Conferencing, Control, Security, Acoustics. `applies_to` is `project`, `space`, or `both`, so a later Discovery feature can reuse the same keys for per-space checklists, discrepancies, space-guide exports, and proposal scope.
- **`system_category_links`** maps each system onto the standard-15 brief checklist (a system may match more than one category). Acoustics has no brief category. **Add systems from the brief** turns matching systems on and does not turn any off.
- **Question bank** (`scope_questions`, `bank = kickoff`) is the basis-of-design questionnaire: General, Carrier service & riser, IT infrastructure, Audio visual, Access control, Video surveillance. `scope_question_systems` says which systems show a question. A question shows when any linked system is in scope. `bank = discovery` is the per-space bank seeded in v1.4.
- **Answers** (`project_question_answers`) store body plus status `open | answered | locked`. They autosave. Locked answers are read-only until an editor sets Open or Answered. Clearing the text does not delete the row. Turning a system off hides its questions and keeps the answers.
- **Print / PDF** uses the same browser print path as the brief. **Download DOCX** builds a branded questionnaire in the browser (CMPLX iT header, scope, sections, status, answers).
- Demo mode stores scope and answers in the same `localStorage` seed. An older demo cache picks up the labeled seed on next load. Seed answer text stays prefixed `DEMO —`.

## What v1.4 adds

- **Discovery** at `/projects/:id/discovery`. One per project. Editors only. No share link.
- **Rooms** (`discovery_spaces`) are the call list: name, group (a floor or zone), what the plan shows, intended use, occupancy, notes, and an optional thumbnail. Add them, group them, and reorder inside a group. They are not the system-narrative spaces on the project page.
- **Drawings** (`discovery_attachments`) are a floor-plan PDF and rendering images. Bytes go in the private Storage bucket `discovery`, under `projects/<projectId>/<attachmentId>.<ext>`. The app shows them with signed URLs. A room can use a rendering as its thumbnail. Removing a file sets `deleted_at` and clears that thumbnail. There is no client delete of the object.
- **Checklist** is `scope_questions` where `bank = discovery`. A question shows on every room when one of its systems is in scope and that system applies to a space (`space` or `both`): IT infrastructure, Network / Wi-Fi, Display / video, Audio, Conferencing, Control, Security, Acoustics. It reuses `technology_systems` and `project_system_scope`. It does not add a second system list.
- **Answers** (`discovery_answers`) are per project and per room, with the same `open | answered | locked` status and autosave as kickoff. Locked text stays read-only until an editor sets Open or Answered.
- **Live call** walks one room at a time. `j` / `k` or the up and down arrows move questions. Left and right arrows, or `[` and `]`, move rooms. `a` marks the current question answered. `n` jumps to quick notes. Enter types in the answer. Esc leaves a field. Shortcuts stay quiet while the cursor is in a field, so a Zoom call can keep its own keys.
- **Discrepancies** (`discovery_discrepancies`) record what the plan shows, what the notes say, an optional room, severity `low | medium | high`, and status `open | resolved` with a resolution note.
- Demo mode stores rooms, answers, and discrepancies in the same `localStorage` seed, and file bytes in this browser only. An older demo cache picks up the labeled seed on next load. Seed text stays prefixed `DEMO —`.

## Tools

- **Tools index** (`/tools`): short list of the calculators. The header links here. Editors and demo mode. Signed-out visitors still see the landing page.
- **Cable fill** (`/tools/cable-fill`): NEC Chapter 9 conduit fill for editors, including demo mode. Pick conduit type and trade size, add preset or custom cables (outside diameter and count), and read fill percent against Table 1. The screen also draws a cross section and checks Table 2 bend radius, jam ratio, and a best-practice bend/run derate. **Print** uses the same browser print path as the brief. **Copy summary** puts a plain-text snapshot of the current conduit, cables, fill percent, and pass/warn/fail on the clipboard. State stays in the browser session. It does not create projects, briefs, or bill-of-materials lines, and it needs no env vars.
- **UPS** (`/tools/ups`): IT-load UPS sizing for editors, including demo mode. Add preset or custom devices (label, watts, quantity), set power factor, safety margin, and UPS efficiency, then either enter battery watt-hours to read runtime or enter a target runtime to read required watt-hours. The screen recommends a common VA tier and marks load percent pass, warn, or fail against an 80% ceiling. **Print** and **Copy summary** work the same way as cable fill (devices, VA, runtime, pass/warn/fail). State stays in the browser session. It does not create projects, briefs, or bill-of-materials lines, and it needs no env vars.

## What is out of MVP

Partners, exec share links, finance, RAID, SharePoint, general file libraries, Tract, Soho House account-manager features, the full S1–S8 storyboard, and Granola design-review import. Discovery floor plans and renderings are the only uploads.

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
   - `db/006_kickoff.sql` — `technology_systems`, `system_category_links`, `scope_questions`, `scope_question_systems`, `project_system_scope`, `project_question_answers`, editor RLS, DEMO scope and answers when the 003 projects exist
   - `db/007_discovery.sql` — `discovery_spaces`, `discovery_attachments`, `discovery_answers`, `discovery_discrepancies`, the private Storage bucket `discovery`, editor RLS, DEMO rooms, answers, and discrepancies when the 003 projects exist

   Apply `004` before using a build that includes v1.1. It needs Postgres 15+ (`UNIQUE NULLS NOT DISTINCT`), which is the Supabase default. Editors get select, insert, and update only — removing a space sets `deleted_at`. There is no client delete grant. `004` also revokes the default anon grants Supabase puts on new tables.

   Apply `005` before using a build that includes v1.2. It is safe to re-run the DEMO insert (`on conflict do nothing`). Editors get select, insert, and update only — removing a line sets `deleted_at`. `005` revokes the default anon grants Supabase puts on the new table. Archiving a space (setting `project_spaces.deleted_at`) clears `bom_items.space_id` for that room; the lines stay on the project.

   Apply `006` before using a build that includes v1.3. It is safe to re-run: system names, prompts, and the scope-to-question mapping refresh, and existing scope flags and answers are left in place (`on conflict do nothing`). Editors get select on the question bank and systems, and select, insert, and update on scope and answers. There is no client delete grant. `006` revokes the default anon grants Supabase puts on the new tables. Signed-out visitors still have no table access.

   Apply `007` before using a build that includes v1.4. It is safe to re-run: discovery prompts and their system links refresh, and existing rooms, files, answers, and discrepancies stay (`on conflict do nothing`). Editors get select, insert, and update only. There is no client delete grant. `007` revokes the default anon grants Supabase puts on the new tables.

   `007` also creates the private Storage bucket `discovery` (not public, 20 MB, PDF / JPEG / PNG / WebP) and three policies on `storage.objects` for `authenticated` editors (`is_editor()`), limited to keys `projects/<project uuid>/<file uuid>.<ext>` on a live project:

   - `discovery_objects_select` — read an object. Signed URLs need this.
   - `discovery_objects_insert` — upload a new object.
   - `discovery_objects_update` — replace an object. Storage upsert needs select, insert, and update.

   There is no delete policy and no policy for `anon`. Archive a file by setting `discovery_attachments.deleted_at`. The helper `public.discovery_object_allowed(object_name)` requires `is_editor()`, checks the key shape, and checks that the project is still live. `storage.objects` already has row level security; `007` does not turn it on.
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
| `technology_systems` | Canonical systems for kickoff and later discovery. `applies_to` is `project`, `space`, or `both` |
| `system_category_links` | System → standard-15 category. Many-to-many |
| `scope_questions` | Question bank. `bank` is `kickoff` or `discovery` |
| `scope_question_systems` | Question → systems. Visible when any linked system is in scope |
| `project_system_scope` | Per-project scope flag. One row per project and system. Shared with later discovery |
| `project_question_answers` | Per-project kickoff answer. `status` is `open`, `answered`, or `locked`. Body up to 8,000 characters |
| `discovery_spaces` | Discovery rooms. `group_name` is a floor or zone. Plan shows, intended use, occupancy, notes, optional rendering thumbnail, `deleted_at` |
| `discovery_attachments` | Floor-plan PDF or rendering. `storage_path` is `projects/<project_id>/<id>.<ext>` in the private `discovery` bucket |
| `discovery_answers` | Per room. Same `open`, `answered`, `locked` status as kickoff. One row per space and discovery question |
| `discovery_discrepancies` | Plan vs notes. Optional room, severity `low` / `medium` / `high`, status `open` / `resolved`, resolution note, `deleted_at` |

## App map

- `/` → redirects to `/projects` (signed-out users see the landing gate)
- `/projects` — list + status pills
- `/projects/new` — create
- `/projects/:id` — status, notes, space list (add, rename, reorder, remove), bill of materials (`#bill-of-materials`), link/create brief, links to kickoff and discovery
- `/projects/:id/brief` — editor + print, including the system narrative (`#system-narrative`) and the bill of materials (`#bill-of-materials`)
- `/projects/:id/kickoff` — scope checklist, questionnaire, autosave, print/PDF, DOCX. Editors and demo mode. Signed-out visitors still see the landing page.
- `/projects/:id/discovery` — rooms, drawings, per-space checklist, live call, plan-vs-notes discrepancies. Editors and demo mode. Signed-out visitors still see the landing page.
- `/tools` — calculator index (cable fill, UPS). Linked from the header. Editors and demo mode. Signed-out visitors still see the landing page.
- `/tools/cable-fill` — NEC conduit fill calculator. Editors and demo mode. No project id. Session state only. Print and copy summary stay in the browser.
- `/tools/ups` — IT-load UPS calculator. Editors and demo mode. No project id. Session state only. Print and copy summary stay in the browser.

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

## Verify kickoff (v1.3)

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. A demo cache from before v1.3 picks up scope and the labeled answers on next load. Use **Reset demo data** if you want the labeled seed back in full.
2. Open **DEMO — North Dock Clubhouse** and choose **Kickoff**. General, Carrier & riser, IT infrastructure, Network / Wi-Fi, Display / video, Audio, Conferencing, Control, and Security are on. Acoustics is off and is marked for later discovery when you turn it on.
3. Confirm answered text on the network-peripherals and on-prem questions, a locked cable-count answer (the field does not accept typing), an answered audio-visual question, and an open draft on the NVR split. Those seed answers start with `DEMO —`.
4. Clear **General**, **IT infrastructure**, and **Network / Wi-Fi**. The general and infrastructure questions leave. Turn **Network / Wi-Fi** back on. Questions tagged with that system return, and the cable-count answer is still there.
5. Type into an open answer, wait for **Saved**, reload, and confirm the text is still there. Set it to **Locked**, reload, and confirm it is still locked.
6. Uncheck **Conferencing**, then **Add systems from the brief**. Conferencing comes back, because the brief has AV in scope. Acoustics stays off — it has no brief category. The button does not turn systems off.
7. **Print / PDF** (or print preview). The page shows CMPLX iT, the project, scope, and each in-scope question with status and answer, without the scope checkboxes or status buttons.
8. **Download DOCX**. The file is named for the project and contains the same scope and answers.
9. Open **DEMO — Atrium Bar Refresh**. Every system is off and no questions show. Check **Acoustics** and confirm the held-for-discovery note, still with no questions.
10. At about 390px wide, the scope list stacks above the questions and both stay inside the viewport.

Signed out, `/projects/:id/kickoff` stays on the landing page. An allowlisted editor in live mode uses the same route after `db/006_kickoff.sql` is applied.

## Verify discovery (v1.4)

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. A demo cache from before v1.4 picks up rooms, answers, and discrepancies on next load. Use **Reset demo data** if you want the labeled seed back in full.
2. Open **DEMO — North Dock Clubhouse** and choose **Discovery**. Public floor has Lobby and Dock-side room. Support has Back of house. Seed text starts with `DEMO —`.
3. Move Dock-side room **Up**. It stays on Public floor and swaps with Lobby. Reload and confirm the order.
4. Add a room (name and a group, for example `Level 2`). Reload and confirm it is still there. **Remove** it and confirm it is gone.
5. Change Lobby notes, wait for **Saved**, reload, and confirm the text is still there.
6. Open **Drawings**. Upload a small PNG and a small PDF. The image previews. **Open PDF** opens the file. On the Spaces tab, set Lobby's thumbnail to that rendering. Reload and confirm the thumbnail is still selected.
7. Open **Checklist** on Dock-side room. Display / video, audio, conferencing, control, network / Wi-Fi, security, and IT infrastructure are present. Acoustics is absent until you turn it on in Kickoff. The locked display-location answer does not accept typing. The open conferencing answer does.
8. Type into an open answer, wait for **Saved**, reload, and confirm the text. Set it to **Answered**, reload, and confirm the status.
9. Choose **Live call**. `j` and `k` (or the up and down arrows) move the question when focus is not in a field. `a` marks it answered. `[` and `]` (or the left and right arrows) change rooms. `n` focuses quick notes. Type a note, wait for **Saved**, leave the call, and confirm the note is on that room.
10. Open **Discrepancies**. Confirm the open dock-side gap, the open whole-project gap, and the resolved lobby gap with its resolution note. Add a gap, set it to **Resolved**, write a resolution note, reload, and confirm it. **Remove** one and confirm it is gone.
11. Open **DEMO — Atrium Bar Refresh**. Discovery has no rooms and no discrepancies. The checklist asks you to add a room. Every system is off, so a new room still has no questions until Kickoff turns a space system on.
12. At about 390px wide, the room form, a room card, the checklist, and live call stay inside the viewport.

Signed out, `/projects/:id/discovery` stays on the landing page. An allowlisted editor in live mode uses the same route after `db/007_discovery.sql` is applied. Uploads then use the private `discovery` bucket and signed URLs.

## Verify cable fill

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. Open **Tools** in the header, then **Cable fill**.
2. The sample EMT 1" run (eight Cat6A UTP plus one 12-strand fiber, two 90° bends, 75 ft) reads over the recommended limit. The cross section, fill bar, and status all show that.
3. Change the trade size to 2". Fill drops inside the limit.
4. Add a preset, then a custom cable (name, OD, quantity). **Clear all** returns the empty state.
5. Set one cable quantity to 3 and confirm a jam-ratio line. Set 90° bends to 5 and confirm the 360° failure.
6. **Copy summary**. The button confirms, and the clipboard text names the conduit, each cable, the fill percent, and pass/warn/fail. It does not open a share link.
7. **Print** (or print preview). The page shows conduit, run, cables, fill, jam ratio, and the guidance note, without the header, demo banner, quick-add chips, or remove controls. It fits letter or A4 without a horizontal scrollbar.
8. At about 390px wide, the header, cable rows, and fill panel stay inside the viewport.

Signed out, `/tools` and `/tools/cable-fill` stay on the landing page. An allowlisted editor in live mode uses the same routes after sign-in.

## Verify UPS

Demo mode, with no Supabase env:

1. `npm run dev` and choose **Enter demo workspace**. Open **Tools** in the header, then **UPS**.
2. The seed load (two 1U servers, one 24-port switch, one firewall) at power factor 0.9, 25% margin, 94% efficiency, and 2,400 Wh recommends a 750 VA tier, about 76% of that tier (warn, still under 80%), and a runtime in minutes. The derived runtime field is read-only.
3. Change a quantity or the watts. Totals, tier, load percent, and runtime follow.
4. Switch to **Runtime → battery**, enter a target in minutes, and confirm required watt-hours is read-only. Switch back and confirm battery watt-hours is editable again.
5. Raise the load, or use the 20% margin, until load percent of the tier is above 80%. Status reads fail.
6. **Copy summary**. The clipboard text lists devices, VA, runtime, and pass/warn/fail.
7. **Print** (or print preview). The page shows devices, configuration, sizing, and the guidance note, without the header, demo banner, or add/remove controls.
8. At about 390px wide, the header, device rows, and sizing panel stay inside the viewport.

Signed out, `/tools` and `/tools/ups` stay on the landing page. An allowlisted editor in live mode uses the same routes after sign-in.

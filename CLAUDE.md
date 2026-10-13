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
db/                    SQL migrations — apply 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009
src/lib/               types, api, auth, supabase, demo store, categories, systems, cable fill, UPS sizing
src/components/        screens + small UI primitives
```

Prefer more files under `src/lib` and `src/components` over a giant `App.tsx`.

## Auth (v1)

Editors only. Table `public.editors` + `public.is_editor()`. No partners, viewers, or share links. Signed-out users get `Landing` only.

After Auth sign-in, resolve the allowlist row (`editors.email` ilike jwt email). If missing, show `NotEditor`.

## Domain (v1)

- `projects.status`: `pending | on_track | at_risk | behind`
- `design_briefs.status`: `draft | active | in_review | approved`
- Soft delete via `deleted_at` (no client HARD DELETE grants on projects, briefs, spaces, or BoM lines)
- One brief per project
- Checklist: 15 rows from `TECHNOLOGY_CATEGORIES` / `technology_categories`
- Project narratives: `design_intent`, `constraints`, `open_decisions`
- v1.1 spaces: `project_spaces` plus `space_system_narratives` (null `category_key` is the overview; otherwise an in-scope standard-15 key)
- v1.2 bill of materials: `bom_items` on a project. Optional `space_id` and `category_key`. Quantity is `numeric(12,3)`. No prices. Archiving a space clears `space_id` and keeps the line.
- v1.3 kickoff: `technology_systems` is the shared scope checklist (project / space / both) for this questionnaire and discovery. `system_category_links` maps a system onto the standard-15 brief checklist. `scope_questions` (`bank = kickoff` or `discovery`) plus `scope_question_systems`. A question shows when any linked system is in scope. `project_system_scope` and `project_question_answers` (`open | answered | locked`) are per project. No client DELETE. Apply `db/006_kickoff.sql`.
- v1.4 discovery: `discovery_spaces` (name, floor/zone `group_name`, plan shows, intended use, occupancy, notes, thumbnail, sort, soft delete) are separate from narrative `project_spaces`. `discovery_attachments` point at objects in the private Storage bucket `discovery` (`projects/<projectId>/<id>.<ext>`), shown with signed URLs. `discovery_answers` are per space and reuse `question_answer_status`. `discovery_discrepancies` are plan vs notes (`low | medium | high`, `open | resolved`). Apply `db/007_discovery.sql`.
- v1.5 discovery exports: from `/projects/:projectId/discovery`, print/PDF and DOCX are the space guide (cover, project summary, per-space plan/use/occupancy, rendering thumbnail, per-system questions with status, discrepancy list). A plain-text agenda (copy and `.txt`) lists open questions by space and open discrepancies. `projects.area_sf` is gross square feet. Apply `db/008_lmnt_seed.sql` by hand. That file fills an existing project when the row is present and does not insert one. It is a private seed, not demo data, and it is not copied into the client bundle.
- v1.6 narrative, bill of materials, and proposals. `discovery_spaces.narrative_space_id` links a discovery room to a live `project_spaces` row (create-if-missing; cleared when that space is archived). Locked discovery answers suggest system-narrative text (fill an empty note or append; no silent overwrite) and a confirmed `bom_items` line (`discovery_answer_id`, no price). `project_proposals` is one stored draft per project and kind (`design` | `implementation`). `proposal_lines` are implementation fee rows; `unit_msrp_cents` stays null until an editor types it. Routes: `/projects/:projectId/proposals/design` and `/projects/:projectId/proposals/implementation`. Print uses `window.print()`. DOCX is built in the browser. Library text is in `src/content/proposals/` and `src/lib/proposal-library.ts`. Apply `db/009_discovery_proposals.sql` by hand. It inserts no project, price, or proposal.

## In / out of MVP

**In:** editor CRUD, project list/detail, status notes, brief editor, print CSS, demo seed, spaces, per-space system narrative, project bill of materials, per-project kickoff questionnaire (`/projects/:projectId/kickoff`, scope-driven question bank, autosave, print/PDF, DOCX), per-project discovery (`/projects/:projectId/discovery`: rooms grouped by floor or zone, private floor-plan PDFs and rendering images, per-space question checklist, live-call mode, plan-vs-notes discrepancies, space-guide print/PDF and DOCX, plain-text call agenda), locked discovery answers into the system narrative and bill of materials, per-project design and implementation proposal drafts (`/projects/:projectId/proposals/design` and `/implementation`, print/PDF and DOCX, subject to the Master Subcontractor Agreement), cable fill calculator (`/tools/cable-fill`, session-local, NEC Chapter 9 — no new tables), UPS calculator (`/tools/ups`, session-local IT-load sizing — no new tables). Index at `/tools`. Both calculators print (`window.print()`) and copy a plain-text summary of the current run. Session-local — no new tables, no project writes.

**Out:** partners, exec links, finance, RAID, SharePoint, general file libraries, Tract, Soho House AM features, S1–S8 storyboard, a generated PDF file (print uses the browser), Granola design-review import.

Do not invent fake production client data. Seed/demo rows must stay labeled `DEMO —`.

## Conventions

- UUID PKs, snake_case columns, SQL ENUMs
- App talks to Supabase with the same snake_case field names
- Print: `.no-print` / `.print-only` in `src/index.css`; `window.print()` on the brief
- Keep README.md accurate when behavior or env changes

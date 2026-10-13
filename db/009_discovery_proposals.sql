-- CMPLX iT Design — discovery into narrative/BoM, and proposal drafts (v1.6)
-- Apply after 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008.
-- Idempotent and non-destructive. Safe to re-run. Applied by hand in the SQL editor.
--
-- Does not insert a project, a price, or a proposal. Drafts are created in the app.
-- Re-running does not overwrite narrative links, proposal text, milestone percents,
-- or MSRP amounts already stored.
--
-- discovery_spaces.narrative_space_id
--   Optional link to a live project_spaces row on the same project.
--   Cleared when that narrative space is archived. Discovery rooms stay.
-- bom_items.discovery_answer_id
--   Set when an editor confirms a locked discovery answer as an equipment line.
--   No price is stored here. One live line per answer.
-- project_proposals
--   One stored draft per project and kind (design | implementation).
-- proposal_lines
--   Implementation fee lines. unit_msrp_cents stays null until an editor enters it.

do $$
begin
  create type public.proposal_kind as enum ('design', 'implementation');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.proposal_phase as enum ('procurement', 'installation', 'commissioning');
exception
  when duplicate_object then null;
end $$;

alter table public.discovery_spaces
  add column if not exists narrative_space_id uuid;

comment on column public.discovery_spaces.narrative_space_id is
  'System-narrative space (project_spaces) this discovery room feeds. Null until an editor links or creates one. Cleared when that space is archived.';

do $$
begin
  alter table public.discovery_spaces
    add constraint discovery_spaces_narrative_space_fkey
    foreign key (narrative_space_id) references public.project_spaces (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists discovery_spaces_narrative_space_idx
  on public.discovery_spaces (narrative_space_id);

alter table public.bom_items
  add column if not exists discovery_answer_id uuid;

comment on column public.bom_items.discovery_answer_id is
  'Locked discovery answer an editor confirmed as this line. Null for lines typed in directly. Does not store a price.';

do $$
begin
  alter table public.bom_items
    add constraint bom_items_discovery_answer_fkey
    foreign key (discovery_answer_id) references public.discovery_answers (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create unique index if not exists bom_items_discovery_answer_live_idx
  on public.bom_items (discovery_answer_id)
  where discovery_answer_id is not null and deleted_at is null;

create table if not exists public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.proposal_kind not null,
  title text not null default '',
  subtitle text not null default '',
  client_name text not null default '',
  issued_on date,
  project_statement text not null default '',
  scope_note text not null default '',
  agreement_note text not null default '',
  design_rate_cents integer not null default 20000,
  drafting_rate_cents integer not null default 11000,
  ca_day_rate_cents integer not null default 120000,
  bod_design_hours_per_1000 numeric(8, 2) not null default 6,
  bod_drafting_hours_per_1000 numeric(8, 2) not null default 2,
  dd_design_hours_per_1000 numeric(8, 2) not null default 10,
  dd_drafting_hours_per_1000 numeric(8, 2) not null default 8,
  ca_design_hours_per_1000 numeric(8, 2) not null default 2,
  ca_drafting_hours_per_1000 numeric(8, 2) not null default 1,
  ca_site_days numeric(8, 2) not null default 4,
  labor_cents integer not null default 0,
  hardware_deposit_pct numeric(5, 2) not null default 90,
  hardware_delivery_pct numeric(5, 2) not null default 8,
  hardware_substantial_pct numeric(5, 2) not null default 2,
  labor_deposit_pct numeric(5, 2) not null default 0,
  labor_delivery_pct numeric(5, 2) not null default 75,
  labor_substantial_pct numeric(5, 2) not null default 25,
  scope_keys text[] not null default '{}',
  assumption_keys text[] not null default '{}',
  exclusion_keys text[] not null default '{}',
  term_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_proposals_project_kind unique (project_id, kind),
  constraint project_proposals_title_length check (char_length(title) <= 200),
  constraint project_proposals_subtitle_length check (char_length(subtitle) <= 200),
  constraint project_proposals_client_length check (char_length(client_name) <= 160),
  constraint project_proposals_statement_length check (char_length(project_statement) <= 8000),
  constraint project_proposals_scope_note_length check (char_length(scope_note) <= 8000),
  constraint project_proposals_agreement_note_length check (char_length(agreement_note) <= 4000),
  constraint project_proposals_rates_nonnegative check (
    design_rate_cents >= 0
    and drafting_rate_cents >= 0
    and ca_day_rate_cents >= 0
    and labor_cents >= 0
  ),
  constraint project_proposals_hours_nonnegative check (
    bod_design_hours_per_1000 >= 0
    and bod_drafting_hours_per_1000 >= 0
    and dd_design_hours_per_1000 >= 0
    and dd_drafting_hours_per_1000 >= 0
    and ca_design_hours_per_1000 >= 0
    and ca_drafting_hours_per_1000 >= 0
    and ca_site_days >= 0
  ),
  constraint project_proposals_hardware_pct_total check (
    hardware_deposit_pct >= 0
    and hardware_delivery_pct >= 0
    and hardware_substantial_pct >= 0
    and hardware_deposit_pct <= 100
    and hardware_delivery_pct <= 100
    and hardware_substantial_pct <= 100
    and hardware_deposit_pct + hardware_delivery_pct + hardware_substantial_pct = 100
  ),
  constraint project_proposals_labor_pct_total check (
    labor_deposit_pct >= 0
    and labor_delivery_pct >= 0
    and labor_substantial_pct >= 0
    and labor_deposit_pct <= 100
    and labor_delivery_pct <= 100
    and labor_substantial_pct <= 100
    and labor_deposit_pct + labor_delivery_pct + labor_substantial_pct = 100
  )
);

comment on table public.project_proposals is
  'Editable proposal draft. kind is design or implementation. One row per project and kind. Fee inputs are stored here so the math is not hidden. Subject to the Master Subcontractor Agreement; this row is not an executed contract.';

comment on column public.project_proposals.design_rate_cents is
  'Design hourly rate in cents. Default 20000 is $200. Shown on the draft.';

comment on column public.project_proposals.ca_site_days is
  'Construction-administration site days for the whole project, not per 1,000 sf. Default 4.';

comment on column public.project_proposals.hardware_deposit_pct is
  'Hardware ordering deposit. Default 90. With delivery 8 and substantial completion 2, the three add to 100.';

comment on column public.project_proposals.labor_cents is
  'Implementation labor total in cents, entered by an editor. Default 0. Not derived from area or from MSRP.';

comment on column public.project_proposals.scope_keys is
  'Library scope blocks included on this draft. Keys live in src/lib/proposal-library.ts.';

create table if not exists public.proposal_lines (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.project_proposals (id) on delete cascade,
  bom_item_id uuid references public.bom_items (id) on delete set null,
  phase public.proposal_phase not null default 'installation',
  name text not null,
  system_key text not null default '',
  space_label text not null default '',
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'ea',
  unit_msrp_cents integer,
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint proposal_lines_name_not_blank check (char_length(btrim(name)) > 0),
  constraint proposal_lines_name_length check (char_length(name) <= 200),
  constraint proposal_lines_system_length check (char_length(system_key) <= 80),
  constraint proposal_lines_space_length check (char_length(space_label) <= 160),
  constraint proposal_lines_quantity_positive check (quantity > 0),
  constraint proposal_lines_unit_not_blank check (char_length(btrim(unit)) > 0),
  constraint proposal_lines_unit_length check (char_length(unit) <= 32),
  constraint proposal_lines_msrp_nonnegative check (unit_msrp_cents is null or unit_msrp_cents >= 0),
  constraint proposal_lines_notes_length check (char_length(notes) <= 2000),
  constraint proposal_lines_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.proposal_lines is
  'Implementation proposal fee lines, grouped by system and space. unit_msrp_cents is null until an editor types it. Quantity times that unit price is the extension. No markup column.';

comment on column public.proposal_lines.unit_msrp_cents is
  'Editor-entered unit MSRP in cents. Null means the line is listed and excluded from the hardware total.';

comment on column public.proposal_lines.bom_item_id is
  'Bill of materials line this fee row was copied from. Null for a line added on the proposal. Cleared if that equipment row is removed from the database.';

create index if not exists proposal_lines_proposal_sort_idx
  on public.proposal_lines (proposal_id, sort_order);

create unique index if not exists proposal_lines_bom_live_idx
  on public.proposal_lines (proposal_id, bom_item_id)
  where bom_item_id is not null and deleted_at is null;

create or replace function public.discovery_narrative_space_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.narrative_space_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.project_spaces s
    where s.id = new.narrative_space_id
      and s.project_id = new.project_id
      and s.deleted_at is null
  ) then
    raise exception 'Narrative space must be a live space on this project.';
  end if;
  return new;
end;
$$;

create or replace function public.clear_discovery_narrative_link_on_archive()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.discovery_spaces
    set narrative_space_id = null
    where narrative_space_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.bom_discovery_answer_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.discovery_answer_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.discovery_answers a
    where a.id = new.discovery_answer_id
      and a.project_id = new.project_id
  ) then
    raise exception 'Discovery answer is not on this project.';
  end if;
  return new;
end;
$$;

drop trigger if exists discovery_spaces_narrative_space_check on public.discovery_spaces;
create trigger discovery_spaces_narrative_space_check
before insert or update of narrative_space_id, project_id on public.discovery_spaces
for each row execute function public.discovery_narrative_space_check();

drop trigger if exists project_spaces_clear_discovery_link on public.project_spaces;
create trigger project_spaces_clear_discovery_link
after update of deleted_at on public.project_spaces
for each row execute function public.clear_discovery_narrative_link_on_archive();

drop trigger if exists bom_items_discovery_answer_check on public.bom_items;
create trigger bom_items_discovery_answer_check
before insert or update of discovery_answer_id, project_id on public.bom_items
for each row execute function public.bom_discovery_answer_check();

drop trigger if exists project_proposals_set_updated_at on public.project_proposals;
create trigger project_proposals_set_updated_at
before update on public.project_proposals
for each row execute function public.set_updated_at();

drop trigger if exists proposal_lines_set_updated_at on public.proposal_lines;
create trigger proposal_lines_set_updated_at
before update on public.proposal_lines
for each row execute function public.set_updated_at();

revoke all on function public.discovery_narrative_space_check() from public, anon;
revoke all on function public.clear_discovery_narrative_link_on_archive() from public, anon;
revoke all on function public.bom_discovery_answer_check() from public, anon;
grant execute on function public.discovery_narrative_space_check() to authenticated;
grant execute on function public.clear_discovery_narrative_link_on_archive() to authenticated;
grant execute on function public.bom_discovery_answer_check() to authenticated;

alter table public.project_proposals enable row level security;
alter table public.proposal_lines enable row level security;

drop policy if exists project_proposals_select on public.project_proposals;
create policy project_proposals_select on public.project_proposals
  for select to authenticated
  using (public.is_editor());

drop policy if exists project_proposals_insert on public.project_proposals;
create policy project_proposals_insert on public.project_proposals
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists project_proposals_update on public.project_proposals;
create policy project_proposals_update on public.project_proposals
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists proposal_lines_select on public.proposal_lines;
create policy proposal_lines_select on public.proposal_lines
  for select to authenticated
  using (public.is_editor());

drop policy if exists proposal_lines_insert on public.proposal_lines;
create policy proposal_lines_insert on public.proposal_lines
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists proposal_lines_update on public.proposal_lines;
create policy proposal_lines_update on public.proposal_lines
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

revoke all on table public.project_proposals from anon, authenticated;
revoke all on table public.proposal_lines from anon, authenticated;
grant select, insert, update on table public.project_proposals to authenticated;
grant select, insert, update on table public.proposal_lines to authenticated;

grant usage on type public.proposal_kind to authenticated;
grant usage on type public.proposal_phase to authenticated;

revoke all on table public.projects from anon;
revoke all on table public.discovery_spaces from anon;
revoke all on table public.bom_items from anon;
revoke all on all tables in schema public from anon;

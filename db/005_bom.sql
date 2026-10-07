-- CMPLX iT Design — bill of materials (v1.2)
-- Apply after 001_schema.sql → 002_rls.sql → 003_seed.sql → 004_spaces_narrative.sql.
-- One equipment line per row, hanging off a project. Space and category are
-- optional. No prices. Editors only. No DELETE grant — remove a line by
-- setting deleted_at. Archiving a space unassigns its lines; it does not
-- delete them.

create table public.bom_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text not null default '',
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'ea',
  manufacturer text not null default '',
  model text not null default '',
  sku text not null default '',
  space_id uuid references public.project_spaces (id) on delete set null,
  category_key text references public.technology_categories (key),
  notes text not null default '',
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bom_items_name_not_blank check (char_length(btrim(name)) > 0),
  constraint bom_items_name_length check (char_length(name) <= 200),
  constraint bom_items_description_length check (char_length(description) <= 2000),
  constraint bom_items_quantity_positive check (quantity > 0),
  constraint bom_items_unit_not_blank check (char_length(btrim(unit)) > 0),
  constraint bom_items_unit_length check (char_length(unit) <= 32),
  constraint bom_items_manufacturer_length check (char_length(manufacturer) <= 160),
  constraint bom_items_model_length check (char_length(model) <= 160),
  constraint bom_items_sku_length check (char_length(sku) <= 80),
  constraint bom_items_notes_length check (char_length(notes) <= 2000),
  constraint bom_items_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.bom_items is
  'Equipment lines for a project. Optional space and standard-15 category. No pricing.';

comment on column public.bom_items.quantity is
  'Count in unit. Up to 3 decimal places, for lengths as well as each.';

comment on column public.bom_items.unit is
  'Free text. ea, m, set, pair, and lot are the common ones.';

comment on column public.bom_items.space_id is
  'Null when the line is not tied to a room. Cleared when that space is archived.';

comment on column public.bom_items.category_key is
  'Null when uncategorized. Otherwise technology_categories.key.';

create index bom_items_project_sort_idx
  on public.bom_items (project_id, sort_order);

create index bom_items_deleted_at_idx
  on public.bom_items (deleted_at);

create index bom_items_space_id_idx
  on public.bom_items (space_id);

create trigger bom_items_set_updated_at
before update on public.bom_items
for each row execute function public.set_updated_at();

-- Soft-delete of a space must not take the equipment with it.
create or replace function public.clear_bom_space_on_archive()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.bom_items
    set space_id = null
    where space_id = new.id
      and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger project_spaces_clear_bom_space
after update of deleted_at on public.project_spaces
for each row execute function public.clear_bom_space_on_archive();

grant execute on function public.clear_bom_space_on_archive() to authenticated;

alter table public.bom_items enable row level security;

create policy bom_items_select on public.bom_items
  for select to authenticated
  using (public.is_editor());

create policy bom_items_insert on public.bom_items
  for insert to authenticated
  with check (public.is_editor());

create policy bom_items_update on public.bom_items
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Supabase grants new public tables to anon and authenticated, including DELETE.
-- Strip that, then give editors select, insert, and update only.
revoke all on table public.bom_items from anon, authenticated;

grant select, insert, update on table public.bom_items to authenticated;

-- DEMO lines for the optional 003 seed projects, using 004 space ids.
-- No-ops when those projects or spaces were never inserted. Not live client data.
-- Manufacturer DEMO marks the row as seed, same as the DEMO — project names.

insert into public.bom_items (
  id, project_id, name, description, quantity, unit,
  manufacturer, model, sku, space_id, category_key, notes, sort_order
)
select
  v.id, v.project_id, v.name, v.description, v.quantity, v.unit,
  v.manufacturer, v.model, v.sku, v.space_id, v.category_key, v.notes, v.sort_order
from (
  values
    (
      'e1111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Ceiling access point',
      'Ceiling wireless access point for the public volume.',
      8::numeric,
      'ea',
      'DEMO',
      'AP-CEILING',
      'DEMO-AP',
      'a1111111-1111-4111-8111-111111111101'::uuid,
      'wireless',
      'Count locks after the furniture layout.',
      1
    ),
    (
      'e1111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Members door reader',
      'Reader for the members entrance.',
      1::numeric,
      'ea',
      'DEMO',
      'READER-MULLION',
      '',
      'a1111111-1111-4111-8111-111111111101'::uuid,
      'access_control',
      'Strike in the existing leaf. No turnstile.',
      2
    ),
    (
      'e1111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Dock-side projector',
      'Single projector for speech and image.',
      1::numeric,
      'ea',
      'DEMO',
      'PROJECTOR-1',
      '',
      'a1111111-1111-4111-8111-111111111102'::uuid,
      'av_events',
      'Long wall. No stage lighting in this phase.',
      3
    ),
    (
      'e1111111-1111-4111-8111-111111111104'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Service-corridor cabinet',
      'Wall cabinet for the service-corridor IDF.',
      1::numeric,
      'ea',
      'DEMO',
      'CAB-12U',
      '',
      'a1111111-1111-4111-8111-111111111103'::uuid,
      'structured_cabling',
      'Off the guest path. No public-facing racks.',
      4
    ),
    (
      'e1111111-1111-4111-8111-111111111105'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Category cable',
      'Horizontal cable from the IDF.',
      500::numeric,
      'm',
      'DEMO',
      'CABLE-CAT6A',
      'DEMO-C6A',
      'a1111111-1111-4111-8111-111111111103'::uuid,
      'structured_cabling',
      'Short runs to the lobby and the dock-side room.',
      5
    ),
    (
      'e2222222-2222-4222-8222-222222222201'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'In-room panel',
      'In-room entertainment panel, one per key.',
      84::numeric,
      'ea',
      'DEMO',
      'PANEL-ROOM',
      '',
      'a2222222-2222-4222-8222-222222222201'::uuid,
      'iptv',
      'Headend stays if it can feed these panels.',
      1
    ),
    (
      'e2222222-2222-4222-8222-222222222202'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Guest-room lock',
      'Lockset for the listed door leaf.',
      84::numeric,
      'ea',
      'DEMO',
      'LOCK-LEAF',
      '',
      'a2222222-2222-4222-8222-222222222201'::uuid,
      'access_control',
      'No new frame and no surface maglock.',
      2
    ),
    (
      'e2222222-2222-4222-8222-222222222203'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Corridor access point',
      'Guest wireless along corridors and stairs.',
      12::numeric,
      'ea',
      'DEMO',
      'AP-CORRIDOR',
      '',
      'a2222222-2222-4222-8222-222222222202'::uuid,
      'wireless',
      'Staff SSID stays off the guest ceiling where the fabric allows.',
      3
    )
) as v(
  id, project_id, name, description, quantity, unit,
  manufacturer, model, sku, space_id, category_key, notes, sort_order
)
where exists (
  select 1
  from public.projects p
  where p.id = v.project_id
    and p.deleted_at is null
)
and exists (
  select 1
  from public.project_spaces s
  where s.id = v.space_id
    and s.project_id = v.project_id
    and s.deleted_at is null
)
on conflict (id) do nothing;

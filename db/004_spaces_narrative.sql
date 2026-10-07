-- CMPLX iT Design — spaces + system narrative (v1.1)
-- Apply after 001_schema.sql → 002_rls.sql → 003_seed.sql.
-- Postgres 15+ (Supabase default): UNIQUE NULLS NOT DISTINCT so each space
-- has one overview row (category_key null) and one row per category.
-- Editors only. No DELETE grant — remove a space by setting deleted_at.

create table public.project_spaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  sort_order integer not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint project_spaces_name_not_blank check (char_length(btrim(name)) > 0),
  constraint project_spaces_name_length check (char_length(name) <= 160),
  constraint project_spaces_note_length check (char_length(note) <= 400),
  constraint project_spaces_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.project_spaces is
  'Rooms or zones on a project. System narrative hangs off each space.';

create table public.space_system_narratives (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.project_spaces (id) on delete cascade,
  category_key text references public.technology_categories (key),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_system_narratives_space_category_key
    unique nulls not distinct (space_id, category_key)
);

comment on table public.space_system_narratives is
  'How systems land in one space. category_key null is the whole-space overview.';

comment on column public.space_system_narratives.category_key is
  'Null = overview for the space. Otherwise technology_categories.key.';

create index project_spaces_project_sort_idx
  on public.project_spaces (project_id, sort_order);

create index project_spaces_deleted_at_idx
  on public.project_spaces (deleted_at);

create index space_system_narratives_space_id_idx
  on public.space_system_narratives (space_id);

create index space_system_narratives_category_key_idx
  on public.space_system_narratives (category_key);

create trigger project_spaces_set_updated_at
before update on public.project_spaces
for each row execute function public.set_updated_at();

create trigger space_system_narratives_set_updated_at
before update on public.space_system_narratives
for each row execute function public.set_updated_at();

alter table public.project_spaces enable row level security;
alter table public.space_system_narratives enable row level security;

create policy project_spaces_select on public.project_spaces
  for select to authenticated
  using (public.is_editor());

create policy project_spaces_insert on public.project_spaces
  for insert to authenticated
  with check (public.is_editor());

create policy project_spaces_update on public.project_spaces
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy space_system_narratives_select on public.space_system_narratives
  for select to authenticated
  using (public.is_editor());

create policy space_system_narratives_insert on public.space_system_narratives
  for insert to authenticated
  with check (public.is_editor());

create policy space_system_narratives_update on public.space_system_narratives
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Supabase grants new public tables to anon and authenticated, including DELETE.
-- Strip that, then give editors select/insert/update only.
revoke all on table public.project_spaces from anon, authenticated;
revoke all on table public.space_system_narratives from anon, authenticated;

grant select, insert, update on table public.project_spaces to authenticated;
grant select, insert, update on table public.space_system_narratives to authenticated;

-- DEMO spaces for the optional 003 seed projects. No-ops when those projects
-- were never inserted. Not live client data.

insert into public.project_spaces (id, project_id, name, sort_order, note)
select v.id, v.project_id, v.name, v.sort_order, v.note
from (
  values
    (
      'a1111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Lobby',
      1,
      'Members arrival'
    ),
    (
      'a1111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Dock-side room',
      2,
      'Events and meetings'
    ),
    (
      'a1111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Back of house',
      3,
      'Service corridor IDF'
    ),
    (
      'a2222222-2222-4222-8222-222222222201'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Guest rooms',
      1,
      '84 keys'
    ),
    (
      'a2222222-2222-4222-8222-222222222202'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Circulation',
      2,
      'Corridors and stairs'
    )
) as v(id, project_id, name, sort_order, note)
where exists (
  select 1
  from public.projects p
  where p.id = v.project_id
    and p.deleted_at is null
)
on conflict (id) do nothing;

insert into public.space_system_narratives (id, space_id, category_key, body)
select v.id, v.space_id, v.category_key, v.body
from (
  values
    (
      'd1111111-1111-4111-8111-111111111101'::uuid,
      'a1111111-1111-4111-8111-111111111101'::uuid,
      null::text,
      'Arrival stays quiet. Technology sits in the joinery: a discreet reader, staff radio coverage, and wireless that holds when the door queue builds.'
    ),
    (
      'd1111111-1111-4111-8111-111111111102'::uuid,
      'a1111111-1111-4111-8111-111111111101'::uuid,
      'wireless',
      'Ceiling APs clear of the timber truss. Guest SSID in the public volume; staff SSID reaches the host desk.'
    ),
    (
      'd1111111-1111-4111-8111-111111111103'::uuid,
      'a1111111-1111-4111-8111-111111111101'::uuid,
      'access_control',
      'One reader on the members door, strike in the existing leaf. No turnstile and no lobby pedestal.'
    ),
    (
      'd1111111-1111-4111-8111-111111111104'::uuid,
      'a1111111-1111-4111-8111-111111111102'::uuid,
      null::text,
      'One room, one purpose: speech and a single image. Nothing else competes with the view to the dock.'
    ),
    (
      'd1111111-1111-4111-8111-111111111105'::uuid,
      'a1111111-1111-4111-8111-111111111102'::uuid,
      'av_events',
      'Projection on the long wall and speech reinforcement. No stage-lighting package in this phase.'
    ),
    (
      'd1111111-1111-4111-8111-111111111106'::uuid,
      'a1111111-1111-4111-8111-111111111103'::uuid,
      null::text,
      'The only place racks are allowed. Service corridor IDF, off the guest path.'
    ),
    (
      'd1111111-1111-4111-8111-111111111107'::uuid,
      'a1111111-1111-4111-8111-111111111103'::uuid,
      'structured_cabling',
      'New IDF with short runs to the dock-side room and the lobby. No public-facing cabinets.'
    ),
    (
      'd2222222-2222-4222-8222-222222222201'::uuid,
      'a2222222-2222-4222-8222-222222222201'::uuid,
      null::text,
      'Eighty-four keys. The room should feel unchanged; the lock, the set, and the network are the work.'
    ),
    (
      'd2222222-2222-4222-8222-222222222202'::uuid,
      'a2222222-2222-4222-8222-222222222201'::uuid,
      'iptv',
      'Replace the in-room set. Keep the current headend if it can feed the new panels.'
    ),
    (
      'd2222222-2222-4222-8222-222222222203'::uuid,
      'a2222222-2222-4222-8222-222222222201'::uuid,
      'access_control',
      'Lock must mate with the listed door leaf. No new frame, no surface maglock.'
    ),
    (
      'd2222222-2222-4222-8222-222222222204'::uuid,
      'a2222222-2222-4222-8222-222222222202'::uuid,
      null::text,
      'Circulation carries guest wireless and a staff path back to the service core. No new racks here.'
    ),
    (
      'd2222222-2222-4222-8222-222222222205'::uuid,
      'a2222222-2222-4222-8222-222222222202'::uuid,
      'wireless',
      'Guest coverage along corridors and stairs. Staff SSID stays off the guest ceiling where the fabric allows.'
    )
) as v(id, space_id, category_key, body)
where exists (
  select 1
  from public.project_spaces s
  where s.id = v.space_id
)
on conflict (id) do nothing;

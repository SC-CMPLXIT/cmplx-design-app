-- CMPLX iT Design — discovery (v1.4)
-- Apply after 001_schema.sql → 002_rls.sql → 003_seed.sql → 004_spaces_narrative.sql → 005_bom.sql → 006_kickoff.sql.
-- Idempotent and non-destructive. Safe to re-run. Applied by hand in the SQL editor.
-- Re-running refreshes discovery question prompts and the question↔system mapping.
-- It does not overwrite spaces, answers, attachments, discrepancies, or files.
--
-- Reuses technology_systems, project_system_scope, question_answer_status, and
-- scope_questions from 006. bank = 'discovery' is the per-space checklist.
-- Discovery rooms are not project_spaces (those stay the system-narrative list).
--
-- Storage
--   Bucket: discovery
--     private (public = false)
--     file_size_limit 20971520 (20 MiB)
--     allowed_mime_types: application/pdf, image/jpeg, image/png, image/webp
--   Helper: public.discovery_object_allowed(object_name)
--     true only for projects/<project uuid>/<object uuid>.(pdf|jpg|png|webp)
--     when that project exists and is not archived
--   Policies on storage.objects (role authenticated, editors only via is_editor()):
--     discovery_objects_select  — read an object (signed URLs need this)
--     discovery_objects_insert  — upload a new object
--     discovery_objects_update  — replace an object (storage upsert needs select + insert + update)
--   No DELETE policy. No policy for anon. Archive a file by setting discovery_attachments.deleted_at.
--   Object key shape: projects/<projectId>/<attachmentId>.<ext>
--
-- Keep discovery prompts in sync with src/lib/systems.ts (DISCOVERY_QUESTIONS).

do $$
begin
  create type public.discovery_attachment_kind as enum ('floor_plan', 'rendering');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.discovery_severity as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.discovery_discrepancy_status as enum ('open', 'resolved');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.discovery_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.discovery_attachment_kind not null,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  byte_size bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint discovery_attachments_path_unique unique (storage_path),
  constraint discovery_attachments_file_name_not_blank check (char_length(btrim(file_name)) > 0),
  constraint discovery_attachments_file_name_length check (char_length(file_name) <= 200),
  constraint discovery_attachments_byte_size_range check (byte_size > 0 and byte_size <= 20971520),
  constraint discovery_attachments_sort_order_nonnegative check (sort_order >= 0),
  constraint discovery_attachments_type_kind check (
    (kind = 'floor_plan' and content_type = 'application/pdf')
    or (kind = 'rendering' and content_type in ('image/jpeg', 'image/png', 'image/webp'))
  ),
  constraint discovery_attachments_path_shape check (
    storage_path = 'projects/' || project_id::text || '/' || id::text || '.' ||
      case content_type
        when 'application/pdf' then 'pdf'
        when 'image/jpeg' then 'jpg'
        when 'image/png' then 'png'
        when 'image/webp' then 'webp'
        else 'invalid'
      end
  )
);

comment on table public.discovery_attachments is
  'Floor-plan PDFs and rendering images for discovery. Bytes live in the private storage bucket discovery. Removing a file sets deleted_at.';

comment on column public.discovery_attachments.storage_path is
  'Object key projects/<project_id>/<id>.<ext> inside the private discovery bucket.';

create table if not exists public.discovery_spaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  group_name text not null default '',
  plan_shows text not null default '',
  intended_use text not null default '',
  occupancy text not null default '',
  notes text not null default '',
  thumbnail_attachment_id uuid references public.discovery_attachments (id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint discovery_spaces_name_not_blank check (char_length(btrim(name)) > 0),
  constraint discovery_spaces_name_length check (char_length(name) <= 160),
  constraint discovery_spaces_group_length check (char_length(group_name) <= 80),
  constraint discovery_spaces_plan_shows_length check (char_length(plan_shows) <= 2000),
  constraint discovery_spaces_intended_use_length check (char_length(intended_use) <= 2000),
  constraint discovery_spaces_occupancy_length check (char_length(occupancy) <= 160),
  constraint discovery_spaces_notes_length check (char_length(notes) <= 8000),
  constraint discovery_spaces_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.discovery_spaces is
  'Discovery rooms on a project. Separate from project_spaces, which stay the system-narrative list. group_name is a floor or zone. Soft delete via deleted_at.';

comment on column public.discovery_spaces.group_name is
  'Floor or zone label. Empty means ungrouped.';

comment on column public.discovery_spaces.plan_shows is
  'What the floor plan shows for this room, in the editor''s words.';

comment on column public.discovery_spaces.thumbnail_attachment_id is
  'Optional rendering on this project. Cleared when that file is archived.';

create table if not exists public.discovery_answers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  space_id uuid not null references public.discovery_spaces (id) on delete cascade,
  question_key text not null references public.scope_questions (key),
  body text not null default '',
  status public.question_answer_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovery_answers_space_question unique (space_id, question_key),
  constraint discovery_answers_body_length check (char_length(body) <= 8000)
);

comment on table public.discovery_answers is
  'Per-project, per-space discovery answer. status is open, answered, or locked. An empty body stays as a row; there is no client delete.';

create table if not exists public.discovery_discrepancies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  space_id uuid references public.discovery_spaces (id) on delete set null,
  plan_shows text not null default '',
  notes_say text not null default '',
  severity public.discovery_severity not null default 'medium',
  status public.discovery_discrepancy_status not null default 'open',
  resolution_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint discovery_discrepancies_has_text check (
    char_length(btrim(plan_shows)) > 0 or char_length(btrim(notes_say)) > 0
  ),
  constraint discovery_discrepancies_plan_length check (char_length(plan_shows) <= 2000),
  constraint discovery_discrepancies_notes_length check (char_length(notes_say) <= 2000),
  constraint discovery_discrepancies_resolution_length check (char_length(resolution_note) <= 2000)
);

comment on table public.discovery_discrepancies is
  'Plan-versus-notes gaps on a project. space_id is optional. status is open or resolved. Soft delete via deleted_at.';

comment on column public.discovery_discrepancies.resolution_note is
  'Why a resolved gap was closed. Empty while the gap is open.';

create index if not exists discovery_attachments_project_idx
  on public.discovery_attachments (project_id, sort_order);

create index if not exists discovery_spaces_project_sort_idx
  on public.discovery_spaces (project_id, sort_order);

create index if not exists discovery_spaces_thumbnail_idx
  on public.discovery_spaces (thumbnail_attachment_id);

create index if not exists discovery_answers_project_space_idx
  on public.discovery_answers (project_id, space_id);

create index if not exists discovery_discrepancies_project_idx
  on public.discovery_discrepancies (project_id);

drop trigger if exists discovery_attachments_set_updated_at on public.discovery_attachments;
create trigger discovery_attachments_set_updated_at
before update on public.discovery_attachments
for each row execute function public.set_updated_at();

drop trigger if exists discovery_spaces_set_updated_at on public.discovery_spaces;
create trigger discovery_spaces_set_updated_at
before update on public.discovery_spaces
for each row execute function public.set_updated_at();

drop trigger if exists discovery_answers_set_updated_at on public.discovery_answers;
create trigger discovery_answers_set_updated_at
before update on public.discovery_answers
for each row execute function public.set_updated_at();

drop trigger if exists discovery_discrepancies_set_updated_at on public.discovery_discrepancies;
create trigger discovery_discrepancies_set_updated_at
before update on public.discovery_discrepancies
for each row execute function public.set_updated_at();

create or replace function public.discovery_space_thumbnail_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.thumbnail_attachment_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.discovery_attachments a
    where a.id = new.thumbnail_attachment_id
      and a.project_id = new.project_id
      and a.kind = 'rendering'
      and a.deleted_at is null
  ) then
    raise exception 'Thumbnail must be a rendering uploaded on this project.';
  end if;
  return new;
end;
$$;

create or replace function public.discovery_attachment_clear_thumbs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.discovery_spaces
    set thumbnail_attachment_id = null
    where thumbnail_attachment_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.discovery_answer_check()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  space_project uuid;
begin
  select s.project_id into space_project
  from public.discovery_spaces s
  where s.id = new.space_id;
  if space_project is null or space_project <> new.project_id then
    raise exception 'Answer space is not on this project.';
  end if;
  if not exists (
    select 1
    from public.scope_questions q
    where q.key = new.question_key
      and q.bank = 'discovery'
  ) then
    raise exception 'That question is not in the discovery bank.';
  end if;
  return new;
end;
$$;

create or replace function public.discovery_discrepancy_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.space_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.discovery_spaces s
    where s.id = new.space_id
      and s.project_id = new.project_id
  ) then
    raise exception 'Discrepancy space is not on this project.';
  end if;
  return new;
end;
$$;

drop trigger if exists discovery_spaces_thumbnail_check on public.discovery_spaces;
create trigger discovery_spaces_thumbnail_check
before insert or update on public.discovery_spaces
for each row execute function public.discovery_space_thumbnail_check();

drop trigger if exists discovery_attachments_clear_thumbs on public.discovery_attachments;
create trigger discovery_attachments_clear_thumbs
after update on public.discovery_attachments
for each row execute function public.discovery_attachment_clear_thumbs();

drop trigger if exists discovery_answers_check on public.discovery_answers;
create trigger discovery_answers_check
before insert or update on public.discovery_answers
for each row execute function public.discovery_answer_check();

drop trigger if exists discovery_discrepancies_check on public.discovery_discrepancies;
create trigger discovery_discrepancies_check
before insert or update on public.discovery_discrepancies
for each row execute function public.discovery_discrepancy_check();

revoke all on function public.discovery_space_thumbnail_check() from public, anon;
revoke all on function public.discovery_attachment_clear_thumbs() from public, anon;
revoke all on function public.discovery_answer_check() from public, anon;
revoke all on function public.discovery_discrepancy_check() from public, anon;
grant execute on function public.discovery_space_thumbnail_check() to authenticated;
grant execute on function public.discovery_attachment_clear_thumbs() to authenticated;
grant execute on function public.discovery_answer_check() to authenticated;
grant execute on function public.discovery_discrepancy_check() to authenticated;

-- Path check for storage policies. security invoker so project visibility follows RLS.
create or replace function public.discovery_object_allowed(object_name text)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  project_text text;
  project_id uuid;
begin
  if object_name is null
     or object_name !~ '^projects/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
  then
    return false;
  end if;
  project_text := substring(object_name from '^projects/([0-9a-fA-F-]{36})');
  begin
    project_id := project_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;
  return exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.deleted_at is null
  );
end;
$$;

comment on function public.discovery_object_allowed(text) is
  'True when the object key is projects/<project uuid>/<file uuid>.<ext> and that project is still live.';

revoke all on function public.discovery_object_allowed(text) from public, anon;
grant execute on function public.discovery_object_allowed(text) to authenticated;

alter table public.discovery_attachments enable row level security;
alter table public.discovery_spaces enable row level security;
alter table public.discovery_answers enable row level security;
alter table public.discovery_discrepancies enable row level security;

drop policy if exists discovery_attachments_select on public.discovery_attachments;
create policy discovery_attachments_select on public.discovery_attachments
  for select to authenticated
  using (public.is_editor());

drop policy if exists discovery_attachments_insert on public.discovery_attachments;
create policy discovery_attachments_insert on public.discovery_attachments
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists discovery_attachments_update on public.discovery_attachments;
create policy discovery_attachments_update on public.discovery_attachments
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists discovery_spaces_select on public.discovery_spaces;
create policy discovery_spaces_select on public.discovery_spaces
  for select to authenticated
  using (public.is_editor());

drop policy if exists discovery_spaces_insert on public.discovery_spaces;
create policy discovery_spaces_insert on public.discovery_spaces
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists discovery_spaces_update on public.discovery_spaces;
create policy discovery_spaces_update on public.discovery_spaces
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists discovery_answers_select on public.discovery_answers;
create policy discovery_answers_select on public.discovery_answers
  for select to authenticated
  using (public.is_editor());

drop policy if exists discovery_answers_insert on public.discovery_answers;
create policy discovery_answers_insert on public.discovery_answers
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists discovery_answers_update on public.discovery_answers;
create policy discovery_answers_update on public.discovery_answers
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists discovery_discrepancies_select on public.discovery_discrepancies;
create policy discovery_discrepancies_select on public.discovery_discrepancies
  for select to authenticated
  using (public.is_editor());

drop policy if exists discovery_discrepancies_insert on public.discovery_discrepancies;
create policy discovery_discrepancies_insert on public.discovery_discrepancies
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists discovery_discrepancies_update on public.discovery_discrepancies;
create policy discovery_discrepancies_update on public.discovery_discrepancies
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Supabase grants new public tables to anon and authenticated, including DELETE.
-- Strip that, then give editors select/insert/update only.
revoke all on table public.discovery_attachments from anon, authenticated;
revoke all on table public.discovery_spaces from anon, authenticated;
revoke all on table public.discovery_answers from anon, authenticated;
revoke all on table public.discovery_discrepancies from anon, authenticated;

grant select, insert, update on table public.discovery_attachments to authenticated;
grant select, insert, update on table public.discovery_spaces to authenticated;
grant select, insert, update on table public.discovery_answers to authenticated;
grant select, insert, update on table public.discovery_discrepancies to authenticated;

grant usage on type public.discovery_attachment_kind to authenticated;
grant usage on type public.discovery_severity to authenticated;
grant usage on type public.discovery_discrepancy_status to authenticated;

comment on column public.technology_systems.applies_to is
  'project = kickoff only. space = per-space discovery. both = either surface.';

comment on column public.scope_questions.bank is
  'kickoff = project questionnaire. discovery = per-space checklist on the same systems.';

-- Private bucket. Re-run keeps it private and refreshes the upload limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'discovery',
  'discovery',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists discovery_objects_select on storage.objects;
create policy discovery_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'discovery'
    and public.is_editor()
    and public.discovery_object_allowed(name)
  );

drop policy if exists discovery_objects_insert on storage.objects;
create policy discovery_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'discovery'
    and public.is_editor()
    and public.discovery_object_allowed(name)
  );

drop policy if exists discovery_objects_update on storage.objects;
create policy discovery_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'discovery'
    and public.is_editor()
    and public.discovery_object_allowed(name)
  )
  with check (
    bucket_id = 'discovery'
    and public.is_editor()
    and public.discovery_object_allowed(name)
  );

-- Park existing discovery sort orders so the unique sort_order constraint
-- can be reapplied. Kickoff rows stay at 1–15. Does not touch prompts yet.
update public.scope_questions
set sort_order = sort_order + 100000
where bank = 'discovery'
  and sort_order > 0
  and sort_order < 100000;

insert into public.scope_questions (key, bank, section_key, section_name, prompt, sort_order)
values
(
    'it_drops',
    'discovery',
    'it_infrastructure',
    'IT infrastructure',
    'How many wired outlets does this space need, and where do they land (desk, display, table, floor box, equipment)? Who pulls the cable?',
    101
  ),
  (
    'it_pathway',
    'discovery',
    'it_infrastructure',
    'IT infrastructure',
    'How does cable enter this space — floor, ceiling, furniture, or wall — and is that pathway already drawn?',
    102
  ),
  (
    'it_equipment',
    'discovery',
    'it_infrastructure',
    'IT infrastructure',
    'Where does the equipment for this space live (in the room, in millwork, or in an IT room), and what power, heat, and clearance does that location need?',
    103
  ),
  (
    'network_ap',
    'discovery',
    'network_wifi',
    'Network / Wi-Fi',
    'Where should a wireless access point go in this space, and what ceiling or finish does it have to meet?',
    104
  ),
  (
    'network_coverage',
    'discovery',
    'network_wifi',
    'Network / Wi-Fi',
    'Is everyday coverage enough, or does this space need signal inside an enclosure (glass, a booth) or extra density for an event?',
    105
  ),
  (
    'network_wireless_devices',
    'discovery',
    'network_wifi',
    'Network / Wi-Fi',
    'Which devices here belong on wireless rather than a cable — handhelds, fitness equipment, signage players, or something else?',
    106
  ),
  (
    'display_purpose',
    'discovery',
    'display_video',
    'Display / video',
    'What should people see here: a single display, a video wall, projection, digital signage, or no image? What is the content for?',
    107
  ),
  (
    'display_location',
    'discovery',
    'display_video',
    'Display / video',
    'Where does that image sit, what size fits the wall or millwork, and how is the display serviced (structure, recess, ventilation, access)?',
    108
  ),
  (
    'display_sources',
    'discovery',
    'display_video',
    'Display / video',
    'How does content arrive: a wired input, wireless presentation, a player or content system, or a mix? Who supplies the content?',
    109
  ),
  (
    'display_sightlines',
    'discovery',
    'display_video',
    'Display / video',
    'Who has to see the image, from where, and does the plan already show power and data at that spot?',
    110
  ),
  (
    'audio_role',
    'discovery',
    'audio',
    'Audio',
    'Is this space background music, paging, speech reinforcement, a quiet zone, or no audio? Does it share a source and volume with its neighbors?',
    111
  ),
  (
    'audio_speakers',
    'discovery',
    'audio',
    'Audio',
    'Where can speakers go given the ceiling and finishes, and do they need a moisture, impact, or heat rating?',
    112
  ),
  (
    'audio_inputs',
    'discovery',
    'audio',
    'Audio',
    'Are live inputs required (a microphone, a presenter laptop, a music service)? Is a consumer platform acceptable, or does the use need a commercial system?',
    113
  ),
  (
    'audio_control',
    'discovery',
    'audio',
    'Audio',
    'Who changes volume and source, and is there a control in the space itself?',
    114
  ),
  (
    'conferencing_mode',
    'discovery',
    'conferencing',
    'Conferencing',
    'Is this a video-meeting room, a bring-your-own-device room, content only, or not a meeting space? Which meeting platform is the standard?',
    115
  ),
  (
    'conferencing_capture',
    'discovery',
    'conferencing',
    'Conferencing',
    'What camera and microphone coverage does the seating need — a video bar, a front-of-room camera, ceiling microphones, table microphones?',
    116
  ),
  (
    'conferencing_hybrid',
    'discovery',
    'conferencing',
    'Conferencing',
    'Do people in the room need voice lift, and will remote participants, a recording, or a stream join?',
    117
  ),
  (
    'conferencing_cabling',
    'discovery',
    'conferencing',
    'Conferencing',
    'Where do a laptop connection and any table cables land, and is a floor box, wall plate, or furniture feed already on the plan?',
    118
  ),
  (
    'control_panel',
    'discovery',
    'control',
    'Control',
    'What should an occupant control here (sources, volume, lighting, shades, a preset), and from where (table, wall, door)?',
    119
  ),
  (
    'control_schedule',
    'discovery',
    'control',
    'Control',
    'Is a scheduling panel or an in-use indicator needed outside the room, and who runs the space day to day?',
    120
  ),
  (
    'control_building',
    'discovery',
    'control',
    'Control',
    'Should lighting, shades, or another building system follow the room control, and who owns that interface?',
    121
  ),
  (
    'security_entry',
    'discovery',
    'security',
    'Security',
    'Who may enter, on what credential, and during which hours? Does the door need a reader, a lock, or an intercom?',
    122
  ),
  (
    'security_cameras',
    'discovery',
    'security',
    'Security',
    'Is a camera appropriate here? Call out privacy uses — restroom, treatment, changing, wellness — where a camera must not be placed or aimed.',
    123
  ),
  (
    'security_monitoring',
    'discovery',
    'security',
    'Security',
    'Who watches the image, how long is it kept, and does this space need an emergency call or alarm device?',
    124
  ),
  (
    'security_desk',
    'discovery',
    'security',
    'Security',
    'Does this space include a staffed desk, a visitor process, or an after-hours unlock?',
    125
  ),
  (
    'acoustics_privacy',
    'discovery',
    'acoustics',
    'Acoustics',
    'What speech privacy or noise isolation does this space need from its neighbors, and who is specifying it?',
    126
  ),
  (
    'acoustics_finishes',
    'discovery',
    'acoustics',
    'Acoustics',
    'Which finishes (glass, stone, wood, an open ceiling) will fight speakers, microphones, or privacy, and where can treatment go?',
    127
  ),
  (
    'acoustics_masking',
    'discovery',
    'acoustics',
    'Acoustics',
    'Is sound masking in scope, and is the goal privacy for the people inside, for the people outside, or both?',
    128
  )
on conflict (key) do update
set
  bank = excluded.bank,
  section_key = excluded.section_key,
  section_name = excluded.section_name,
  prompt = excluded.prompt,
  sort_order = excluded.sort_order;

delete from public.scope_question_systems
where question_key in (
  select key from public.scope_questions where bank = 'discovery'
);

insert into public.scope_question_systems (question_key, system_key)
values
  ('it_drops', 'it_infrastructure'),
  ('it_pathway', 'it_infrastructure'),
  ('it_equipment', 'it_infrastructure'),
  ('network_ap', 'network_wifi'),
  ('network_coverage', 'network_wifi'),
  ('network_wireless_devices', 'network_wifi'),
  ('display_purpose', 'display_video'),
  ('display_location', 'display_video'),
  ('display_sources', 'display_video'),
  ('display_sightlines', 'display_video'),
  ('audio_role', 'audio'),
  ('audio_speakers', 'audio'),
  ('audio_inputs', 'audio'),
  ('audio_control', 'audio'),
  ('conferencing_mode', 'conferencing'),
  ('conferencing_capture', 'conferencing'),
  ('conferencing_hybrid', 'conferencing'),
  ('conferencing_cabling', 'conferencing'),
  ('control_panel', 'control'),
  ('control_schedule', 'control'),
  ('control_building', 'control'),
  ('security_entry', 'security'),
  ('security_cameras', 'security'),
  ('security_monitoring', 'security'),
  ('security_desk', 'security'),
  ('acoustics_privacy', 'acoustics'),
  ('acoustics_finishes', 'acoustics'),
  ('acoustics_masking', 'acoustics');

-- DEMO rooms for the optional 003 projects. Not live client data.
insert into public.discovery_spaces (
  id, project_id, name, group_name, plan_shows, intended_use, occupancy, notes, sort_order, created_at, updated_at
)
select
  v.id,
  v.project_id,
  v.name,
  v.group_name,
  v.plan_shows,
  v.intended_use,
  v.occupancy,
  v.notes,
  v.sort_order,
  v.stamp,
  v.stamp
from (
  values
    (
      'e1111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Lobby',
      'Public floor',
      'DEMO — Members door and a host desk. No display or data symbol on the plan.',
      'DEMO — Arrival and host.',
      'DEMO — A short queue at the door.',
      'DEMO — Confirm whether the feature wall stays a static graphic.',
      1,
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e1111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Dock-side room',
      'Public floor',
      'DEMO — One image on the long wall, with power. No floor box shown.',
      'DEMO — Meetings and small events.',
      'DEMO — About a dozen seats.',
      'DEMO — Speech and a single image. Nothing else competes with the room.',
      2,
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e1111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Back of house',
      'Support',
      'DEMO — Service corridor room marked for IT. Power note only.',
      'DEMO — Racks and service. Not a guest room.',
      'DEMO — Staff only.',
      '',
      3,
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e2222222-2222-4222-8222-222222222201'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Guest rooms',
      'Guest floors',
      'DEMO — A display in each key. No new data symbols on the plan.',
      'DEMO — In-room entertainment and a lock.',
      'DEMO — One key per room.',
      'DEMO — Confirm whether the existing headend stays.',
      1,
      '2026-07-18T11:15:00.000Z'::timestamptz
    ),
    (
      'e2222222-2222-4222-8222-222222222202'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Circulation',
      'Guest floors',
      'DEMO — Corridors and stairs. No displays drawn.',
      'DEMO — Guest movement, with staff wireless separate from the guest network.',
      'DEMO — Transient.',
      '',
      2,
      '2026-07-18T11:15:00.000Z'::timestamptz
    )
) as v(
  id, project_id, name, group_name, plan_shows, intended_use, occupancy, notes, sort_order, stamp
)
where exists (
  select 1
  from public.projects p
  where p.id = v.project_id
    and p.deleted_at is null
)
on conflict (id) do nothing;

insert into public.discovery_answers (
  id, project_id, space_id, question_key, body, status, created_at, updated_at
)
select
  v.id,
  v.project_id,
  v.space_id,
  v.question_key,
  v.body,
  v.status::public.question_answer_status,
  v.stamp,
  v.stamp
from (
  values
    (
      'e3111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'e1111111-1111-4111-8111-111111111101'::uuid,
      'display_purpose',
      'DEMO — No image. The feature wall stays a static graphic.',
      'answered',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e3111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'e1111111-1111-4111-8111-111111111102'::uuid,
      'display_location',
      'DEMO — Long wall, one image. Size follows the furniture layout.',
      'locked',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e3111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'e1111111-1111-4111-8111-111111111102'::uuid,
      'conferencing_mode',
      'DEMO — Still deciding between a room system and a laptop on the table.',
      'open',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e3222222-2222-4222-8222-222222222201'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'e2222222-2222-4222-8222-222222222201'::uuid,
      'display_purpose',
      'DEMO — One display per key, for the in-room platform. No signage.',
      'answered',
      '2026-07-18T11:15:00.000Z'::timestamptz
    )
) as v(id, project_id, space_id, question_key, body, status, stamp)
where exists (
  select 1
  from public.discovery_spaces s
  where s.id = v.space_id
    and s.project_id = v.project_id
    and s.deleted_at is null
)
on conflict (space_id, question_key) do nothing;

insert into public.discovery_discrepancies (
  id, project_id, space_id, plan_shows, notes_say, severity, status, resolution_note, created_at, updated_at
)
select
  v.id,
  v.project_id,
  v.space_id,
  v.plan_shows,
  v.notes_say,
  v.severity::public.discovery_severity,
  v.status::public.discovery_discrepancy_status,
  v.resolution_note,
  v.stamp,
  v.stamp
from (
  values
    (
      'e4111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'e1111111-1111-4111-8111-111111111102'::uuid,
      'DEMO — One display on the long wall, with power. No floor box.',
      'DEMO — The events note asks for speech and a single image, which matches the plan. Outlet count is still open.',
      'medium',
      'open',
      '',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e4111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      null::uuid,
      'DEMO — Data is drawn only at the dock-side display.',
      'DEMO — The kickoff answer says two cables at each data outlet, including access points, but those outlets are not on the plan yet.',
      'high',
      'open',
      '',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'e4111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'e1111111-1111-4111-8111-111111111101'::uuid,
      'DEMO — No display on the lobby plan.',
      'DEMO — Arrival should stay a static graphic, with no image.',
      'low',
      'resolved',
      'DEMO — Agreed on the call. No display in this space.',
      '2026-06-02T16:30:00.000Z'::timestamptz
    )
) as v(id, project_id, space_id, plan_shows, notes_say, severity, status, resolution_note, stamp)
where exists (
  select 1
  from public.projects p
  where p.id = v.project_id
    and p.deleted_at is null
)
and (
  v.space_id is null
  or exists (
    select 1
    from public.discovery_spaces s
    where s.id = v.space_id
      and s.project_id = v.project_id
  )
)
on conflict (id) do nothing;

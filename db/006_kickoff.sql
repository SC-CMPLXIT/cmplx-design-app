-- CMPLX iT Design — kickoff questionnaire (v1.3)
-- Apply after 001_schema.sql → 002_rls.sql → 003_seed.sql → 004_spaces_narrative.sql → 005_bom.sql.
-- Idempotent and non-destructive. Safe to re-run.
-- Re-running refreshes system names, question prompts, and the scope↔question
-- mapping. It does not overwrite project scope flags or answers.
--
-- technology_systems is the shared checklist for this questionnaire and for
-- later discovery (per-space checklists, discrepancies, space-guide exports,
-- proposal/fee). scope_questions.bank = 'discovery' is reserved; no discovery
-- rows are seeded here.
--
-- Keep the seed text in sync with src/lib/systems.ts.
-- Editors only. No DELETE grant on scope or answers — clear an answer by
-- saving an empty body and status 'open'.

do $$
begin
  create type public.system_applies_to as enum ('project', 'space', 'both');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.question_answer_status as enum ('open', 'answered', 'locked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.technology_systems (
  key text primary key,
  name text not null,
  description text not null default '',
  sort_order integer not null,
  applies_to public.system_applies_to not null,
  constraint technology_systems_key_format check (key ~ '^[a-z0-9_]+$'),
  constraint technology_systems_name_not_blank check (char_length(btrim(name)) > 0),
  constraint technology_systems_name_length check (char_length(name) <= 80),
  constraint technology_systems_description_length check (char_length(description) <= 400),
  constraint technology_systems_sort_order_positive check (sort_order > 0),
  constraint technology_systems_sort_order_unique unique (sort_order)
);

comment on table public.technology_systems is
  'Canonical systems. Kickoff scope now; later discovery uses the same keys for per-space checklists, discrepancies, space guides, and proposal scope.';

comment on column public.technology_systems.applies_to is
  'project = kickoff / proposal. space = future per-space discovery. both = either surface.';

create table if not exists public.system_category_links (
  system_key text not null references public.technology_systems (key),
  category_key text not null references public.technology_categories (key),
  primary key (system_key, category_key)
);

comment on table public.system_category_links is
  'Maps a system onto the standard-15 brief checklist. One system may match several categories.';

create table if not exists public.scope_questions (
  key text primary key,
  bank text not null,
  section_key text not null,
  section_name text not null,
  prompt text not null,
  sort_order integer not null,
  constraint scope_questions_key_format check (key ~ '^[a-z0-9_]+$'),
  constraint scope_questions_bank_known check (bank in ('kickoff', 'discovery')),
  constraint scope_questions_section_key_format check (section_key ~ '^[a-z0-9_]+$'),
  constraint scope_questions_section_name_length check (char_length(section_name) between 1 and 80),
  constraint scope_questions_prompt_not_blank check (char_length(btrim(prompt)) > 0),
  constraint scope_questions_prompt_length check (char_length(prompt) <= 2000),
  constraint scope_questions_sort_order_positive check (sort_order > 0),
  constraint scope_questions_sort_order_unique unique (sort_order)
);

comment on table public.scope_questions is
  'Question bank. bank kickoff is seeded. bank discovery is reserved for per-space questions on the same systems.';

comment on column public.scope_questions.bank is
  'kickoff now. discovery later, still keyed to technology_systems.';

create table if not exists public.scope_question_systems (
  question_key text not null references public.scope_questions (key),
  system_key text not null references public.technology_systems (key),
  primary key (question_key, system_key)
);

comment on table public.scope_question_systems is
  'A question is visible when any linked system is in scope on the project.';

create table if not exists public.project_system_scope (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  system_key text not null references public.technology_systems (key),
  in_scope boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_system_scope_project_system unique (project_id, system_key)
);

comment on table public.project_system_scope is
  'Per-project system selection. Shared by kickoff now and discovery later. Turning a system off keeps the row and any answers.';

create table if not exists public.project_question_answers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  question_key text not null references public.scope_questions (key),
  body text not null default '',
  status public.question_answer_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_question_answers_project_question unique (project_id, question_key),
  constraint project_question_answers_body_length check (char_length(body) <= 8000)
);

comment on table public.project_question_answers is
  'Per-project answer. status is open, answered, or locked. An empty body stays as a row; there is no client delete.';

comment on column public.project_question_answers.status is
  'open = still in progress. answered = response is in. locked = frozen until an editor unlocks it.';

create index if not exists project_system_scope_project_idx
  on public.project_system_scope (project_id);

create index if not exists project_question_answers_project_idx
  on public.project_question_answers (project_id);

create index if not exists scope_questions_bank_sort_idx
  on public.scope_questions (bank, sort_order);

drop trigger if exists project_system_scope_set_updated_at on public.project_system_scope;
create trigger project_system_scope_set_updated_at
before update on public.project_system_scope
for each row execute function public.set_updated_at();

drop trigger if exists project_question_answers_set_updated_at on public.project_question_answers;
create trigger project_question_answers_set_updated_at
before update on public.project_question_answers
for each row execute function public.set_updated_at();

-- New projects get one scope row per system, out of scope, without touching answers.
create or replace function public.seed_project_system_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.project_system_scope (project_id, system_key)
  select new.id, s.key
  from public.technology_systems s
  on conflict (project_id, system_key) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_seed_system_scope on public.projects;
create trigger projects_seed_system_scope
after insert on public.projects
for each row execute function public.seed_project_system_scope();

revoke all on function public.seed_project_system_scope() from public, anon;
grant execute on function public.seed_project_system_scope() to authenticated;

alter table public.technology_systems enable row level security;
alter table public.system_category_links enable row level security;
alter table public.scope_questions enable row level security;
alter table public.scope_question_systems enable row level security;
alter table public.project_system_scope enable row level security;
alter table public.project_question_answers enable row level security;

drop policy if exists technology_systems_select on public.technology_systems;
create policy technology_systems_select on public.technology_systems
  for select to authenticated
  using (public.is_editor());

drop policy if exists system_category_links_select on public.system_category_links;
create policy system_category_links_select on public.system_category_links
  for select to authenticated
  using (public.is_editor());

drop policy if exists scope_questions_select on public.scope_questions;
create policy scope_questions_select on public.scope_questions
  for select to authenticated
  using (public.is_editor());

drop policy if exists scope_question_systems_select on public.scope_question_systems;
create policy scope_question_systems_select on public.scope_question_systems
  for select to authenticated
  using (public.is_editor());

drop policy if exists project_system_scope_select on public.project_system_scope;
create policy project_system_scope_select on public.project_system_scope
  for select to authenticated
  using (public.is_editor());

drop policy if exists project_system_scope_insert on public.project_system_scope;
create policy project_system_scope_insert on public.project_system_scope
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists project_system_scope_update on public.project_system_scope;
create policy project_system_scope_update on public.project_system_scope
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists project_question_answers_select on public.project_question_answers;
create policy project_question_answers_select on public.project_question_answers
  for select to authenticated
  using (public.is_editor());

drop policy if exists project_question_answers_insert on public.project_question_answers;
create policy project_question_answers_insert on public.project_question_answers
  for insert to authenticated
  with check (public.is_editor());

drop policy if exists project_question_answers_update on public.project_question_answers;
create policy project_question_answers_update on public.project_question_answers
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Reference rows are SQL-editor only. Scope and answers are editor write, no delete.
revoke all on table public.technology_systems from anon, authenticated;
revoke all on table public.system_category_links from anon, authenticated;
revoke all on table public.scope_questions from anon, authenticated;
revoke all on table public.scope_question_systems from anon, authenticated;
revoke all on table public.project_system_scope from anon, authenticated;
revoke all on table public.project_question_answers from anon, authenticated;

grant select on table public.technology_systems to authenticated;
grant select on table public.system_category_links to authenticated;
grant select on table public.scope_questions to authenticated;
grant select on table public.scope_question_systems to authenticated;
grant select, insert, update on table public.project_system_scope to authenticated;
grant select, insert, update on table public.project_question_answers to authenticated;

grant usage on type public.system_applies_to to authenticated;
grant usage on type public.question_answer_status to authenticated;

insert into public.technology_systems (key, name, description, sort_order, applies_to)
values
  (
    'general',
    'General',
    'Coordination, IT rooms, MEP load, and who orders services.',
    1,
    'project'
  ),
  (
    'carrier_riser',
    'Carrier & riser',
    'ISP, diverse routes, risers, and onsite carrier vendors.',
    2,
    'project'
  ),
  (
    'it_infrastructure',
    'IT infrastructure',
    'Copper, fiber, cabinets, pathways, and outlet standards.',
    3,
    'both'
  ),
  (
    'network_wifi',
    'Network / Wi-Fi',
    'Core, switching, firewalls, and wireless coverage.',
    4,
    'both'
  ),
  (
    'display_video',
    'Display / video',
    'Displays, video walls, signage, and program image.',
    5,
    'space'
  ),
  (
    'audio',
    'Audio',
    'Background music, paging, and speech reinforcement.',
    6,
    'space'
  ),
  (
    'conferencing',
    'Conferencing',
    'Room video, cameras, microphones, and meeting platforms.',
    7,
    'space'
  ),
  (
    'control',
    'Control',
    'Touch panels, scheduling, and lighting or shade tie-in.',
    8,
    'space'
  ),
  (
    'security',
    'Security',
    'Access control, video surveillance, and alarm monitoring.',
    9,
    'both'
  ),
  (
    'acoustics',
    'Acoustics',
    'Speech privacy, finishes, and the acoustical-engineer scope.',
    10,
    'space'
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  applies_to = excluded.applies_to;

-- Mapping is canonical. Re-running replaces links for these systems only.
delete from public.system_category_links
where system_key in (
  'general',
  'carrier_riser',
  'it_infrastructure',
  'network_wifi',
  'display_video',
  'audio',
  'conferencing',
  'control',
  'security',
  'acoustics'
);

insert into public.system_category_links (system_key, category_key)
values
  ('general', 'staff_systems'),
  ('general', 'telephony'),
  ('carrier_riser', 'telephony'),
  ('it_infrastructure', 'structured_cabling'),
  ('network_wifi', 'network_core'),
  ('network_wifi', 'wireless'),
  ('display_video', 'digital_signage'),
  ('display_video', 'iptv'),
  ('display_video', 'av_events'),
  ('audio', 'audio_bgm'),
  ('conferencing', 'av_events'),
  ('control', 'bms'),
  ('security', 'access_control'),
  ('security', 'cctv');

insert into public.scope_questions (key, bank, section_key, section_name, prompt, sort_order)
values
  (
    'general_network_peripherals',
    'kickoff',
    'general',
    'General',
    'The design intent defines the wireless access points. Does the team have the rest of the network and peripherals (firewall, switches, and similar equipment)? Can the client provide the models for CMPLX iT to review and carry into the design?',
    1
  ),
  (
    'general_on_prem_servers',
    'kickoff',
    'general',
    'General',
    'Does the client host local or on-prem servers that need to be accounted for in the IT room(s)?',
    2
  ),
  (
    'general_load_letter',
    'kickoff',
    'general',
    'General',
    'Will the design team need CMPLX iT to develop a load letter for the MEP designer, covering cooling and power for the IDF rooms?',
    3
  ),
  (
    'general_client_procurement',
    'kickoff',
    'general',
    'General',
    'Will the client handle ordering internet service, phone (VoIP or analog), software licenses, and similar items?',
    4
  ),
  (
    'carrier_requirements',
    'kickoff',
    'carrier_riser',
    'Carrier service & riser',
    'Does the client have ISP or carrier requirements that should be accounted for, such as diverse routes or separate risers for redundancy?',
    5
  ),
  (
    'carrier_vendor_management',
    'kickoff',
    'carrier_riser',
    'Carrier service & riser',
    'Is onsite vendor management required for the carrier installation?',
    6
  ),
  (
    'carrier_count',
    'kickoff',
    'carrier_riser',
    'Carrier service & riser',
    'How many carriers does the client intend to use, and will the client order those circuits directly?',
    7
  ),
  (
    'it_manufacturers',
    'kickoff',
    'it_infrastructure',
    'IT infrastructure',
    'Does the client have a preferred manufacturer for copper, fiber, and cabinets, or a design standard CMPLX iT should follow? If a reference set names racks or cable, confirm whether that standard applies on this project.',
    8
  ),
  (
    'it_data_locations',
    'kickoff',
    'it_infrastructure',
    'IT infrastructure',
    'Will the client provide a markup of data locations and a wireless heatmap for access-point coverage?',
    9
  ),
  (
    'it_cable_count',
    'kickoff',
    'it_infrastructure',
    'IT infrastructure',
    'Unless noted otherwise, is the default two cables at each data location? Do access points get that same count?',
    10
  ),
  (
    'av_coordination',
    'kickoff',
    'audio_visual',
    'Audio visual',
    'Who designs the audio-visual system for this project, and how should CMPLX iT integrate that design into the technology model for coordination?',
    11
  ),
  (
    'security_access_doors',
    'kickoff',
    'access_control',
    'Access control',
    'Access control will follow the client''s specification. Will the client provide a markup of the required doors, or should CMPLX iT take a first pass from the reference drawing set?',
    12
  ),
  (
    'security_nvr_split',
    'kickoff',
    'video_surveillance',
    'Video surveillance',
    'Confirm the video-surveillance split: who provides cameras and cabling, and who provides the NVR? Will anyone need information from CMPLX iT to calculate NVR storage?',
    13
  ),
  (
    'security_alarm_sensors',
    'kickoff',
    'video_surveillance',
    'Video surveillance',
    'Where the camera or NVR platform also acts as the burglar alarm, does the system require other sensors, such as door position or glass break?',
    14
  ),
  (
    'security_alarm_monitoring',
    'kickoff',
    'video_surveillance',
    'Video surveillance',
    'Does the burglar alarm need to call out to emergency services or a third-party monitoring service?',
    15
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
  'general_network_peripherals',
  'general_on_prem_servers',
  'general_load_letter',
  'general_client_procurement',
  'carrier_requirements',
  'carrier_vendor_management',
  'carrier_count',
  'it_manufacturers',
  'it_data_locations',
  'it_cable_count',
  'av_coordination',
  'security_access_doors',
  'security_nvr_split',
  'security_alarm_sensors',
  'security_alarm_monitoring'
);

insert into public.scope_question_systems (question_key, system_key)
values
  ('general_network_peripherals', 'general'),
  ('general_network_peripherals', 'network_wifi'),
  ('general_on_prem_servers', 'general'),
  ('general_on_prem_servers', 'it_infrastructure'),
  ('general_load_letter', 'general'),
  ('general_load_letter', 'it_infrastructure'),
  ('general_client_procurement', 'general'),
  ('general_client_procurement', 'carrier_riser'),
  ('carrier_requirements', 'carrier_riser'),
  ('carrier_vendor_management', 'carrier_riser'),
  ('carrier_count', 'carrier_riser'),
  ('it_manufacturers', 'it_infrastructure'),
  ('it_data_locations', 'it_infrastructure'),
  ('it_data_locations', 'network_wifi'),
  ('it_cable_count', 'it_infrastructure'),
  ('it_cable_count', 'network_wifi'),
  ('av_coordination', 'display_video'),
  ('av_coordination', 'audio'),
  ('av_coordination', 'conferencing'),
  ('av_coordination', 'control'),
  ('security_access_doors', 'security'),
  ('security_nvr_split', 'security'),
  ('security_alarm_sensors', 'security'),
  ('security_alarm_monitoring', 'security');

-- One row per existing project and system. Does not reset a flag an editor already set.
insert into public.project_system_scope (project_id, system_key, in_scope)
select
  p.id,
  s.key,
  case
    when p.id = '11111111-1111-4111-8111-111111111111'::uuid
      and s.key in (
        'general',
        'carrier_riser',
        'it_infrastructure',
        'network_wifi',
        'display_video',
        'audio',
        'conferencing',
        'control',
        'security'
      ) then true
    when p.id = '22222222-2222-4222-8222-222222222222'::uuid
      and s.key in (
        'it_infrastructure',
        'network_wifi',
        'display_video',
        'security'
      ) then true
    else false
  end
from public.projects p
cross join public.technology_systems s
on conflict (project_id, system_key) do nothing;

-- DEMO answers for the optional 003 clubhouse. Not live client data.
insert into public.project_question_answers (
  id, project_id, question_key, body, status, created_at, updated_at
)
select
  v.id,
  v.project_id,
  v.question_key,
  v.body,
  v.status::public.question_answer_status,
  v.stamp,
  v.stamp
from (
  values
    (
      'f1111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'general_network_peripherals',
      'DEMO — Service-corridor IDF holds the firewall and switches. Models follow the wireless heat map.',
      'answered',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'f1111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'general_on_prem_servers',
      'DEMO — No on-prem servers. The property system stays in the cloud.',
      'answered',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'f1111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'it_cable_count',
      'DEMO — Two cables at each data outlet. Access points get two as well.',
      'locked',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'f1111111-1111-4111-8111-111111111104'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'av_coordination',
      'DEMO — Events AV in the dock-side room is in this package: one image and speech. CMPLX iT owns the technology model.',
      'answered',
      '2026-06-02T16:30:00.000Z'::timestamptz
    ),
    (
      'f1111111-1111-4111-8111-111111111105'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'security_nvr_split',
      'DEMO — Still confirming who provides the recorder.',
      'open',
      '2026-06-02T16:30:00.000Z'::timestamptz
    )
) as v(id, project_id, question_key, body, status, stamp)
where exists (
  select 1
  from public.projects p
  where p.id = v.project_id
    and p.deleted_at is null
)
on conflict (project_id, question_key) do nothing;

-- CMPLX iT Design — schema (v1)
-- UUID PKs, snake_case, ENUMs, soft delete via deleted_at.

create extension if not exists pgcrypto;

create type public.project_status as enum (
  'pending',
  'on_track',
  'at_risk',
  'behind'
);

create type public.brief_status as enum (
  'draft',
  'active',
  'in_review',
  'approved'
);

-- Editor allowlist. Auth users must match an email here.
create table public.editors (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text not null,
  status public.project_status not null default 'pending',
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.status_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- One design brief per project (MVP).
create table public.design_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  owner text not null,
  status public.brief_status not null default 'draft',
  start_date date,
  target_date date,
  design_intent text not null default '',
  constraints text not null default '',
  open_decisions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Standard-15 hospitality-tech categories (constant in code + rows here).
create table public.technology_categories (
  key text primary key,
  name text not null,
  sort_order integer not null unique
);

create table public.brief_scope_items (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.design_briefs (id) on delete cascade,
  category_key text not null references public.technology_categories (key),
  category_name text not null,
  sort_order integer not null,
  in_scope boolean not null default false,
  note text not null default '',
  unique (brief_id, category_key)
);

create index projects_deleted_at_idx on public.projects (deleted_at);
create index projects_status_idx on public.projects (status);
create index projects_updated_at_idx on public.projects (updated_at desc);
create index status_updates_project_created_idx
  on public.status_updates (project_id, created_at desc);
create index design_briefs_project_id_idx on public.design_briefs (project_id);
create index brief_scope_items_brief_sort_idx
  on public.brief_scope_items (brief_id, sort_order);

insert into public.technology_categories (key, name, sort_order) values
  ('structured_cabling', 'Structured cabling & backbone', 1),
  ('network_core', 'Network core & switching', 2),
  ('wireless', 'Wireless (guest & staff)', 3),
  ('pms', 'Property management system (PMS)', 4),
  ('pos', 'Point of sale (POS)', 5),
  ('access_control', 'Access control & locks', 6),
  ('cctv', 'CCTV & security', 7),
  ('iptv', 'IPTV / in-room entertainment', 8),
  ('av_events', 'AV (events & meeting rooms)', 9),
  ('audio_bgm', 'Audio / BGM / paging', 10),
  ('telephony', 'Telephony / VoIP', 11),
  ('digital_signage', 'Digital signage', 12),
  ('bms', 'Building systems (BMS / lighting)', 13),
  ('guest_app', 'Guest app / digital concierge', 14),
  ('staff_systems', 'Staff comms & back-of-house systems', 15);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger design_briefs_set_updated_at
before update on public.design_briefs
for each row execute function public.set_updated_at();

-- Seed the standard-15 checklist when a brief is created.
create or replace function public.seed_brief_scope_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.brief_scope_items (
    brief_id, category_key, category_name, sort_order
  )
  select new.id, c.key, c.name, c.sort_order
  from public.technology_categories c
  order by c.sort_order
  on conflict (brief_id, category_key) do nothing;
  return new;
end;
$$;

create trigger design_briefs_seed_scope
after insert on public.design_briefs
for each row execute function public.seed_brief_scope_items();

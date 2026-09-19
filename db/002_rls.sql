-- CMPLX iT Design — RLS (v1)
-- Editors only. No partners, viewers, or share-link roles.

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.editors e
    where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

alter table public.editors enable row level security;
alter table public.projects enable row level security;
alter table public.status_updates enable row level security;
alter table public.design_briefs enable row level security;
alter table public.brief_scope_items enable row level security;
alter table public.technology_categories enable row level security;

-- Allowlist is read by editors; mutations happen in the SQL editor / service role.
create policy editors_select on public.editors
  for select to authenticated
  using (public.is_editor());

create policy projects_select on public.projects
  for select to authenticated
  using (public.is_editor());

create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_editor());

create policy projects_update on public.projects
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy status_updates_select on public.status_updates
  for select to authenticated
  using (public.is_editor());

create policy status_updates_insert on public.status_updates
  for insert to authenticated
  with check (public.is_editor());

create policy design_briefs_select on public.design_briefs
  for select to authenticated
  using (public.is_editor());

create policy design_briefs_insert on public.design_briefs
  for insert to authenticated
  with check (public.is_editor());

create policy design_briefs_update on public.design_briefs
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy brief_scope_items_select on public.brief_scope_items
  for select to authenticated
  using (public.is_editor());

create policy brief_scope_items_insert on public.brief_scope_items
  for insert to authenticated
  with check (public.is_editor());

create policy brief_scope_items_update on public.brief_scope_items
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy technology_categories_select on public.technology_categories
  for select to authenticated
  using (public.is_editor());

grant usage on schema public to authenticated;
grant select on public.editors to authenticated;
grant select on public.technology_categories to authenticated;
grant select, insert, update on public.projects to authenticated;
grant select, insert on public.status_updates to authenticated;
grant select, insert, update on public.design_briefs to authenticated;
grant select, insert, update on public.brief_scope_items to authenticated;

-- Signed-out visitors hit the landing gate only; no table access.
revoke all on all tables in schema public from anon;
revoke execute on function public.is_editor() from anon;

-- RLS and policy layer

-- Helper functions
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  );
$$;

create or replace function public.is_tree_member(target_tree_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tree_memberships tm
    join public.profiles p on p.id = tm.user_id
    where tm.tree_id = target_tree_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and p.status = 'approved'
  );
$$;

create or replace function public.has_tree_role(target_tree_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tree_memberships tm
    join public.profiles p on p.id = tm.user_id
    where tm.tree_id = target_tree_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and p.status = 'approved'
      and tm.role = any(allowed_roles)
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_tree_member(uuid) to authenticated;
grant execute on function public.has_tree_role(uuid, public.membership_role[]) to authenticated;

-- Enable RLS on sensitive tables
alter table public.profiles enable row level security;
alter table public.family_trees enable row level security;
alter table public.tree_memberships enable row level security;
alter table public.persons enable row level security;
alter table public.unions enable row level security;
alter table public.parent_child_relationships enable row level security;
alter table public.person_events enable row level security;
alter table public.person_media enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.family_assets enable row level security;
alter table public.asset_ownership_events enable row level security;
alter table public.health_conditions enable row level security;
alter table public.dna_connections enable row level security;
alter table public.family_stories enable row level security;
alter table public.export_jobs enable row level security;

-- profiles policies
create policy "profiles_self_read" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_self_update" on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "profiles_admin_insert" on public.profiles
for insert to authenticated
with check (public.is_admin() or id = auth.uid());

-- only admins can set approval status for others
create policy "profiles_admin_approve" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- family_trees
create policy "trees_member_read" on public.family_trees
for select to authenticated
using (public.is_tree_member(id) or public.is_admin());

create policy "trees_approved_create" on public.family_trees
for insert to authenticated
with check (public.is_approved() and owner_id = auth.uid());

create policy "trees_owner_editor_update" on public.family_trees
for update to authenticated
using (public.has_tree_role(id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(id, array['owner','editor']::public.membership_role[]) or public.is_admin());

create policy "trees_owner_delete" on public.family_trees
for delete to authenticated
using (public.has_tree_role(id, array['owner']::public.membership_role[]) or public.is_admin());

-- memberships
create policy "memberships_read_for_members" on public.tree_memberships
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());

create policy "memberships_manage_owner_editor" on public.tree_memberships
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

-- persons
create policy "persons_read_for_members" on public.persons
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());

create policy "persons_insert_editors_contributors" on public.persons
for insert to authenticated
with check (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin());

create policy "persons_update_owner_editor" on public.persons
for update to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

create policy "persons_delete_owner_editor" on public.persons
for delete to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

-- unions
create policy "unions_read_for_members" on public.unions
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "unions_write_owner_editor" on public.unions
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

-- parent_child_relationships
create policy "parent_child_read_for_members" on public.parent_child_relationships
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "parent_child_write_owner_editor" on public.parent_child_relationships
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

-- person_events
create policy "person_events_read_for_members" on public.person_events
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "person_events_write_owner_editor_contrib" on public.person_events
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin());

-- person_media
create policy "person_media_read_for_members" on public.person_media
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "person_media_write_owner_editor_contrib" on public.person_media
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin());

-- invitations
create policy "invitations_read_owner_editor" on public.invitations
for select to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());
create policy "invitations_write_owner_editor" on public.invitations
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

-- audit logs: no public read, insert via service_role only; read by owner/admin
create policy "audit_logs_read_owner_admin" on public.audit_logs
for select to authenticated
using (
  public.is_admin()
  or (
    tree_id is not null
    and public.has_tree_role(tree_id, array['owner']::public.membership_role[])
  )
);

-- coming soon tables
create policy "family_assets_read_members" on public.family_assets
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "family_assets_write_owner_editor" on public.family_assets
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

create policy "asset_events_read_members" on public.asset_ownership_events
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "asset_events_write_owner_editor" on public.asset_ownership_events
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

create policy "health_conditions_read_members" on public.health_conditions
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "health_conditions_write_owner_editor" on public.health_conditions
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

create policy "dna_connections_read_members" on public.dna_connections
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "dna_connections_write_owner_editor" on public.dna_connections
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

create policy "family_stories_read_members" on public.family_stories
for select to authenticated
using (public.is_tree_member(tree_id) or public.is_admin());
create policy "family_stories_write_owner_editor_contrib" on public.family_stories
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor','contributor']::public.membership_role[]) or public.is_admin());

create policy "export_jobs_read_owner_admin" on public.export_jobs
for select to authenticated
using (public.has_tree_role(tree_id, array['owner']::public.membership_role[]) or public.is_admin());
create policy "export_jobs_write_owner_editor" on public.export_jobs
for all to authenticated
using (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin())
with check (public.has_tree_role(tree_id, array['owner','editor']::public.membership_role[]) or public.is_admin());

-- audit log insert strictly by service role (no authenticated policy on insert)
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert on public.audit_logs from authenticated;

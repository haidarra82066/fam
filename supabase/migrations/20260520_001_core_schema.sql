-- Core schema for fam MVP
create extension if not exists pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tree_visibility AS ENUM ('private', 'invited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_role AS ENUM ('owner', 'editor', 'contributor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('active', 'invited', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.living_status AS ENUM ('living', 'deceased', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.union_type AS ENUM ('married', 'partnered', 'divorced', 'separated', 'ex_partner', 'co_parent', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.parent_role AS ENUM ('biological', 'adoptive', 'step', 'foster', 'guardian', 'donor', 'surrogate', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.confidence_level AS ENUM ('confirmed', 'likely', 'uncertain', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invitation_role AS ENUM ('viewer', 'contributor', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  status public.profile_status not null default 'pending',
  role public.app_role not null default 'user',
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lower check (email is null or email = lower(email))
);

create table if not exists public.family_trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  visibility public.tree_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tree_memberships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tree_id, user_id)
);

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  display_name text not null,
  given_names text,
  middle_names text,
  surname_now text,
  surname_at_birth text,
  nickname text,
  title text,
  suffix text,
  gender text,
  living_status public.living_status not null default 'unknown',
  birth_date text,
  birth_place text,
  death_date text,
  death_place text,
  cause_of_death text,
  burial_date text,
  burial_place text,
  profession text,
  company text,
  education text,
  short_bio text,
  notes text,
  color_label text,
  photo_path text,
  is_private boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  partner1_id uuid not null references public.persons(id) on delete cascade,
  partner2_id uuid references public.persons(id) on delete set null,
  union_type public.union_type not null default 'unknown',
  start_date text,
  start_place text,
  end_date text,
  end_place text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_child_relationships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  parent_id uuid not null references public.persons(id) on delete cascade,
  child_id uuid not null references public.persons(id) on delete cascade,
  union_id uuid references public.unions(id) on delete set null,
  parent_role public.parent_role not null default 'unknown',
  label text,
  confidence public.confidence_level not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_child_not_same check (parent_id <> child_id)
);

create table if not exists public.person_events (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete cascade,
  event_type text not null,
  date text,
  place text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_media (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  person_id uuid references public.persons(id) on delete set null,
  storage_path text not null,
  media_type text,
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  invited_email text not null,
  role public.invitation_role not null,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid references public.family_trees(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Placeholder tables
create table if not exists public.family_assets (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.asset_ownership_events (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  asset_id uuid references public.family_assets(id) on delete cascade,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.health_conditions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  person_id uuid references public.persons(id) on delete cascade,
  condition_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.dna_connections (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  person1_id uuid references public.persons(id) on delete cascade,
  person2_id uuid references public.persons(id) on delete cascade,
  relationship_hint text,
  created_at timestamptz not null default now()
);
create table if not exists public.family_stories (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees(id) on delete cascade,
  status text not null default 'queued',
  output_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_family_trees_updated_at BEFORE UPDATE ON public.family_trees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_tree_memberships_updated_at BEFORE UPDATE ON public.tree_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_unions_updated_at BEFORE UPDATE ON public.unions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_parent_child_updated_at BEFORE UPDATE ON public.parent_child_relationships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_person_events_updated_at BEFORE UPDATE ON public.person_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_person_media_updated_at BEFORE UPDATE ON public.person_media FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_family_assets_updated_at BEFORE UPDATE ON public.family_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_family_stories_updated_at BEFORE UPDATE ON public.family_stories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER set_export_jobs_updated_at BEFORE UPDATE ON public.export_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_family_trees_owner on public.family_trees(owner_id);
create index if not exists idx_tree_memberships_tree_user on public.tree_memberships(tree_id, user_id);
create index if not exists idx_persons_tree on public.persons(tree_id);
create index if not exists idx_unions_tree on public.unions(tree_id);
create index if not exists idx_parent_child_tree on public.parent_child_relationships(tree_id);
create index if not exists idx_person_events_tree on public.person_events(tree_id);
create index if not exists idx_person_media_tree on public.person_media(tree_id);
create index if not exists idx_invitations_tree on public.invitations(tree_id);
create index if not exists idx_audit_logs_tree on public.audit_logs(tree_id);

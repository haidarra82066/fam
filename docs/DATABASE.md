# Database Schema (Supabase Postgres)

This document describes the family tree MVP relational model and RLS authorization design.

## Overview

The schema is split into:
- **Identity & access**: `profiles`, `tree_memberships`, `invitations`
- **Core tree domain**: `family_trees`, `persons`, `unions`, `parent_child_relationships`
- **Timeline/media**: `person_events`, `person_media`
- **Governance**: `audit_logs`
- **Coming-soon placeholders**: `family_assets`, `asset_ownership_events`, `health_conditions`, `dna_connections`, `family_stories`, `export_jobs`

## Enums

- `profile_status`: `pending`, `approved`, `rejected`, `suspended`
- `app_role`: `user`, `admin`
- `tree_visibility`: `private`, `invited`
- `membership_role`: `owner`, `editor`, `contributor`, `viewer`
- `membership_status`: `active`, `invited`, `removed`
- `living_status`: `living`, `deceased`, `unknown`
- `union_type`: `married`, `partnered`, `divorced`, `separated`, `ex_partner`, `co_parent`, `unknown`
- `parent_role`: `biological`, `adoptive`, `step`, `foster`, `guardian`, `donor`, `surrogate`, `unknown`
- `confidence_level`: `confirmed`, `likely`, `uncertain`, `unknown`
- `invitation_role`: `viewer`, `contributor`, `editor`

## Core relationships

- `profiles.id` references `auth.users.id`.
- `family_trees.owner_id` references `profiles.id`.
- `tree_memberships` joins users to trees with role + membership status.
- `persons` belong to one tree.
- `unions` belong to one tree and reference one or two persons.
- `parent_child_relationships` belong to one tree and reference parent/child person rows and optional union.
- `person_events` and `person_media` belong to one tree and one person (`person_media.person_id` nullable).
- `invitations` belong to one tree and support invited role mapping.
- `audit_logs` can be global or tree-scoped.

## RLS model

RLS is enabled on all sensitive tables.

### Helper functions

- `is_admin()` → true when current user profile is approved admin.
- `is_approved()` → true when current user profile status is approved.
- `is_tree_member(tree_id)` → true when current user has active membership for tree and approved profile.
- `has_tree_role(tree_id, roles[])` → true when current user has active membership role in role list.

### Policy intent

- **Pending users** can only read/update their own profile.
- **Approved users** can create trees they own.
- **Tree members** can read tree-scoped records.
- **Owners/editors** can update/delete major tree structures.
- **Contributors** can create limited records (`persons`, `person_events`, `person_media`, `family_stories`) but not full structural edits.
- **Viewers** are read-only.
- **Admins** can read across all and manage profile approvals.
- **Audit logs** are readable by owners/admins; inserts are intended for service-role/server actions.

## Migration files

- `supabase/migrations/20260520_001_core_schema.sql`
- `supabase/migrations/20260520_002_rls_policies.sql`

## Notes

- Migrations are written to be idempotent where practical (`if not exists`, guarded enum creation, guarded triggers).
- `updated_at` is maintained by a shared `set_updated_at()` trigger function.
- Date fields are currently text for MVP flexibility; can be normalized later as partial/date precision types.

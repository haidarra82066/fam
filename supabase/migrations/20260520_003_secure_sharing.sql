-- Secure sharing and invitation lifecycle

alter table public.invitations
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null,
  add column if not exists accepted_by uuid references public.profiles(id) on delete set null;

create unique index if not exists invitations_token_hash_active_idx
  on public.invitations(token_hash)
  where accepted_at is null and revoked_at is null;

create or replace function public.accept_invitation(raw_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
  v_user uuid := auth.uid();
  v_status public.profile_status;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select status into v_status from public.profiles where id = v_user;

  select * into v_inv
  from public.invitations i
  where i.token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    and i.accepted_at is null
    and i.revoked_at is null
  order by i.created_at desc
  limit 1;

  if not found then raise exception 'invalid invitation'; end if;
  if v_inv.expires_at < now() then raise exception 'invitation expired'; end if;

  insert into public.tree_memberships(tree_id, user_id, role, status)
  values(v_inv.tree_id, v_user, v_inv.role::public.membership_role, 'active')
  on conflict (tree_id, user_id)
  do update set role = excluded.role, status = 'active', updated_at = now();

  update public.invitations
  set accepted_at = now(), accepted_by = v_user
  where id = v_inv.id;

  insert into public.audit_logs(tree_id, actor_id, action, entity_type, entity_id, metadata)
  values(v_inv.tree_id, v_user, 'invitation_accepted', 'invitation', v_inv.id, jsonb_build_object('email', v_inv.invited_email, 'approved', coalesce(v_status='approved', false)));

  return v_inv.tree_id;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;

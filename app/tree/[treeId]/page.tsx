import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';
import { FamilyTreeCanvas } from '@/components/tree/family-tree-canvas';
import { ShareModal } from '@/components/tree/share-modal';

async function assertMember(treeId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('tree_memberships').select('id, role').eq('tree_id', treeId).eq('user_id', userId).maybeSingle();
  if (!data) notFound();
  return { supabase, membership: data };
}

async function createInvitation(formData: FormData) { 'use server';
  const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
  const treeId = String(formData.get('tree_id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'viewer');
  const expiresDays = Math.max(1, Number(formData.get('expires_days') ?? 7));
  if (!email || !['viewer','contributor','editor'].includes(role)) redirect(`/tree/${treeId}?error=invalid_invite`);
  const { supabase } = await assertMember(treeId, user.id);
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();
  const { data: invite, error } = await supabase.from('invitations').insert({ tree_id: treeId, invited_email: email, role, token_hash: tokenHash, expires_at: expiresAt, created_by: user.id }).select('id').single();
  if (error || !invite) redirect(`/tree/${treeId}?error=invite_failed`);
  await supabase.from('audit_logs').insert({ tree_id: treeId, actor_id: user.id, action: 'invitation_created', entity_type: 'invitation', entity_id: invite.id, metadata: { email, role, expires_at: expiresAt } });
  revalidatePath(`/tree/${treeId}`);
  redirect(`/tree/${treeId}?invite=${encodeURIComponent(token)}`);
}

export default async function TreePage({ params, searchParams }: { params: Promise<{ treeId: string }>, searchParams: Promise<{ invite?: string }> }) {
  const { treeId } = await params; const sp = await searchParams;
  const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
  const { supabase, membership } = await assertMember(treeId, user.id);
  const { data: tree } = await supabase.from('family_trees').select('id, name, description, updated_at').eq('id', treeId).maybeSingle(); if (!tree) notFound();
  const [{ data: persons }, { data: unions }, { data: relationships }] = await Promise.all([
    supabase.from('persons').select('*').eq('tree_id', treeId),
    supabase.from('unions').select('*').eq('tree_id', treeId),
    supabase.from('parent_child_relationships').select('*').eq('tree_id', treeId),
  ]);
  const canManageMembers = ['owner', 'editor'].includes(membership.role);
  return <SiteShell><div className='space-y-4'>
    <h1 className='text-3xl font-semibold tracking-tight'>{tree.name}</h1>
    <Card className='p-4 text-sm text-muted'>{tree.description || 'No description yet.'}</Card>
    <div className='flex gap-2'>
      <a href={`/tree/${treeId}/members`}><Button variant='outline'>Membership</Button></a>
      {canManageMembers ? <ShareModal treeId={treeId} action={createInvitation} latestInviteToken={sp.invite} /> : null}
    </div>
    <FamilyTreeCanvas persons={persons ?? []} unions={unions ?? []} parentChild={relationships ?? []} treeId={treeId} />
  </div></SiteShell>;
}

import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { parseForm, requireUser, writeAuditLog, z } from '@/lib/security';
import { FamilyTreeCanvas } from '@/components/tree/family-tree-canvas';
import { ShareModal } from '@/components/tree/share-modal';


const inviteSchema = z.object({ tree_id: z.string().uuid(), email: z.string().email().max(320), role: z.enum(['viewer','contributor','editor']), expires_days: z.coerce.number().int().min(1).max(30).default(7) });

async function assertMember(treeId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('tree_memberships').select('id, role').eq('tree_id', treeId).eq('user_id', userId).maybeSingle();
  if (!data) notFound();
  return { supabase, membership: data };
}

async function createInvitation(formData: FormData) { 'use server';
  const { user } = await requireUser();
  const { tree_id: treeId, email, role, expires_days: expiresDays } = parseForm(inviteSchema, formData);
  const { supabase } = await assertMember(treeId, user.id);
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();
  const { data: invite, error } = await supabase.from('invitations').insert({ tree_id: treeId, invited_email: email, role, token_hash: tokenHash, expires_at: expiresAt, created_by: user.id }).select('id').single();
  if (error || !invite) redirect(`/tree/${treeId}?error=invite_failed`);
  await writeAuditLog({ treeId, actorId: user.id, action: 'invitation_created', entityType: 'invitation', entityId: invite.id, metadata: { email, role, expires_at: expiresAt } });
  revalidatePath(`/tree/${treeId}`);
  redirect(`/tree/${treeId}?invite=${encodeURIComponent(token)}`);
}

export default async function TreePage({ params, searchParams }: { params: Promise<{ treeId: string }>, searchParams: Promise<{ invite?: string }> }) {
  const { treeId } = await params; const sp = await searchParams;
  const { user } = await requireUser();
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

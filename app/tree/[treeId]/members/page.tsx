import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState, SectionHeader, StatusChip, Surface } from '@/components/ui/studio';
import { createClient } from '@/lib/supabase/server';
import { parseForm, requireUser, writeAuditLog, z } from '@/lib/security';
import { cn } from '@/lib/utils';
import { ArrowLeft, ShieldCheck, UserRoundCheck, Users } from 'lucide-react';

const updateRoleSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum(['viewer', 'contributor', 'editor']),
  tree_id: z.string().uuid(),
});
const revokeMemberSchema = z.object({ membership_id: z.string().uuid(), tree_id: z.string().uuid() });

async function updateRole(formData: FormData) {
  'use server';

  const { user } = await requireUser();
  const supabase = await createClient();
  const { membership_id: id, role, tree_id: treeId } = parseForm(updateRoleSchema, formData);
  const { data: me } = await supabase
    .from('tree_memberships')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!me || !['owner', 'editor'].includes(me.role)) redirect(`/tree/${treeId}?error=not_authorized`);

  await supabase.from('tree_memberships').update({ role }).eq('id', id);
  await writeAuditLog({ treeId, actorId: user.id, action: 'role_changed', entityType: 'tree_membership', entityId: id, metadata: { role } });
  revalidatePath(`/tree/${treeId}/members`);
}

async function revokeMember(formData: FormData) {
  'use server';

  const { user } = await requireUser();
  const supabase = await createClient();
  const { membership_id: id, tree_id: treeId } = parseForm(revokeMemberSchema, formData);
  const { data: me } = await supabase
    .from('tree_memberships')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!me || !['owner', 'editor'].includes(me.role)) redirect(`/tree/${treeId}?error=not_authorized`);

  await supabase.from('tree_memberships').update({ status: 'removed' }).eq('id', id);
  await writeAuditLog({ treeId, actorId: user.id, action: 'member_removed', entityType: 'tree_membership', entityId: id, metadata: {} });
  revalidatePath(`/tree/${treeId}/members`);
}

export default async function MembersPage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();
  const { data: me } = await supabase
    .from('tree_memberships')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!me) notFound();

  const { data: members } = await supabase
    .from('tree_memberships')
    .select('id, role, status, user_id, profiles(email, status)')
    .eq('tree_id', treeId)
    .order('created_at');

  return (
    <SiteShell>
      <div className="space-y-6">
        <Surface variant="hero" className="p-5 sm:p-6">
          <SectionHeader
            icon={Users}
            title="Members"
            description="Review access and adjust roles for this family tree."
            action={(
              <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} href={`/tree/${treeId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to tree
              </Link>
            )}
          />
        </Surface>
        {!members?.length ? (
          <EmptyState icon={Users} title="No members found" description="Invite relatives from the tree workspace when you are ready to collaborate." />
        ) : (
          <div className="space-y-3">
            {members.map((member: any) => (
              <Surface key={member.id} className="overflow-hidden border-[#d4e2df] bg-white p-0">
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#e7f1ef] text-accent">
                      {member.profiles?.status === 'approved' ? <UserRoundCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{member.profiles?.email}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium capitalize">
                        <StatusChip tone="accent" className="capitalize">{member.role}</StatusChip>
                        <StatusChip tone={member.status === 'active' ? 'success' : 'neutral'} className="capitalize">{member.status}</StatusChip>
                      </div>
                      {member.profiles?.status !== 'approved' ? <p className="mt-2 text-xs font-medium text-amber-700">Pending account approval</p> : null}
                    </div>
                  </div>
                  {['owner', 'editor'].includes(me.role) && member.role !== 'owner' ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <form action={updateRole} className="flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="membership_id" value={member.id} />
                        <input type="hidden" name="tree_id" value={treeId} />
                        <select name="role" defaultValue={member.role} className="studio-field sm:w-auto">
                          <option>viewer</option>
                          <option>contributor</option>
                          <option>editor</option>
                        </select>
                        <Button variant="outline" className="w-full sm:w-auto">Change</Button>
                      </form>
                      <form action={revokeMember}>
                        <input type="hidden" name="membership_id" value={member.id} />
                        <input type="hidden" name="tree_id" value={treeId} />
                        <Button variant="outline" className="w-full sm:w-auto">Revoke</Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </Surface>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

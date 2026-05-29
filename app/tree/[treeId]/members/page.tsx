import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { parseForm, requireUser, writeAuditLog, z } from '@/lib/security';

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
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Members</h1>
          <p className="mt-1 text-sm text-muted">Review access and adjust roles for this family tree.</p>
        </div>
        {!members?.length ? (
          <Card className="p-6 text-sm text-muted">No members found.</Card>
        ) : (
          <div className="space-y-3">
            {members.map((member: any) => (
              <Card key={member.id} className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">{member.profiles?.email}</p>
                    <p className="mt-1 text-sm capitalize text-muted">{member.role} / {member.status}</p>
                    {member.profiles?.status !== 'approved' ? <p className="mt-1 text-xs font-medium text-amber-700">Pending approval</p> : null}
                  </div>
                  {['owner', 'editor'].includes(me.role) && member.role !== 'owner' ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <form action={updateRole} className="flex gap-2">
                        <input type="hidden" name="membership_id" value={member.id} />
                        <input type="hidden" name="tree_id" value={treeId} />
                        <select name="role" defaultValue={member.role} className="min-h-10 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent">
                          <option>viewer</option>
                          <option>contributor</option>
                          <option>editor</option>
                        </select>
                        <Button variant="outline">Change</Button>
                      </form>
                      <form action={revokeMember}>
                        <input type="hidden" name="membership_id" value={member.id} />
                        <input type="hidden" name="tree_id" value={treeId} />
                        <Button variant="outline">Revoke</Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

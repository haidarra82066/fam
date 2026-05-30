import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
        <section className="rounded-xl border border-[#cddbd8] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Users className="h-4 w-4" />
                Access control
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Members</h1>
              <p className="mt-1 text-sm leading-6 text-muted">Review access and adjust roles for this family tree.</p>
            </div>
            <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} href={`/tree/${treeId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to tree
            </Link>
          </div>
        </section>
        {!members?.length ? (
          <Card className="grid min-h-48 place-items-center border-dashed border-[#b9ccc9] bg-[#f8fbfa] p-6 text-center text-sm text-muted">No members found.</Card>
        ) : (
          <div className="space-y-3">
            {members.map((member: any) => (
              <Card key={member.id} className="overflow-hidden border-[#d4e2df] bg-white p-0">
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#e7f1ef] text-accent">
                      {member.profiles?.status === 'approved' ? <UserRoundCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{member.profiles?.email}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium capitalize">
                        <span className="rounded-md bg-[#eef7f5] px-2 py-1 text-accent">{member.role}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{member.status}</span>
                      </div>
                      {member.profiles?.status !== 'approved' ? <p className="mt-2 text-xs font-medium text-amber-700">Pending account approval</p> : null}
                    </div>
                  </div>
                  {['owner', 'editor'].includes(me.role) && member.role !== 'owner' ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <form action={updateRole} className="flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="membership_id" value={member.id} />
                        <input type="hidden" name="tree_id" value={treeId} />
                        <select name="role" defaultValue={member.role} className="min-h-11 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent">
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

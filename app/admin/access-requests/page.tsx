import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { EmptyState, SectionHeader, StatusChip, Surface } from '@/components/ui/studio';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAuthRouteRateLimit, parseForm, requireAdmin, z } from '@/lib/security';
import { ShieldCheck, UserCheck, UserX, UsersRound } from 'lucide-react';

const accessRequestSchema = z.object({ userId: z.string().uuid(), decision: z.enum(['approved', 'rejected']) });

async function updateAccessRequest(formData: FormData) {
  'use server';

  const admin = await requireAdmin();
  await enforceAuthRouteRateLimit('admin_access_requests');
  const { userId, decision } = parseForm(accessRequestSchema, formData);
  const supabase = createAdminClient();
  const updatePayload =
    decision === 'approved'
      ? { status: 'approved', approved_at: new Date().toISOString(), approved_by: admin.id }
      : { status: 'rejected', approved_at: null, approved_by: null };
  const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);

  if (error) throw new Error('update_failed');

  const { error: auditError } = await supabase.from('audit_logs').insert({
    actor_id: admin.id,
    action: `access_${decision}`,
    entity_type: 'profile',
    entity_id: userId,
    metadata: { source: 'admin_access_requests' },
  });

  if (auditError) throw new Error('audit_log_failed');

  revalidatePath('/admin/access-requests');
}

export default async function AccessRequestsPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: pendingUsers, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error('access_requests_fetch_failed');

  return (
    <SiteShell>
      <div className="space-y-6">
        <Surface variant="hero" className="p-5 sm:p-6">
          <SectionHeader
            icon={ShieldCheck}
            title="Access requests"
            description="Approve or reject new accounts before they can open private trees."
            action={<StatusChip tone="warning">{pendingUsers?.length ?? 0} pending</StatusChip>}
          />
        </Surface>
        {!pendingUsers?.length ? (
          <EmptyState
            icon={UsersRound}
            title="No pending requests"
            description="New signup requests will appear here for review before they can enter the private workspace."
          />
        ) : (
          <Surface className="overflow-hidden p-0">
            <div className="divide-y divide-border">
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">{pendingUser.full_name || 'No name provided'}</p>
                    <p className="truncate text-sm text-muted">{pendingUser.email}</p>
                    <p className="mt-1 text-xs text-muted">Signed up: {new Date(pendingUser.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <form action={updateAccessRequest}>
                      <input type="hidden" name="userId" value={pendingUser.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <Button className="w-full sm:w-auto"><UserCheck className="h-4 w-4" /> Approve</Button>
                    </form>
                    <form action={updateAccessRequest}>
                      <input type="hidden" name="userId" value={pendingUser.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button className="w-full sm:w-auto" variant="outline"><UserX className="h-4 w-4" /> Reject</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        )}
      </div>
    </SiteShell>
  );
}

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile, isAdminEmail } from '@/lib/auth';

async function updateAccessRequest(formData: FormData) {
  'use server';
  const userId = String(formData.get('userId'));
  const decision = String(formData.get('decision')) as 'approved' | 'rejected';

  const { user } = await getCurrentUserWithProfile();
  if (!isAdminEmail(user?.email)) redirect('/dashboard');

  const supabase = await createClient();
  const updatePayload = decision === 'approved'
    ? { status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id }
    : { status: 'rejected', approved_at: null, approved_by: null };

  const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
  if (error) redirect('/admin/access-requests?error=update_failed');

  await supabase.from('audit_logs').insert({
    action: `access_${decision}`,
    target_user_id: userId,
    performed_by: user?.id,
    metadata: { source: 'admin_access_requests' },
  });

  revalidatePath('/admin/access-requests');
}

export default async function AccessRequestsPage() {
  const { user } = await getCurrentUserWithProfile();
  if (!isAdminEmail(user?.email)) redirect('/dashboard');

  const supabase = await createClient();
  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Access requests</h1>
        <Card className="p-0">
          {!pendingUsers?.length ? (
            <p className="p-6 text-sm text-muted">No pending requests right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{pendingUser.full_name || 'No name provided'}</p>
                    <p className="text-sm text-muted">{pendingUser.email}</p>
                    <p className="text-xs text-muted">Signed up: {new Date(pendingUser.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <form action={updateAccessRequest}>
                      <input type="hidden" name="userId" value={pendingUser.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <Button>Approve</Button>
                    </form>
                    <form action={updateAccessRequest}>
                      <input type="hidden" name="userId" value={pendingUser.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button variant="outline">Reject</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SiteShell>
  );
}

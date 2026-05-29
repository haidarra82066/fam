import { redirect } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUserWithProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

async function acceptInvite(formData: FormData) { 'use server';
  const token = String(formData.get('token') ?? '');
  const { user, profile } = await getCurrentUserWithProfile();
  if (!user) redirect(`/login?next=/invite/${token}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_invitation', { raw_token: token });
  if (error || !data) redirect(`/invite/${token}?error=accept_failed`);
  if (profile?.status !== 'approved') redirect('/pending-approval');
  redirect(`/tree/${data}`);
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { user, profile } = await getCurrentUserWithProfile();
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100dvh-9rem)] w-full grid-cols-[minmax(0,1fr)] place-items-center">
        <Card className="w-[90vw] max-w-[90vw] space-y-4 p-6 sm:w-full sm:max-w-xl">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Family tree invitation</h1>
            {!user ? <p className="mt-1 text-sm text-muted">You need an account. Sign up or log in to accept this invitation.</p> : null}
            {user && profile?.status !== 'approved' ? <p className="mt-1 text-sm text-amber-700">Your account is pending approval. We will hold access until approved.</p> : null}
          </div>
          <form action={acceptInvite}>
            <input type="hidden" name="token" value={token} />
            <Button className="w-full sm:w-auto">Accept invitation</Button>
          </form>
        </Card>
      </div>
    </SiteShell>
  );
}

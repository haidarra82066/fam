import { redirect } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { StatusChip, Surface } from '@/components/ui/studio';
import { getCurrentUserWithProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MailCheck, ShieldCheck } from 'lucide-react';

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
        <Surface variant="hero" className="archive-lines w-full max-w-xl space-y-5 p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-[#d8e7e3] bg-white text-accent shadow-soft">
            <MailCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Family tree invitation</h1>
            {!user ? <p className="mt-1 text-sm text-muted">You need an account. Sign up or log in to accept this invitation.</p> : null}
            {user && profile?.status !== 'approved' ? <p className="mt-1 text-sm text-amber-700">Your account is pending approval. We will hold access until approved.</p> : null}
          </div>
          <StatusChip tone="accent" className="justify-center"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Private tree access</StatusChip>
          <form action={acceptInvite}>
            <input type="hidden" name="token" value={token} />
            <Button className="w-full sm:w-auto">Accept invitation</Button>
          </form>
        </Surface>
      </div>
    </SiteShell>
  );
}

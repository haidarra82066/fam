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
  return <SiteShell><Card className='mx-auto max-w-xl space-y-3 p-6'>
    <h1 className='text-2xl font-semibold'>Family tree invitation</h1>
    {!user ? <p className='text-sm text-muted'>You need an account. Sign up or log in to accept this invitation.</p> : null}
    {user && profile?.status !== 'approved' ? <p className='text-sm text-amber-600'>Your account is pending approval. We will hold access until approved.</p> : null}
    <form action={acceptInvite}><input type='hidden' name='token' value={token} /><Button>Accept invitation</Button></form>
  </Card></SiteShell>;
}

'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <input required aria-label="Email" className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input required aria-label="Password" minLength={6} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Continue'}</Button>
    </form>
  );
}

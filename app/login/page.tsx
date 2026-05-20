import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <SiteShell>
      <Card className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted">Welcome back. Sign in with your email account.</p>
        <div className="space-y-3">
          <input className="w-full rounded-xl border border-border bg-white px-3 py-2" placeholder="Email" />
          <input className="w-full rounded-xl border border-border bg-white px-3 py-2" placeholder="Password" type="password" />
        </div>
        <Button className="w-full">Continue</Button>
      </Card>
    </SiteShell>
  );
}

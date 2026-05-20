import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <SiteShell>
      <Card className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted">Welcome back. Sign in with your email account.</p>
        <LoginForm />
      </Card>
    </SiteShell>
  );
}

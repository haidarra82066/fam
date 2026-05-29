import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100dvh-9rem)] w-full grid-cols-[minmax(0,1fr)] place-items-center">
        <Card className="w-[90vw] max-w-[90vw] space-y-5 p-6 sm:w-full sm:max-w-md">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Log in</h1>
            <p className="mt-1 text-sm text-muted">Welcome back. Sign in with your email account.</p>
          </div>
          <LoginForm />
        </Card>
      </div>
    </SiteShell>
  );
}

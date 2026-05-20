import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <SiteShell>
      <Card className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted">New accounts require admin approval before access is enabled.</p>
        <SignupForm />
      </Card>
    </SiteShell>
  );
}

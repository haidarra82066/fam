import { SiteShell } from '@/components/site-shell';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <SiteShell>
      <AuthShell title="Create account" description="Request access to the studio. New accounts require admin approval before private trees are available." mode="signup">
        <SignupForm />
      </AuthShell>
    </SiteShell>
  );
}

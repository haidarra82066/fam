import { SiteShell } from '@/components/site-shell';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <SiteShell>
      <AuthShell title="Log in" description="Welcome back. Sign in with the email account approved for your family workspace." mode="login">
        <LoginForm />
      </AuthShell>
    </SiteShell>
  );
}

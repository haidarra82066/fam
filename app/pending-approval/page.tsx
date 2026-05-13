import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';

export default function PendingApprovalPage() {
  return (
    <SiteShell>
      <Card className="mx-auto max-w-xl space-y-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">Pending approval</h1>
        <p className="text-sm text-muted">Your account has been created and is waiting for an admin to grant access.</p>
      </Card>
    </SiteShell>
  );
}

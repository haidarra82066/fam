import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';

export default function PendingApprovalPage() {
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100dvh-9rem)] w-full grid-cols-[minmax(0,1fr)] place-items-center">
        <Card className="w-[90vw] max-w-[90vw] space-y-3 p-6 text-center sm:w-full sm:max-w-xl">
          <h1 className="text-2xl font-semibold text-slate-950">Pending approval</h1>
          <p className="text-sm text-muted">Your account has been created and is waiting for an admin to grant access.</p>
        </Card>
      </div>
    </SiteShell>
  );
}

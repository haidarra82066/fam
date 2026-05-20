import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';

export default function AccessRequestsPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Access requests</h1>
        <Card className="p-6">
          <p className="text-sm text-muted">No pending requests right now.</p>
        </Card>
      </div>
    </SiteShell>
  );
}

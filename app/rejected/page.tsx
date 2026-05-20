import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';

export default function RejectedPage() {
  return (
    <SiteShell>
      <Card className="mx-auto max-w-xl space-y-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">Access request rejected</h1>
        <p className="text-sm text-muted">Your account request was rejected. Contact an administrator if you think this is a mistake.</p>
      </Card>
    </SiteShell>
  );
}

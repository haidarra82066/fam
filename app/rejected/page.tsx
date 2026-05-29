import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';

export default function RejectedPage() {
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100dvh-9rem)] w-full grid-cols-[minmax(0,1fr)] place-items-center">
        <Card className="w-[90vw] max-w-[90vw] space-y-3 p-6 text-center sm:w-full sm:max-w-xl">
          <h1 className="text-2xl font-semibold text-slate-950">Access request rejected</h1>
          <p className="text-sm text-muted">Your account request was rejected. Contact an administrator if you think this is a mistake.</p>
        </Card>
      </div>
    </SiteShell>
  );
}

import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';

export default async function TreePage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Tree: {treeId}</h1>
        <Card className="p-6">
          <p className="text-sm text-muted">Canvas empty state: no members or relationships yet.</p>
        </Card>
      </div>
    </SiteShell>
  );
}

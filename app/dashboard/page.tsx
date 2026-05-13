import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Manage your trees and continue building relationships.</p>
        </div>
        <Card className="space-y-4 p-6">
          <h2 className="font-semibold">No family trees yet</h2>
          <p className="text-sm text-muted">Create your first tree to start adding family members.</p>
          <Link href="/tree/new"><Button>Create first tree</Button></Link>
        </Card>
      </div>
    </SiteShell>
  );
}

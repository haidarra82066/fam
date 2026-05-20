import { notFound, redirect } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';

export default async function TreePage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('tree_memberships')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) notFound();

  const { data: tree } = await supabase
    .from('family_trees')
    .select('id, name, description, updated_at')
    .eq('id', treeId)
    .maybeSingle();

  if (!tree) notFound();

  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">{tree.name}</h1>
        <Card className="space-y-3 p-6">
          <p className="text-sm text-muted">{tree.description || 'No description yet.'}</p>
          <p className="text-xs text-muted">Your role: {membership.role}</p>
          <p className="text-xs text-muted">Last updated: {new Date(tree.updated_at).toLocaleString()}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted">Canvas empty state: no members or relationships yet.</p>
        </Card>
      </div>
    </SiteShell>
  );
}

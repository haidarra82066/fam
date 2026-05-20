import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTreeModal } from '@/components/dashboard/create-tree-modal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';

async function createTree(formData: FormData) {
  'use server';
  const { user, profile } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');
  if (profile?.status !== 'approved') redirect('/pending-approval');

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!name) redirect('/dashboard?error=missing_name');

  const supabase = await createClient();
  const { data: tree, error: createTreeError } = await supabase

  if (!name) redirect('/dashboard?error=missing_name');

  const supabase = await createClient();
  const { data: tree, error: treeError } = await supabase
    .from('family_trees')
    .insert({ name, description: description || null, created_by: user.id })
    .select('id')
    .single();
  if (createTreeError || !tree) redirect('/dashboard?error=create_tree_failed');

  if (treeError || !tree) redirect('/dashboard?error=create_tree_failed');

  const { error: membershipError } = await supabase
    .from('tree_memberships')
    .insert({ tree_id: tree.id, user_id: user.id, role: 'owner' });
  if (membershipError) redirect('/dashboard?error=create_membership_failed');

  await supabase.from('audit_logs').insert({ action: 'tree_created', performed_by: user.id, metadata: { tree_id: tree.id, name } });

  revalidatePath('/dashboard');
  redirect(`/tree/${tree.id}`);
}

async function renameTree(formData: FormData) {
  'use server';
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');

  const treeId = String(formData.get('treeId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!treeId || !name) redirect('/dashboard?error=invalid_rename');

  const supabase = await createClient();
  const { data: membership } = await supabase.from('tree_memberships').select('role').eq('tree_id', treeId).eq('user_id', user.id).maybeSingle();
  if (!membership) redirect('/dashboard');

  const { error: renameError } = await supabase.from('family_trees').update({ name }).eq('id', treeId);
  if (renameError) redirect('/dashboard?error=rename_failed');

  await supabase.from('audit_logs').insert({ action: 'tree_renamed', performed_by: user.id, metadata: { tree_id: treeId, name } });
  revalidatePath('/dashboard');
}

async function deleteTree(formData: FormData) {
  'use server';
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');

  const treeId = String(formData.get('treeId') ?? '');
  const confirm = String(formData.get('confirm') ?? '').trim();
  if (confirm !== 'DELETE') redirect('/dashboard?error=delete_confirmation_required');

  const supabase = await createClient();
  const { data: membership } = await supabase.from('tree_memberships').select('role').eq('tree_id', treeId).eq('user_id', user.id).maybeSingle();
  if (membership?.role !== 'owner') redirect('/dashboard');

  const { error: deleteError } = await supabase.from('family_trees').delete().eq('id', treeId);
  if (deleteError) redirect('/dashboard?error=delete_failed');

  await supabase.from('audit_logs').insert({ action: 'tree_deleted', performed_by: user.id, metadata: { tree_id: treeId } });
  revalidatePath('/dashboard');
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getCurrentUserWithProfile();
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: memberships } = await supabase.from('tree_memberships').select('tree_id, role').eq('user_id', user!.id);
  const treeIds = memberships?.map((m) => m.tree_id) ?? [];

  const { data: trees } = treeIds.length
    ? await supabase.from('family_trees').select('id, name, description, updated_at').in('id', treeIds).order('updated_at', { ascending: false })
    : { data: [] as { id: string; name: string; description: string | null; updated_at: string }[] };

  const { data: personCounts } = treeIds.length ? await supabase.from('persons').select('tree_id').in('tree_id', treeIds) : { data: [] as { tree_id: string }[] };
  const counts = (personCounts ?? []).reduce<Record<string, number>>((acc, p) => ((acc[p.tree_id] = (acc[p.tree_id] ?? 0) + 1), acc), {});
  const { data: membership } = await supabase
    .from('tree_memberships')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership?.role !== 'owner') redirect('/dashboard');

  const { error } = await supabase.from('family_trees').delete().eq('id', treeId);
  if (error) redirect('/dashboard?error=delete_failed');

  await supabase.from('audit_logs').insert({
    action: 'tree_deleted',
    performed_by: user.id,
    metadata: { tree_id: treeId },
  });

  revalidatePath('/dashboard');
}

export default async function DashboardPage() {
  const { user } = await getCurrentUserWithProfile();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from('tree_memberships')
    .select('tree_id, role')
    .eq('user_id', user!.id);

  const treeIds = memberships?.map((m) => m.tree_id) ?? [];

  const { data: trees } = treeIds.length
    ? await supabase
        .from('family_trees')
        .select('id, name, description, updated_at')
        .in('id', treeIds)
        .order('updated_at', { ascending: false })
    : { data: [] as { id: string; name: string; description: string | null; updated_at: string }[] };

  const { data: personCounts } = treeIds.length
    ? await supabase.from('persons').select('tree_id').in('tree_id', treeIds)
    : { data: [] as { tree_id: string }[] };

  const counts = (personCounts ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.tree_id] = (acc[p.tree_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <SiteShell>
      <div className="space-y-6">
        {error ? <Card className="p-4 text-sm text-red-600">Action failed: {error.replaceAll('_', ' ')}.</Card> : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Manage your trees and continue building relationships.</p>
        </div>

        <Card className="flex items-center justify-between gap-3 p-6">
          <div>
            <h2 className="font-semibold">Family trees</h2>
            <p className="text-sm text-muted">Create and manage your family trees.</p>
          </div>
          <CreateTreeModal action={createTree} />
        <Card className="space-y-4 p-6">
          <h2 className="font-semibold">Create new tree</h2>
          <form action={createTree} className="space-y-3">
            <input required name="name" className="w-full rounded-xl border border-border bg-white px-3 py-2" placeholder="Tree name" />
            <textarea name="description" className="min-h-20 w-full rounded-xl border border-border bg-white px-3 py-2" placeholder="Description (optional)" />
            <Button>Create tree</Button>
          </form>
        </Card>

        {!trees?.length ? (
          <Card className="space-y-4 p-6">
            <h2 className="font-semibold">Create your first family tree</h2>
            <p className="text-sm text-muted">Start by creating a tree, then invite relatives and add family members.</p>
            <CreateTreeModal action={createTree} />
            <p className="text-sm text-muted">Use the create form above to get started.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trees.map((tree) => {
              const role = memberships?.find((m) => m.tree_id === tree.id)?.role ?? 'member';
              return (
                <Card key={tree.id} className="space-y-3 p-5">
                  <div>
                    <h2 className="text-lg font-semibold">{tree.name}</h2>
                    <p className="text-sm text-muted">{tree.description || 'No description provided.'}</p>
                  </div>
                  <div className="space-y-1 text-xs text-muted">
                  <div className="text-xs text-muted space-y-1">
                    <p>Persons: {counts[tree.id] ?? 0}</p>
                    <p>Last updated: {new Date(tree.updated_at).toLocaleString()}</p>
                    <p>Role: {role}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/tree/${tree.id}`}><Button>Open</Button></Link>
                  </div>
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-medium">Settings</summary>
                    <div className="mt-3 space-y-3">
                      <form action={renameTree} className="space-y-2">
                        <input type="hidden" name="treeId" value={tree.id} />
                        <input name="name" defaultValue={tree.name} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
                        <Button variant="outline">Rename tree</Button>
                      </form>
                      {role === 'owner' ? (
                        <form action={deleteTree} className="space-y-2">
                          <input type="hidden" name="treeId" value={tree.id} />
                          <input name="confirm" placeholder="Type DELETE to confirm" className="w-full rounded-xl border border-border bg-white px-3 py-2" />
                          <Button variant="outline">Delete tree</Button>
                        </form>
                      ) : null}
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

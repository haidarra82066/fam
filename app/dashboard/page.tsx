import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTreeModal } from '@/components/dashboard/create-tree-modal';
import { createClient } from '@/lib/supabase/server';
import { requireUser, parseForm, writeAuditLog, z } from '@/lib/security';
import { GitBranch, Users } from 'lucide-react';

const createTreeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

async function createTree(formData: FormData) { 'use server';
  const { user } = await requireUser();
  const parsed = parseForm(createTreeSchema, formData);
  const supabase = await createClient();
  const { data: tree, error } = await supabase.from('family_trees').insert({ owner_id: user.id, name: parsed.name, description: parsed.description || null }).select('id').single();
  if (error || !tree) redirect('/dashboard?error=create_tree_failed');
  await supabase.from('tree_memberships').insert({ tree_id: tree.id, user_id: user.id, role: 'owner' });
  await writeAuditLog({ treeId: tree.id, actorId: user.id, action: 'tree_created', entityType: 'family_tree', entityId: tree.id });
  revalidatePath('/dashboard'); redirect(`/tree/${tree.id}`);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: memberships } = await supabase.from('tree_memberships').select('tree_id, role').eq('user_id', user.id).eq('status', 'active');
  const treeIds = memberships?.map((m) => m.tree_id) ?? [];
  const { data: trees } = treeIds.length ? await supabase.from('family_trees').select('id, name, description, updated_at').in('id', treeIds).order('updated_at', { ascending: false }) : { data: [] as any[] };

  return (
    <SiteShell>
      <div className="space-y-6">
        {error ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">Action failed: {error}.</Card> : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
            <p className="mt-1 text-sm text-muted">Open a tree, create a new workspace, or continue a shared family project.</p>
          </div>
          <CreateTreeModal action={createTree} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f1ef] text-accent"><GitBranch className="h-5 w-5" /></span>
            <div>
              <p className="text-2xl font-semibold text-slate-950">{trees?.length ?? 0}</p>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Trees</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0ed] text-[#b9685f]"><Users className="h-5 w-5" /></span>
            <div>
              <p className="text-2xl font-semibold text-slate-950">{memberships?.length ?? 0}</p>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Active memberships</p>
            </div>
          </Card>
        </div>

        {!trees?.length ? (
          <Card className="grid min-h-56 place-items-center p-6 text-center">
            <div className="max-w-sm">
              <h2 className="text-lg font-semibold text-slate-950">No trees yet</h2>
              <p className="mt-2 text-sm text-muted">Create your first family tree after account approval.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trees.map((tree: any) => {
              const role = memberships?.find((membership) => membership.tree_id === tree.id)?.role;

              return (
                <Card key={tree.id} className="flex min-h-48 flex-col justify-between p-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-950">{tree.name}</h2>
                      <span className="rounded-md border border-border bg-[#f8fbfa] px-2 py-1 text-xs font-medium capitalize text-muted">{role}</span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted">{tree.description || 'No description yet.'}</p>
                  </div>
                  <Link className="mt-5" href={`/tree/${tree.id}`}>
                    <Button className="w-full">Open tree</Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

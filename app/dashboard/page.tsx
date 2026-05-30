import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CreateTreeModal } from '@/components/dashboard/create-tree-modal';
import { createClient } from '@/lib/supabase/server';
import { requireUser, parseForm, writeAuditLog, z } from '@/lib/security';
import { cn } from '@/lib/utils';
import { ArrowRight, GitBranch, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';

const createTreeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

async function createTree(formData: FormData) {
  'use server';

  const { user } = await requireUser();
  const parsed = parseForm(createTreeSchema, formData);
  const supabase = await createClient();
  const { data: tree, error } = await supabase
    .from('family_trees')
    .insert({ owner_id: user.id, name: parsed.name, description: parsed.description || null })
    .select('id')
    .single();

  if (error || !tree) redirect('/dashboard?error=create_tree_failed');

  await supabase.from('tree_memberships').insert({ tree_id: tree.id, user_id: user.id, role: 'owner' });
  await writeAuditLog({ treeId: tree.id, actorId: user.id, action: 'tree_created', entityType: 'family_tree', entityId: tree.id });
  revalidatePath('/dashboard');
  redirect(`/tree/${tree.id}`);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: memberships } = await supabase.from('tree_memberships').select('tree_id, role').eq('user_id', user.id).eq('status', 'active');
  const treeIds = memberships?.map((m) => m.tree_id) ?? [];
  const { data: trees } = treeIds.length
    ? await supabase.from('family_trees').select('id, name, description, updated_at').in('id', treeIds).order('updated_at', { ascending: false })
    : { data: [] as any[] };
  const treeCount = trees?.length ?? 0;
  const membershipCount = memberships?.length ?? 0;
  const latestTree = trees?.[0];

  return (
    <SiteShell>
      <div className="space-y-6">
        {error ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">Action failed: {error}.</Card> : null}

        <section className="overflow-hidden rounded-xl border border-[#cddbd8] bg-white shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-7">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Sparkles className="h-4 w-4" />
                Private family workspace
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Open a tree, create a new workspace, or continue a shared family project without losing the thread of who is connected to whom.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <CreateTreeModal action={createTree} />
                {latestTree ? (
                  <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} href={`/tree/${latestTree.id}`}>
                    Continue latest
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-[#dfe9e7] bg-[#f8fbfa] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#e7f1ef] text-accent">
                    <GitBranch className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-slate-950">{treeCount}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Trees</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#f0d9d4] bg-[#fff7f5] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#fff0ed] text-[#b9685f]">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-slate-950">{membershipCount}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Active memberships</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!trees?.length ? (
          <Card className="grid min-h-64 place-items-center border-dashed border-[#b9ccc9] bg-[#f8fbfa] p-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-accent shadow-sm">
                <Plus className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">No trees yet</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Create your first family tree after account approval. You can invite relatives and add relationships from the workspace.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trees.map((tree: any) => {
              const role = memberships?.find((membership) => membership.tree_id === tree.id)?.role;

              return (
                <Card key={tree.id} className="group flex min-h-56 flex-col justify-between overflow-hidden border-[#d4e2df] bg-white p-0 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)]">
                  <div className="h-20 border-b border-[#e3ecea] bg-[linear-gradient(rgba(79,141,149,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(79,141,149,0.10)_1px,transparent_1px)] bg-[size:28px_28px] p-4">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-accent shadow-sm">
                        <GitBranch className="h-4 w-4" />
                      </span>
                      <span className="rounded-md border border-[#d8e7e3] bg-white/80 px-2 py-1 text-xs font-medium capitalize text-muted">{role}</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-slate-950">{tree.name}</h2>
                        <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-muted">{tree.description || 'No description yet.'}</p>
                    </div>
                    <Link className={cn(buttonVariants(), 'mt-5 w-full')} href={`/tree/${tree.id}`}>
                      Open tree
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

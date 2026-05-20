import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTreeModal } from '@/components/dashboard/create-tree-modal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';

async function createTree(formData: FormData) { 'use server';
  const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!name) redirect('/dashboard?error=missing_name');
  const supabase = await createClient();
  const { data: tree, error } = await supabase.from('family_trees').insert({ owner_id: user.id, name, description: description || null }).select('id').single();
  if (error || !tree) redirect('/dashboard?error=create_tree_failed');
  await supabase.from('tree_memberships').insert({ tree_id: tree.id, user_id: user.id, role: 'owner' });
  revalidatePath('/dashboard'); redirect(`/tree/${tree.id}`);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: memberships } = await supabase.from('tree_memberships').select('tree_id, role').eq('user_id', user.id).eq('status', 'active');
  const treeIds = memberships?.map((m) => m.tree_id) ?? [];
  const { data: trees } = treeIds.length ? await supabase.from('family_trees').select('id, name, description, updated_at').in('id', treeIds).order('updated_at', { ascending: false }) : { data: [] as any[] };

  return <SiteShell><div className='space-y-6'>
    {error ? <Card className='p-4 text-sm text-red-600'>Action failed: {error}.</Card> : null}
    <div><h1 className='text-3xl font-semibold tracking-tight'>Dashboard</h1><p className='mt-1 text-sm text-muted'>Manage your trees.</p></div>
    <Card className='flex items-center justify-between p-6'><div><h2 className='font-semibold'>Family trees</h2></div><CreateTreeModal action={createTree} /></Card>
    {!trees?.length ? <Card className='p-6 text-sm text-muted'>No trees yet.</Card> : <div className='grid gap-4 sm:grid-cols-2'>{trees.map((tree:any)=><Card key={tree.id} className='p-5 space-y-2'><h2 className='text-lg font-semibold'>{tree.name}</h2><p className='text-sm text-muted'>{tree.description || 'No description'}</p><p className='text-xs text-muted'>Role: {memberships?.find((m)=>m.tree_id===tree.id)?.role}</p><Link href={`/tree/${tree.id}`}><Button>Open</Button></Link></Card>)}</div>}
  </div></SiteShell>;
}

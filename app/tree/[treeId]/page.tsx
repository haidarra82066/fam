import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';
import { FamilyTreeCanvas } from '@/components/tree/family-tree-canvas';

async function addFirstPerson(formData: FormData) {
  'use server';
  const treeId = String(formData.get('treeId') ?? '');
  const display_name = String(formData.get('display_name') ?? '').trim();
  const birth_date = String(formData.get('birth_date') ?? '') || null;
  const death_date = String(formData.get('death_date') ?? '') || null;
  const living_status = String(formData.get('living_status') ?? '') || null;
  if (!display_name) return;

  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');
  const supabase = await createClient();
  const { data: m } = await supabase.from('tree_memberships').select('id').eq('tree_id', treeId).eq('user_id', user.id).maybeSingle();
  if (!m) notFound();
  await supabase.from('persons').insert({ tree_id: treeId, display_name, birth_date, death_date, living_status, created_by: user.id });
  await supabase.from('audit_logs').insert({ action: 'person_created', performed_by: user.id, metadata: { tree_id: treeId, display_name } });
  revalidatePath(`/tree/${treeId}`);
}

export default async function TreePage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');
  const supabase = await createClient();
  const { data: membership } = await supabase.from('tree_memberships').select('role').eq('tree_id', treeId).eq('user_id', user.id).maybeSingle();
  if (!membership) notFound();

  const { data: tree } = await supabase.from('family_trees').select('id, name, description, updated_at').eq('id', treeId).maybeSingle();
  if (!tree) notFound();
  const [{ data: persons }, { data: unions }, { data: relationships }] = await Promise.all([
    supabase.from('persons').select('id, display_name, birth_date, death_date, living_status, is_private, photo_url, role_label, created_at').eq('tree_id', treeId),
    supabase.from('unions').select('id, partner_1_id, partner_2_id, status').eq('tree_id', treeId),
    supabase.from('parent_child_relationships').select('id, parent_id, child_id, relation_type').eq('tree_id', treeId),
  ]);

  return (
    <SiteShell>
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{tree.name}</h1>
        <p className="text-sm text-muted">{tree.description || 'No description yet.'}</p>
        {!(persons?.length) ? (
          <Card className="mx-auto max-w-xl space-y-4 p-6 text-center">
            <h2 className="text-xl font-semibold">Add first person</h2>
            <p className="text-sm text-muted">Start building your tree by adding the first person.</p>
            <form action={addFirstPerson} className="space-y-3 text-left">
              <input type="hidden" name="treeId" value={treeId} />
              <input required name="display_name" placeholder="Display name" className="w-full rounded-xl border border-border px-3 py-2" />
              <div className="grid grid-cols-2 gap-2"><input name="birth_date" type="date" className="rounded-xl border border-border px-3 py-2" /><input name="death_date" type="date" className="rounded-xl border border-border px-3 py-2" /></div>
              <select name="living_status" className="w-full rounded-xl border border-border px-3 py-2"><option value="">Unknown</option><option value="living">Living</option><option value="deceased">Deceased</option></select>
              <Button>Add first person</Button>
            </form>
          </Card>
        ) : (
          <FamilyTreeCanvas persons={persons ?? []} unions={unions ?? []} parentChild={relationships ?? []} />
        )}
      </div>
    </SiteShell>
  );
}

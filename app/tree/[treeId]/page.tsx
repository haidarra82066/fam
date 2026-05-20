import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';
import { FamilyTreeCanvas } from '@/components/tree/family-tree-canvas';

function parsePerson(input: Record<string, any>) { if (!input.tree_id || !input.display_name) throw new Error('Invalid person payload'); return input; }

async function assertMember(treeId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('tree_memberships').select('id').eq('tree_id', treeId).eq('user_id', userId).maybeSingle();
  if (!data) notFound();
  return supabase;
}

async function savePerson(formData: FormData) { 'use server';
  const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
  const person_id = String(formData.get('person_id') ?? '');
  const payload = parsePerson({ tree_id:String(formData.get('tree_id')??''), display_name:String(formData.get('display_name')??''), given_names:String(formData.get('given_names')??''), middle_names:String(formData.get('middle_names')??''), surname_now:String(formData.get('surname_now')??''), surname_at_birth:String(formData.get('surname_at_birth')??''), nickname:String(formData.get('nickname')??''), title:String(formData.get('title')??''), suffix:String(formData.get('suffix')??''), gender:String(formData.get('gender')??''), living_status:String(formData.get('living_status')??''), birth_date:String(formData.get('birth_date')??''), birth_place:String(formData.get('birth_place')??''), death_date:String(formData.get('death_date')??''), death_place:String(formData.get('death_place')??''), cause_of_death:String(formData.get('cause_of_death')??''), burial_date:String(formData.get('burial_date')??''), burial_place:String(formData.get('burial_place')??''), profession:String(formData.get('profession')??''), company:String(formData.get('company')??''), education:String(formData.get('education')??''), short_bio:String(formData.get('short_bio')??''), notes:String(formData.get('notes')??''), color_label:String(formData.get('color_label')??''), is_private:formData.get('is_private')==='on' });
  const supabase = await assertMember(payload.tree_id, user.id);
  await supabase.from('persons').update(payload).eq('id', person_id).eq('tree_id', payload.tree_id);
  await supabase.from('audit_logs').insert({ action:'person_updated', performed_by:user.id, metadata:{ person_id, tree_id:payload.tree_id } });
  revalidatePath(`/tree/${payload.tree_id}`);
}

async function deletePerson(formData: FormData) { 'use server'; const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login'); const treeId=String(formData.get('tree_id')??''); const personId=String(formData.get('person_id')??''); if(String(formData.get('confirm')??'')!=='DELETE') return; const supabase=await assertMember(treeId,user.id); await supabase.from('persons').delete().eq('id',personId).eq('tree_id',treeId); await supabase.from('audit_logs').insert({action:'person_deleted',performed_by:user.id,metadata:{tree_id:treeId,person_id:personId}}); revalidatePath(`/tree/${treeId}`); }

async function addRelative(formData: FormData) { 'use server'; const { user } = await getCurrentUserWithProfile(); if(!user) redirect('/login'); const treeId=String(formData.get('tree_id')??''); const selectedId=String(formData.get('selected_id')??''); const kind=String(formData.get('kind')??''); const name=String(formData.get('display_name')??'').trim()||`Unknown ${kind}`; const supabase=await assertMember(treeId,user.id); if(selectedId===String(formData.get('existing_id')??'')) return;
  let newId=String(formData.get('existing_id')??'');
  if(!newId){ const {data}=await supabase.from('persons').insert({tree_id:treeId,display_name:name,created_by:user.id}).select('id').single(); newId=data!.id; }
  if(['father','mother','parent','adoptive_parent','step_parent','foster_parent','guardian','unknown_parent'].includes(kind)){ if(newId!==selectedId) await supabase.from('parent_child_relationships').insert({tree_id:treeId,parent_id:newId,child_id:selectedId,relation_type:kind.includes('adoptive')?'adoptive':kind.includes('step')?'step':kind.includes('foster')?'foster':kind.includes('guardian')?'guardian':'biological'}); }
  else if(kind==='child'){ if(newId!==selectedId) await supabase.from('parent_child_relationships').insert({tree_id:treeId,parent_id:selectedId,child_id:newId,relation_type:'biological'}); }
  else if(['partner','spouse','ex-partner'].includes(kind)){ await supabase.from('unions').insert({tree_id:treeId,partner_1_id:selectedId,partner_2_id:newId,status:kind==='spouse'?'married':kind==='ex-partner'?'ex_partner':'partner'}); }
  else if(kind==='sibling'){ const {data:parents}=await supabase.from('parent_child_relationships').select('parent_id').eq('tree_id',treeId).eq('child_id',selectedId); if(parents?.length){ await supabase.from('parent_child_relationships').insert(parents.map((p:any)=>({tree_id:treeId,parent_id:p.parent_id,child_id:newId,relation_type:'biological'}))); } }
  await supabase.from('audit_logs').insert({action:'relative_added',performed_by:user.id,metadata:{tree_id:treeId,selected_id:selectedId,new_id:newId,kind}}); revalidatePath(`/tree/${treeId}`);
}

export default async function TreePage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params; const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
  const supabase = await assertMember(treeId, user.id);
  const { data: tree } = await supabase.from('family_trees').select('id, name, description, updated_at').eq('id', treeId).maybeSingle(); if (!tree) notFound();
  const [{ data: persons }, { data: unions }, { data: relationships }] = await Promise.all([
    supabase.from('persons').select('*').eq('tree_id', treeId),
    supabase.from('unions').select('id, partner_1_id, partner_2_id, status').eq('tree_id', treeId),
    supabase.from('parent_child_relationships').select('id, parent_id, child_id, relation_type').eq('tree_id', treeId),
  ]);
  return <SiteShell><div className="space-y-4"><h1 className="text-3xl font-semibold tracking-tight">{tree.name}</h1><p className="text-sm text-muted">{tree.description || 'No description yet.'}</p>{!(persons?.length)?<Card className="mx-auto max-w-xl space-y-4 p-6 text-center"><h2 className="text-xl font-semibold">Add first person</h2><form action={addRelative} className="space-y-3 text-left"><input type="hidden" name="tree_id" value={treeId} /><input type="hidden" name="selected_id" value="" /><input type="hidden" name="kind" value="child" /><input required name="display_name" placeholder="Display name" className="w-full rounded-xl border border-border px-3 py-2" /><Button>Add first person</Button></form></Card>:<FamilyTreeCanvas persons={persons ?? []} unions={unions ?? []} parentChild={relationships ?? []} onSavePerson={savePerson} onDeletePerson={deletePerson} onAddRelative={addRelative} treeId={treeId} />}</div></SiteShell>;
}

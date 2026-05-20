import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile } from '@/lib/auth';

async function updateRole(formData: FormData) { 'use server';
 const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login'); const supabase=await createClient();
 const id=String(formData.get('membership_id')??''); const role=String(formData.get('role')??'viewer'); const treeId=String(formData.get('tree_id')??'');
 await supabase.from('tree_memberships').update({ role }).eq('id', id);
 await supabase.from('audit_logs').insert({ tree_id: treeId, actor_id: user.id, action: 'role_changed', entity_type: 'tree_membership', entity_id: id, metadata: { role } });
 revalidatePath(`/tree/${treeId}/members`);
}

async function revokeMember(formData: FormData) { 'use server';
 const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login'); const supabase=await createClient();
 const id=String(formData.get('membership_id')??''); const treeId=String(formData.get('tree_id')??'');
 await supabase.from('tree_memberships').update({ status: 'removed' }).eq('id', id);
 await supabase.from('audit_logs').insert({ tree_id: treeId, actor_id: user.id, action: 'member_removed', entity_type: 'tree_membership', entity_id: id, metadata: {} });
 revalidatePath(`/tree/${treeId}/members`);
}

export default async function MembersPage({ params }: { params: Promise<{ treeId: string }> }) {
 const { treeId } = await params; const { user } = await getCurrentUserWithProfile(); if (!user) redirect('/login');
 const supabase=await createClient();
 const { data: me } = await supabase.from('tree_memberships').select('role').eq('tree_id', treeId).eq('user_id', user.id).maybeSingle();
 if (!me) notFound();
 const { data: members } = await supabase.from('tree_memberships').select('id, role, status, user_id, profiles(email, status)').eq('tree_id', treeId).order('created_at');
 return <SiteShell><div className='space-y-4'><h1 className='text-2xl font-semibold'>Members</h1>{members?.map((m:any)=><Card key={m.id} className='p-4 space-y-2'><p>{m.profiles?.email} · {m.role} · {m.status}</p>{m.profiles?.status!=='approved'?<p className='text-xs text-amber-600'>Pending approval</p>:null}{['owner','editor'].includes(me.role)&&m.role!=='owner'?<div className='flex gap-2'><form action={updateRole}><input type='hidden' name='membership_id' value={m.id}/><input type='hidden' name='tree_id' value={treeId}/><select name='role' defaultValue={m.role} className='rounded border px-2 py-1'><option>viewer</option><option>contributor</option><option>editor</option></select><Button variant='outline'>Change role</Button></form><form action={revokeMember}><input type='hidden' name='membership_id' value={m.id}/><input type='hidden' name='tree_id' value={treeId}/><Button variant='outline'>Revoke</Button></form></div>:null}</Card>)}</div></SiteShell>;
}

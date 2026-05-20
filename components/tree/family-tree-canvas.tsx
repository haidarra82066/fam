'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';

type Person = Record<string, any>;

function years(p: Person) { const b = p.birth_date ? new Date(p.birth_date).getFullYear() : '?'; const d = p.death_date ? new Date(p.death_date).getFullYear() : ''; return d ? `${b}-${d}` : `${b}`; }
function layout(persons: Person[], unions: any[], parentChild: any[], horizontal: boolean) { const childToParents=new Map<string,string[]>(); parentChild.forEach((r)=>childToParents.set(r.child_id,[...(childToParents.get(r.child_id)||[]),r.parent_id])); const gen=new Map<string,number>(); const byId=new Map(persons.map((p)=>[p.id,p])); const sorted=[...persons].sort((a,b)=>(a.birth_date||a.created_at||'').localeCompare(b.birth_date||b.created_at||'')); const visit=(id:string):number=>{ if(gen.has(id)) return gen.get(id)!; const ps=childToParents.get(id)||[]; const g=ps.length?Math.max(...ps.map(visit))+1:0; gen.set(id,g); return g;}; sorted.forEach((p)=>visit(p.id)); unions.forEach((u)=>{const g=Math.max(gen.get(u.partner_1_id)||0,gen.get(u.partner_2_id)||0);gen.set(u.partner_1_id,g);gen.set(u.partner_2_id,g);}); const groups=new Map<number,Person[]>(); sorted.forEach((p)=>{const g=gen.get(p.id)||0;groups.set(g,[...(groups.get(g)||[]),p]);}); const nodes:any[]=[]; [...groups.entries()].sort((a,b)=>a[0]-b[0]).forEach(([g,list])=>list.forEach((p,idx)=>nodes.push({id:p.id,position:{x:horizontal?g*280:idx*240,y:horizontal?idx*180:g*220},data:{person:p}}))); const edges:any[]=[]; unions.forEach((u)=>edges.push({id:`u-${u.id}`,source:u.partner_1_id,target:u.partner_2_id,style:{strokeDasharray:(u.status==='ex_partner'||u.status==='divorced')?'4 4':'0',opacity:u.status?0.8:1}})); parentChild.forEach((r)=>edges.push({id:r.id,source:r.parent_id,target:r.child_id,label:r.relation_type==='adoptive'?'adoptive':undefined,style:{strokeDasharray:['step','foster','guardian'].includes(r.relation_type||'')?'5 5':'0'}})); return {nodes,edges,byId}; }

function CanvasInner(props:any){ const rf=useReactFlow(); const [selected,setSelected]=useState<any>(null); const [horizontal,setHorizontal]=useState(false); const [depth,setDepth]=useState(99); const [query,setQuery]=useState(''); const prepared=useMemo(()=>layout(props.persons,props.unions,props.parentChild,horizontal),[props.persons,props.unions,props.parentChild,horizontal]); const nodes=prepared.nodes.filter((n:any)=>{const p=n.data.person; return p.display_name.toLowerCase().includes(query.toLowerCase()) && (horizontal || n.position.y/220<=depth);}).map((n:any)=>({...n,data:{label:<div className="rounded-full border bg-white px-4 py-2 text-center text-xs"><div className="font-medium">{n.data.person.display_name}</div><div className="text-muted">{years(n.data.person)}</div><div>{n.data.person.relationship_label || n.data.person.role_label || ''}</div><div>{n.data.person.living_status==='deceased'?'✝':''} {n.data.person.is_private?'🔒':''}</div></div>}}));
  return <div className="relative h-[70vh] w-full rounded-xl border bg-slate-50"><div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 rounded-xl border bg-white p-2"><input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="rounded border px-2 py-1 text-sm"/><Button type="button" variant="outline" onClick={()=>rf.fitView()}>Fit</Button><Button type="button" variant="outline" onClick={()=>rf.zoomIn()}>+</Button><Button type="button" variant="outline" onClick={()=>rf.zoomOut()}>-</Button><Button type="button" variant="outline" onClick={()=>setHorizontal(!horizontal)}>{horizontal?'Horizontal':'Vertical'}</Button><select className="rounded border px-2 py-1 text-sm" value={depth} onChange={(e)=>setDepth(Number(e.target.value))}><option value={99}>All gens</option><option value={2}>2 gens</option><option value={3}>3 gens</option></select></div><ReactFlow nodes={nodes} edges={prepared.edges} fitView onNodeClick={(_:any,node:any)=>setSelected(prepared.byId.get(node.id))}><Background/><Controls/></ReactFlow>{selected?<PersonEditor selected={selected} persons={props.persons} treeId={props.treeId} onSavePerson={props.onSavePerson} onDeletePerson={props.onDeletePerson} onAddRelative={props.onAddRelative}/>:null}</div>; }

function PersonEditor({selected, treeId, onSavePerson, onDeletePerson, onAddRelative, persons}: any){ const [tab,setTab]=useState('basics');
  return <div className="absolute bottom-0 right-0 w-full overflow-auto border-t bg-white p-4 md:top-0 md:h-full md:w-[380px] md:border-l md:border-t-0"><h3 className="font-semibold">{selected.display_name}</h3><div className="my-2 flex flex-wrap gap-1 text-xs">{['basics','life','bio','work','privacy'].map(t=><button key={t} onClick={()=>setTab(t)} className="rounded border px-2 py-1">{t}</button>)}</div><form action={onSavePerson} className="space-y-2 text-sm"><input type="hidden" name="tree_id" value={treeId}/><input type="hidden" name="person_id" value={selected.id}/><input name="display_name" defaultValue={selected.display_name||''} placeholder="display_name" className="w-full rounded border px-2 py-1"/>{tab==='basics'?<><input name="given_names" defaultValue={selected.given_names||''} placeholder="given_names" className="w-full rounded border px-2 py-1"/><input name="middle_names" defaultValue={selected.middle_names||''} placeholder="middle_names" className="w-full rounded border px-2 py-1"/><input name="surname_now" defaultValue={selected.surname_now||''} placeholder="surname_now" className="w-full rounded border px-2 py-1"/><input name="surname_at_birth" defaultValue={selected.surname_at_birth||''} placeholder="surname_at_birth" className="w-full rounded border px-2 py-1"/><input name="nickname" defaultValue={selected.nickname||''} placeholder="nickname" className="w-full rounded border px-2 py-1"/></>:null}{tab==='life'?<><input name="birth_date" type="date" defaultValue={selected.birth_date||''} className="w-full rounded border px-2 py-1"/><input name="birth_place" defaultValue={selected.birth_place||''} placeholder="birth_place" className="w-full rounded border px-2 py-1"/><input name="death_date" type="date" defaultValue={selected.death_date||''} className="w-full rounded border px-2 py-1"/><input name="death_place" defaultValue={selected.death_place||''} placeholder="death_place" className="w-full rounded border px-2 py-1"/></>:null}{tab==='bio'?<><textarea name="short_bio" defaultValue={selected.short_bio||''} placeholder="short_bio" className="w-full rounded border px-2 py-1"/><textarea name="notes" defaultValue={selected.notes||''} placeholder="notes" className="w-full rounded border px-2 py-1"/></>:null}{tab==='work'?<><input name="profession" defaultValue={selected.profession||''} placeholder="profession" className="w-full rounded border px-2 py-1"/><input name="company" defaultValue={selected.company||''} placeholder="company" className="w-full rounded border px-2 py-1"/><input name="education" defaultValue={selected.education||''} placeholder="education" className="w-full rounded border px-2 py-1"/></>:null}{tab==='privacy'?<><input name="color_label" defaultValue={selected.color_label||''} placeholder="color_label" className="w-full rounded border px-2 py-1"/><label className="flex items-center gap-2"><input type="checkbox" name="is_private" defaultChecked={!!selected.is_private}/> Private</label></>:null}<Button>Save</Button></form>
  <details className="mt-3 rounded border p-2"><summary className="cursor-pointer">Add relative</summary><div className="mt-2 grid grid-cols-2 gap-2">{['father','mother','parent','child','partner','spouse','ex-partner','sibling','adoptive_parent','step_parent','foster_parent','guardian','unknown_parent'].map(kind=><form key={kind} action={onAddRelative} className="space-y-1"><input type="hidden" name="tree_id" value={treeId}/><input type="hidden" name="selected_id" value={selected.id}/><input type="hidden" name="kind" value={kind}/><input name="display_name" placeholder={`${kind} name`} className="w-full rounded border px-2 py-1 text-xs"/><Button variant="outline" className="w-full">Add {kind}</Button></form>)}</div><form action={onAddRelative} className="mt-2 space-y-1"><input type="hidden" name="tree_id" value={treeId}/><input type="hidden" name="selected_id" value={selected.id}/><input type="hidden" name="kind" value="parent"/><select name="existing_id" className="w-full rounded border px-2 py-1 text-xs">{persons.map((p:any)=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select><Button variant="outline" className="w-full">Add existing person as relative</Button></form></details>
  <form action={onDeletePerson} className="mt-3 space-y-2"><input type="hidden" name="tree_id" value={treeId}/><input type="hidden" name="person_id" value={selected.id}/><input name="confirm" placeholder="Type DELETE" className="w-full rounded border px-2 py-1"/><Button variant="outline" className="w-full">Delete person</Button></form>
  <p className="mt-3 text-xs text-muted">Created: {selected.created_at || 'n/a'} · Updated: {selected.updated_at || 'n/a'}</p>
  </div>
}

export function FamilyTreeCanvas(props:any){ return <ReactFlowProvider><CanvasInner {...props}/></ReactFlowProvider>; }
type Person = { id: string; display_name: string; birth_date?: string | null; death_date?: string | null; living_status?: string | null; is_private?: boolean | null; photo_url?: string | null; role_label?: string | null; created_at?: string | null };
type Union = { id: string; partner_1_id: string; partner_2_id: string; status?: string | null };
type ParentChild = { id: string; parent_id: string; child_id: string; relation_type?: string | null };

function years(p: Person) {
  const b = p.birth_date ? new Date(p.birth_date).getFullYear() : '?';
  const d = p.death_date ? new Date(p.death_date).getFullYear() : '';
  return d ? `${b}-${d}` : `${b}`;
}

function layout(persons: Person[], unions: Union[], parentChild: ParentChild[], horizontal: boolean) {
  const childToParents = new Map<string, string[]>();
  parentChild.forEach((r) => childToParents.set(r.child_id, [...(childToParents.get(r.child_id) ?? []), r.parent_id]));
  const gen = new Map<string, number>();
  const byId = new Map(persons.map((p) => [p.id, p]));
  const sorted = [...persons].sort((a,b)=> (a.birth_date||a.created_at||'').localeCompare(b.birth_date||b.created_at||''));
  const visit = (id: string): number => {
    if (gen.has(id)) return gen.get(id)!;
    const ps = childToParents.get(id) ?? [];
    const g = ps.length ? Math.max(...ps.map(visit)) + 1 : 0;
    gen.set(id, g);
    return g;
  };
  sorted.forEach((p) => visit(p.id));
  unions.forEach((u) => {
    const g = Math.max(gen.get(u.partner_1_id) ?? 0, gen.get(u.partner_2_id) ?? 0);
    gen.set(u.partner_1_id, g); gen.set(u.partner_2_id, g);
  });

  const groups = new Map<number, Person[]>();
  sorted.forEach((p) => { const g=gen.get(p.id)??0; groups.set(g, [...(groups.get(g)??[]), p]); });
  const nodes:any[]=[];
  [...groups.entries()].sort((a,b)=>a[0]-b[0]).forEach(([g, list])=>{
    list.forEach((p, idx)=>{
      const x = horizontal ? g*280 : idx*240;
      const y = horizontal ? idx*180 : g*220;
      nodes.push({ id:p.id, position:{x,y}, data:{label:p}, type:'default' });
    });
  });

  const edges:any[] = [];
  unions.forEach((u)=>{
    edges.push({ id:`u-${u.id}`, source:u.partner_1_id, target:u.partner_2_id, style:{ strokeDasharray: (u.status==='ex-partner'||u.status==='divorced') ? '4 4' : '0', opacity: u.status ? 0.8 : 1 } });
  });
  parentChild.forEach((r)=>{
    const dashed = ['step','foster','guardian'].includes(r.relation_type ?? '');
    edges.push({ id:r.id, source:r.parent_id, target:r.child_id, label: r.relation_type==='adoptive' ? 'adoptive' : undefined, style:{ strokeDasharray: dashed ? '5 5' : '0' } });
  });
  return { nodes, edges, byId };
}

function Toolbar({ onFit, onZoomIn, onZoomOut, horizontal, setHorizontal, depth, setDepth, query, setQuery }: any) {
  return <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 rounded-xl border bg-white p-2">
    <input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="rounded border px-2 py-1 text-sm" />
    <Button type="button" variant="outline" onClick={onFit}>Fit</Button>
    <Button type="button" variant="outline" onClick={onZoomIn}>+</Button>
    <Button type="button" variant="outline" onClick={onZoomOut}>-</Button>
    <Button type="button" variant="outline" onClick={()=>setHorizontal(!horizontal)}>{horizontal ? 'Horizontal':'Vertical'}</Button>
    <select className="rounded border px-2 py-1 text-sm" value={depth} onChange={(e)=>setDepth(Number(e.target.value))}><option value={99}>All gens</option><option value={2}>2 gens</option><option value={3}>3 gens</option><option value={4}>4 gens</option></select>
  </div>;
}

function CanvasInner(props: any) {
  const rf = useReactFlow();
  const [selected, setSelected] = useState<any>(null);
  const [horizontal, setHorizontal] = useState(false);
  const [depth, setDepth] = useState(99);
  const [query, setQuery] = useState('');

  const prepared = useMemo(()=>layout(props.persons, props.unions, props.parentChild, horizontal), [props.persons, props.unions, props.parentChild, horizontal]);
  const nodes = prepared.nodes.filter((n:any)=>{
    const p = n.data.label as Person;
    const matches = p.display_name.toLowerCase().includes(query.toLowerCase());
    return matches && (n.position.y/220 <= depth || horizontal);
  }).map((n:any)=>({ ...n, data:{ label: <div className="rounded-full border bg-white px-4 py-2 text-center text-xs"><div className="font-medium">{(n.data.label as Person).display_name}</div><div className="text-muted">{years(n.data.label)}</div><div>{(n.data.label as Person).living_status==='deceased'?'✝':''} {(n.data.label as Person).is_private?'🔒':''}</div></div> } }));

  return <div className="relative h-[70vh] w-full rounded-xl border bg-slate-50">
    <Toolbar onFit={()=>rf.fitView()} onZoomIn={()=>rf.zoomIn()} onZoomOut={()=>rf.zoomOut()} horizontal={horizontal} setHorizontal={setHorizontal} depth={depth} setDepth={setDepth} query={query} setQuery={setQuery} />
    <ReactFlow nodes={nodes} edges={prepared.edges} fitView onNodeClick={(_:any,node:any)=>setSelected(prepared.byId.get(node.id))}>
      <Background />
      <Controls />
    </ReactFlow>
    {selected ? <div className="absolute bottom-0 right-0 w-full border-t bg-white p-4 md:top-0 md:h-full md:w-80 md:border-l md:border-t-0"><h3 className="font-semibold">{selected.display_name}</h3><p className="text-sm text-muted">{years(selected)}</p></div> : null}
  </div>;
}

export function FamilyTreeCanvas(props: any) {
  return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>;
}

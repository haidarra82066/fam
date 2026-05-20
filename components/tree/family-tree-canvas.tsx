'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';

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

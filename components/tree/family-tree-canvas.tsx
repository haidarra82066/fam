'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider } from '@xyflow/react';

type Person = Record<string, any>;

function years(p: Person) { const b = p.birth_date ? new Date(p.birth_date).getFullYear() : '?'; const d = p.death_date ? new Date(p.death_date).getFullYear() : ''; return d ? `${b}-${d}` : `${b}`; }

function layout(persons: Person[], unions: any[], parentChild: any[]) {
  const nodes = persons.map((p, idx) => ({ id: p.id, position: { x: (idx % 4) * 220, y: Math.floor(idx / 4) * 180 }, data: { person: p } }));
  const edges = [
    ...unions.map((u) => ({ id: `u-${u.id}`, source: u.partner1_id ?? u.partner_1_id, target: u.partner2_id ?? u.partner_2_id })),
    ...parentChild.map((r) => ({ id: r.id, source: r.parent_id, target: r.child_id })),
  ];
  return { nodes, edges };
}

function CanvasInner(props: any) {
  const [query, setQuery] = useState('');
  const prepared = useMemo(() => layout(props.persons, props.unions, props.parentChild), [props.persons, props.unions, props.parentChild]);
  const nodes = prepared.nodes.filter((n: any) => n.data.person.display_name?.toLowerCase().includes(query.toLowerCase())).map((n: any) => ({ ...n, data: { label: <div className='rounded-full border bg-white px-4 py-2 text-center text-xs'><div className='font-medium'>{n.data.person.display_name}</div><div className='text-muted'>{years(n.data.person)}</div></div> } }));
  return <div className='h-[70vh] w-full rounded-xl border bg-slate-50'><div className='p-2'><input value={query} onChange={(e) => setQuery(e.target.value)} className='rounded border px-2 py-1 text-sm' placeholder='Search' /></div><ReactFlow nodes={nodes} edges={prepared.edges} fitView><Background /><Controls /></ReactFlow></div>;
}

export function FamilyTreeCanvas(props: any) { return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>; }

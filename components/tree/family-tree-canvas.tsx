'use client';

import { useMemo, useState } from 'react';

type Person = Record<string, any>;

function years(p: Person) {
  const b = p.birth_date ? new Date(p.birth_date).getFullYear() : '?';
  const d = p.death_date ? new Date(p.death_date).getFullYear() : '';
  return d ? `${b}-${d}` : `${b}`;
}

function buildChildrenMap(parentChild: any[]) {
  const map = new Map<string, string[]>();
  for (const rel of parentChild) {
    const key = rel.parent_id;
    const list = map.get(key) ?? [];
    list.push(rel.child_id);
    map.set(key, list);
  }
  return map;
}

export function FamilyTreeCanvas({ persons, parentChild }: { persons: Person[]; unions: any[]; parentChild: any[]; treeId: string }) {
  const [query, setQuery] = useState('');
  const personById = useMemo(() => new Map((persons ?? []).map((p) => [p.id, p])), [persons]);
  const childrenMap = useMemo(() => buildChildrenMap(parentChild ?? []), [parentChild]);

  const filtered = (persons ?? []).filter((p) => p.display_name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="w-full rounded-xl border bg-white">
      <div className="border-b p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          placeholder="Search family members"
        />
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{p.display_name}</p>
            <p className="text-xs text-muted">{years(p)}</p>
            <p className="mt-2 text-xs text-muted">
              Children: {(childrenMap.get(p.id) ?? []).map((id) => personById.get(id)?.display_name ?? 'Unknown').join(', ') || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { KinshipEdge, KinshipInput } from './types';

export interface KinshipGraph {
  edgesByPerson: Map<string, KinshipEdge[]>;
}

export function buildGraph(input: KinshipInput): KinshipGraph {
  const edgesByPerson = new Map<string, KinshipEdge[]>();
  const add = (from: string, edge: KinshipEdge) => {
    const existing = edgesByPerson.get(from) ?? [];
    existing.push(edge);
    edgesByPerson.set(from, existing);
  };

  for (const p of input.persons) edgesByPerson.set(p.id, edgesByPerson.get(p.id) ?? []);

  for (const rel of input.parent_child_relationships) {
    const relationType = rel.relation_type ?? 'biological';
    add(rel.parent_id, { to: rel.child_id, kind: 'child', relationType });
    add(rel.child_id, { to: rel.parent_id, kind: 'parent', relationType });
  }

  for (const union of input.unions) {
    const status = union.status ?? 'partner';
    add(union.partner_1_id, { to: union.partner_2_id, kind: 'partner', unionStatus: status });
    add(union.partner_2_id, { to: union.partner_1_id, kind: 'partner', unionStatus: status });
  }

  return { edgesByPerson };
}

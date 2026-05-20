import { buildGraph } from './buildGraph';
import { cousinLabel } from './cousins';
import { KinshipInput, Person, RelationshipResult } from './types';

function sexWord(p: Person | undefined, male: string, female: string, neutral: string) {
  if (!p?.sex || p.sex === 'unknown') return neutral;
  return p.sex === 'male' ? male : female;
}

export function deriveRelationships(input: KinshipInput): Record<string, RelationshipResult> {
  const graph = buildGraph(input);
  const people = new Map(input.persons.map((p) => [p.id, p]));
  const focus = input.focusPersonId;

  const result: Record<string, RelationshipResult> = {};
  for (const p of input.persons) {
    result[p.id] = classify(focus, p.id, people, input, graph.edgesByPerson);
  }
  return result;
}

function classify(
  focus: string,
  target: string,
  people: Map<string, Person>,
  input: KinshipInput,
  edgesByPerson: Map<string, any[]>,
): RelationshipResult {
  if (focus === target) return { relationship_label: 'self', generation_delta: 0, relationship_path: [focus], confidence: 1 };

  const parentsOf = (id: string) => input.parent_child_relationships.filter((r) => r.child_id === id);
  const childrenOf = (id: string) => input.parent_child_relationships.filter((r) => r.parent_id === id);
  const partnersOf = (id: string) => input.unions.filter((u) => u.partner_1_id === id || u.partner_2_id === id);

  const directParent = parentsOf(focus).find((r) => r.parent_id === target);
  if (directParent) {
    const p = people.get(target);
    const step = directParent.relation_type === 'step';
    return {
      relationship_label: step ? 'step parent' : sexWord(p, 'father', 'mother', 'parent'),
      generation_delta: 1,
      relationship_path: [focus, target],
      confidence: step ? 0.9 : 1,
    };
  }

  const directChild = childrenOf(focus).find((r) => r.child_id === target);
  if (directChild) {
    const p = people.get(target);
    const step = directChild.relation_type === 'step';
    return {
      relationship_label: step ? 'step child' : sexWord(p, 'son', 'daughter', 'child'),
      generation_delta: -1,
      relationship_path: [focus, target],
      confidence: step ? 0.9 : 1,
    };
  }

  const partnerUnion = partnersOf(focus).find((u) => u.partner_1_id === target || u.partner_2_id === target);
  if (partnerUnion) {
    return {
      relationship_label: partnerUnion.status === 'spouse' ? 'spouse' : partnerUnion.status === 'ex-partner' || partnerUnion.status === 'divorced' ? 'ex-partner' : 'partner',
      generation_delta: 0,
      relationship_path: [focus, target],
      confidence: 1,
    };
  }

  const focusParentIds = new Set(parentsOf(focus).map((r) => r.parent_id));
  const targetParentIds = new Set(parentsOf(target).map((r) => r.parent_id));
  const sharedParents = [...focusParentIds].filter((id) => targetParentIds.has(id));
  if (sharedParents.length > 0) {
    const full = sharedParents.length >= 2;
    const p = people.get(target);
    return {
      relationship_label: full ? sexWord(p, 'brother', 'sister', 'sibling') : `half ${sexWord(p, 'brother', 'sister', 'sibling')}`,
      generation_delta: 0,
      relationship_path: [focus, ...sharedParents, target],
      confidence: 1,
    };
  }

  // grandparent / grandchild
  for (const fp of parentsOf(focus)) {
    const g = parentsOf(fp.parent_id).find((r) => r.parent_id === target);
    if (g) return { relationship_label: sexWord(people.get(target), 'grandfather', 'grandmother', 'grandparent'), generation_delta: 2, relationship_path: [focus, fp.parent_id, target], confidence: 1 };
  }
  for (const fc of childrenOf(focus)) {
    const g = childrenOf(fc.child_id).find((r) => r.child_id === target);
    if (g) return { relationship_label: sexWord(people.get(target), 'grandson', 'granddaughter', 'grandchild'), generation_delta: -2, relationship_path: [focus, fc.child_id, target], confidence: 1 };
  }

  // aunt/uncle and nephew/niece
  for (const fp of parentsOf(focus)) {
    const fpSibs = input.persons.filter((p) => {
      const pParents = new Set(parentsOf(p.id).map((r) => r.parent_id));
      const grandShared = [...pParents].some((pid) => parentsOf(focus).some((fr) => parentsOf(fr.parent_id).some((gr) => gr.parent_id === pid)));
      return grandShared;
    });
    if (fpSibs.some((s) => s.id === target)) return { relationship_label: sexWord(people.get(target), 'uncle', 'aunt', 'uncle/aunt'), generation_delta: 1, relationship_path: [focus, fp.parent_id, target], confidence: 0.8 };
  }

  for (const child of childrenOf(focus)) {
    const childSibs = input.persons.filter((p) => {
      const pParents = new Set(parentsOf(p.id).map((r) => r.parent_id));
      return [...pParents].some((pid) => parentsOf(child.child_id).some((cpr) => cpr.parent_id === pid));
    });
    if (childSibs.some((s) => s.id === target)) return { relationship_label: sexWord(people.get(target), 'nephew', 'niece', 'nephew/niece'), generation_delta: -1, relationship_path: [focus, child.child_id, target], confidence: 0.8 };
  }

  // in-law straightforward: sibling spouse or spouse sibling
  const focusSiblings = input.persons.filter((p) => p.id !== focus && [...new Set(parentsOf(focus).map((r) => r.parent_id))].some((pid) => parentsOf(p.id).some((r) => r.parent_id === pid)));
  for (const sib of focusSiblings) {
    if (partnersOf(sib.id).some((u) => (u.partner_1_id === target || u.partner_2_id === target))) {
      return { relationship_label: sexWord(people.get(target), 'brother-in-law', 'sister-in-law', 'sibling-in-law'), generation_delta: 0, relationship_path: [focus, sib.id, target], confidence: 0.85 };
    }
  }

  // cousins via nearest common ancestor
  const ancestors = (id: string, depth = 4, d = 0, out = new Map<string, number>()) => {
    if (d > depth) return out;
    for (const p of parentsOf(id)) {
      if (!out.has(p.parent_id) || d + 1 < out.get(p.parent_id)!) out.set(p.parent_id, d + 1);
      ancestors(p.parent_id, depth, d + 1, out);
    }
    return out;
  };

  const af = ancestors(focus);
  const at = ancestors(target);
  let best: { ancestor: string; a: number; b: number } | null = null;
  for (const [aId, distA] of af) {
    const distB = at.get(aId);
    if (!distB) continue;
    if (!best || distA + distB < best.a + best.b) best = { ancestor: aId, a: distA, b: distB };
  }
  if (best && best.a >= 2 && best.b >= 2) {
    const degree = Math.min(best.a, best.b) - 1;
    const removed = Math.abs(best.a - best.b);
    return { relationship_label: cousinLabel(degree, removed), generation_delta: best.a - best.b, relationship_path: [focus, best.ancestor, target], confidence: 0.9 };
  }

  if (edgesByPerson.get(focus)?.some((e) => e.kind === 'partner' && childrenOf(e.to).some((c) => c.child_id === target))) {
    return { relationship_label: 'step child', generation_delta: -1, relationship_path: [focus, target], confidence: 0.75 };
  }
  if (edgesByPerson.get(target)?.some((e) => e.kind === 'partner' && childrenOf(e.to).some((c) => c.child_id === focus))) {
    return { relationship_label: 'step parent', generation_delta: 1, relationship_path: [focus, target], confidence: 0.75 };
  }

  return { relationship_label: 'relative', generation_delta: 0, relationship_path: [focus, target], confidence: 0.3 };
}

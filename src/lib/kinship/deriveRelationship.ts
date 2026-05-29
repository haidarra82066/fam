import { buildGraph } from './buildGraph';
import { cousinLabel } from './cousins';
import { KinshipInput, ParentChildRelationship, ParentChildType, Person, RelationshipResult, UnionStatus } from './types';

function sexWord(p: Person | undefined, male: string, female: string, neutral: string) {
  if (!p?.sex || p.sex === 'unknown') return neutral;
  return p.sex === 'male' ? male : female;
}

function normalizedParentRole(role?: ParentChildType | null): ParentChildType {
  return role ?? 'unknown';
}

function parentLabel(person: Person | undefined, role?: ParentChildType | null) {
  const base = sexWord(person, 'father', 'mother', 'parent');
  const normalized = normalizedParentRole(role);

  if (normalized === 'adoptive') return `adoptive ${base}`;
  if (normalized === 'step') return 'step parent';
  if (normalized === 'foster') return 'foster parent';
  if (normalized === 'guardian') return 'guardian';
  if (normalized === 'donor') return `donor ${base}`;
  if (normalized === 'surrogate') return `surrogate ${base}`;
  return base;
}

function childLabel(person: Person | undefined, role?: ParentChildType | null) {
  const base = sexWord(person, 'son', 'daughter', 'child');
  const normalized = normalizedParentRole(role);

  if (normalized === 'adoptive') return `adoptive ${base}`;
  if (normalized === 'step') return 'step child';
  if (normalized === 'foster') return 'foster child';
  if (normalized === 'guardian') return 'ward';
  if (normalized === 'donor') return `donor-conceived ${base}`;
  if (normalized === 'surrogate') return `surrogate-born ${base}`;
  return base;
}

function normalizeUnionStatus(status?: UnionStatus | null) {
  if (status === 'spouse' || status === 'married') return 'spouse';
  if (status === 'ex-partner' || status === 'ex_partner') return 'ex-partner';
  if (status === 'divorced') return 'divorced partner';
  if (status === 'separated') return 'separated partner';
  if (status === 'co-parent' || status === 'co_parent') return 'co-parent';
  if (status === 'partner' || status === 'partnered') return 'partner';
  return 'relationship';
}

function ancestorLabel(person: Person | undefined, depth: number) {
  if (depth === 2) return sexWord(person, 'grandfather', 'grandmother', 'grandparent');
  const prefix = `${'great-'.repeat(Math.max(0, depth - 2))}grand`;
  return sexWord(person, `${prefix}father`, `${prefix}mother`, `${prefix}parent`);
}

function descendantLabel(person: Person | undefined, depth: number) {
  if (depth === 2) return sexWord(person, 'grandson', 'granddaughter', 'grandchild');
  const prefix = `${'great-'.repeat(Math.max(0, depth - 2))}grand`;
  return sexWord(person, `${prefix}son`, `${prefix}daughter`, `${prefix}child`);
}

function parentLinkLabel(relation: ParentChildRelationship) {
  const role = normalizedParentRole(relation.relation_type);
  return role === 'unknown' ? 'biological' : role;
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
    return {
      relationship_label: parentLabel(p, directParent.relation_type),
      generation_delta: 1,
      relationship_path: [focus, target],
      confidence: directParent.relation_type && directParent.relation_type !== 'biological' ? 0.9 : 1,
    };
  }

  const directChild = childrenOf(focus).find((r) => r.child_id === target);
  if (directChild) {
    const p = people.get(target);
    return {
      relationship_label: childLabel(p, directChild.relation_type),
      generation_delta: -1,
      relationship_path: [focus, target],
      confidence: directChild.relation_type && directChild.relation_type !== 'biological' ? 0.9 : 1,
    };
  }

  const partnerUnion = partnersOf(focus).find((u) => u.partner_1_id === target || u.partner_2_id === target);
  if (partnerUnion) {
    return {
      relationship_label: normalizeUnionStatus(partnerUnion.status),
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

  const ancestorsWithPath = (id: string, maxDepth = 8) => {
    const out = new Map<string, { depth: number; path: string[]; links: ParentChildRelationship[] }>();
    const walk = (currentId: string, path: string[], links: ParentChildRelationship[]) => {
      if (path.length > maxDepth + 1) return;
      for (const relation of parentsOf(currentId)) {
        if (path.includes(relation.parent_id)) continue;
        const nextPath = [...path, relation.parent_id];
        const nextLinks = [...links, relation];
        const previous = out.get(relation.parent_id);
        const depth = nextPath.length - 1;
        if (!previous || depth < previous.depth) {
          out.set(relation.parent_id, { depth, path: nextPath, links: nextLinks });
          walk(relation.parent_id, nextPath, nextLinks);
        }
      }
    };
    walk(id, [id], []);
    return out;
  };

  const descendantsWithPath = (id: string, maxDepth = 8) => {
    const out = new Map<string, { depth: number; path: string[]; links: ParentChildRelationship[] }>();
    const walk = (currentId: string, path: string[], links: ParentChildRelationship[]) => {
      if (path.length > maxDepth + 1) return;
      for (const relation of childrenOf(currentId)) {
        if (path.includes(relation.child_id)) continue;
        const nextPath = [...path, relation.child_id];
        const nextLinks = [...links, relation];
        const previous = out.get(relation.child_id);
        const depth = nextPath.length - 1;
        if (!previous || depth < previous.depth) {
          out.set(relation.child_id, { depth, path: nextPath, links: nextLinks });
          walk(relation.child_id, nextPath, nextLinks);
        }
      }
    };
    walk(id, [id], []);
    return out;
  };

  const directAncestor = ancestorsWithPath(focus).get(target);
  if (directAncestor && directAncestor.depth >= 2) {
    return {
      relationship_label: ancestorLabel(people.get(target), directAncestor.depth),
      generation_delta: directAncestor.depth,
      relationship_path: directAncestor.path,
      confidence: directAncestor.links.some((link) => parentLinkLabel(link) !== 'biological') ? 0.9 : 1,
    };
  }

  const directDescendant = descendantsWithPath(focus).get(target);
  if (directDescendant && directDescendant.depth >= 2) {
    return {
      relationship_label: descendantLabel(people.get(target), directDescendant.depth),
      generation_delta: -directDescendant.depth,
      relationship_path: directDescendant.path,
      confidence: directDescendant.links.some((link) => parentLinkLabel(link) !== 'biological') ? 0.9 : 1,
    };
  }

  // aunt/uncle and nephew/niece
  const sharedParentCount = (a: string, b: string) => {
    const aParents = new Set(parentsOf(a).map((r) => r.parent_id));
    return parentsOf(b).filter((r) => aParents.has(r.parent_id)).length;
  };

  const areSiblings = (a: string, b: string) => sharedParentCount(a, b) > 0;

  for (const fp of parentsOf(focus)) {
    const parentSiblingIds = input.persons
      .filter((p) => p.id !== fp.parent_id && areSiblings(p.id, fp.parent_id))
      .map((p) => p.id);

    if (parentSiblingIds.includes(target)) {
      return { relationship_label: sexWord(people.get(target), 'uncle', 'aunt', 'uncle/aunt'), generation_delta: 1, relationship_path: [focus, fp.parent_id, target], confidence: 0.9 };
    }

    for (const siblingId of parentSiblingIds) {
      const partnerOfParentSibling = partnersOf(siblingId).some((u) => u.partner_1_id === target || u.partner_2_id === target);
      const coParentWithParentSibling = childrenOf(siblingId).some((child) => parentsOf(child.child_id).some((r) => r.parent_id === target));

      if (partnerOfParentSibling || coParentWithParentSibling) {
        return { relationship_label: sexWord(people.get(target), 'uncle', 'aunt', 'uncle/aunt'), generation_delta: 1, relationship_path: [focus, fp.parent_id, siblingId, target], confidence: 0.85 };
      }
    }
  }

  for (const sibling of input.persons.filter((p) => p.id !== focus && areSiblings(p.id, focus))) {
    if (childrenOf(sibling.id).some((child) => child.child_id === target)) {
      return { relationship_label: sexWord(people.get(target), 'nephew', 'niece', 'nephew/niece'), generation_delta: -1, relationship_path: [focus, sibling.id, target], confidence: 0.9 };
    }
  }

  // in-law straightforward: sibling spouse or spouse sibling
  const focusSiblings = input.persons.filter((p) => p.id !== focus && [...new Set(parentsOf(focus).map((r) => r.parent_id))].some((pid) => parentsOf(p.id).some((r) => r.parent_id === pid)));
  const focusPartners = partnersOf(focus).map((union) => (union.partner_1_id === focus ? union.partner_2_id : union.partner_1_id));

  for (const sib of focusSiblings) {
    if (partnersOf(sib.id).some((u) => (u.partner_1_id === target || u.partner_2_id === target))) {
      return { relationship_label: sexWord(people.get(target), 'brother-in-law', 'sister-in-law', 'sibling-in-law'), generation_delta: 0, relationship_path: [focus, sib.id, target], confidence: 0.85 };
    }
  }

  for (const partnerId of focusPartners) {
    if (areSiblings(partnerId, target)) {
      return { relationship_label: sexWord(people.get(target), 'brother-in-law', 'sister-in-law', 'sibling-in-law'), generation_delta: 0, relationship_path: [focus, partnerId, target], confidence: 0.85 };
    }

    if (parentsOf(partnerId).some((relation) => relation.parent_id === target)) {
      return { relationship_label: sexWord(people.get(target), 'father-in-law', 'mother-in-law', 'parent-in-law'), generation_delta: 1, relationship_path: [focus, partnerId, target], confidence: 0.85 };
    }
  }

  for (const child of childrenOf(focus)) {
    if (partnersOf(child.child_id).some((union) => union.partner_1_id === target || union.partner_2_id === target)) {
      return { relationship_label: sexWord(people.get(target), 'son-in-law', 'daughter-in-law', 'child-in-law'), generation_delta: -1, relationship_path: [focus, child.child_id, target], confidence: 0.85 };
    }
  }

  // cousins via nearest common ancestor
  const ancestors = (id: string, depth = 8, d = 0, out = new Map<string, number>()) => {
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

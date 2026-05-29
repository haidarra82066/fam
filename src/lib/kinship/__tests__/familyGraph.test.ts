import { describe, expect, it } from 'vitest';
import {
  buildFamilyGraph,
  edgeStyleForFamilyEdge,
  edgeStyleForPartnerType,
  layoutFamilyGraph,
  relationshipEdgeStyles,
  siblingParentChildRelationships,
  type FamilyPerson,
  type FamilyRelationship,
} from '../familyGraph';

function people(ids: string[]): FamilyPerson[] {
  return ids.map((id, index) => ({ id, displayName: id, sortIndex: index }));
}

function layout(personIds: string[], relationships: FamilyRelationship[]) {
  const graph = buildFamilyGraph(people(personIds), relationships);
  const positioned = layoutFamilyGraph(graph);
  const node = (id: string) => {
    const found = positioned.personNodes.find((item) => item.id === id);
    if (!found) throw new Error(`Missing node ${id}`);
    return found;
  };

  return { graph, positioned, node };
}

describe('family graph derivation and layout', () => {
  it('places a single parent one generation above the child', () => {
    const { graph, node } = layout(['parent', 'child'], [
      { id: 'pc1', type: 'parent_child', parentId: 'parent', childId: 'child', parentRole: 'biological' },
    ]);

    expect(node('parent').generation).toBe(node('child').generation - 1);
    expect(node('parent').position.y).toBeLessThan(node('child').position.y);
    expect(graph.familyUnits).toHaveLength(1);
    expect(graph.edges.some((edge) => edge.kind === 'partner')).toBe(false);
  });

  it('uses a family unit for two parents and one child', () => {
    const { graph, node } = layout(['parent-a', 'parent-b', 'child'], [
      { id: 'pc1', type: 'parent_child', parentId: 'parent-a', childId: 'child', parentRole: 'biological' },
      { id: 'pc2', type: 'parent_child', parentId: 'parent-b', childId: 'child', parentRole: 'biological' },
      { id: 'u1', type: 'spouse', personAId: 'parent-a', personBId: 'parent-b' },
    ]);

    expect(node('parent-a').generation).toBe(node('parent-b').generation);
    expect(node('child').generation).toBe(node('parent-a').generation + 1);
    expect(graph.familyUnits).toHaveLength(1);
    expect(graph.familyUnits[0].parentIds).toEqual(['parent-a', 'parent-b']);
    expect(graph.edges.filter((edge) => edge.kind === 'parent_to_family')).toHaveLength(2);
    expect(graph.edges.filter((edge) => edge.kind === 'family_to_child')).toHaveLength(1);
    expect(graph.edges.some((edge) => edge.sourceId.startsWith('parent-') && edge.targetId === 'child')).toBe(false);
  });

  it('groups multiple siblings below the same family unit without sibling edges', () => {
    const { graph, node } = layout(['parent-a', 'parent-b', 'child-a', 'child-b'], [
      { id: 'pc1', type: 'parent_child', parentId: 'parent-a', childId: 'child-a', parentRole: 'biological' },
      { id: 'pc2', type: 'parent_child', parentId: 'parent-b', childId: 'child-a', parentRole: 'biological' },
      { id: 'pc3', type: 'parent_child', parentId: 'parent-a', childId: 'child-b', parentRole: 'biological' },
      { id: 'pc4', type: 'parent_child', parentId: 'parent-b', childId: 'child-b', parentRole: 'biological' },
    ]);

    expect(node('child-a').generation).toBe(node('child-b').generation);
    expect(node('child-a').position.y).toBe(node('child-b').position.y);
    expect(graph.familyUnits).toHaveLength(1);
    expect(graph.familyUnits[0].childIds).toEqual(['child-a', 'child-b']);
    expect(graph.edges.some((edge) => edge.sourceId === 'child-a' && edge.targetId === 'child-b')).toBe(false);
    expect(graph.edges.some((edge) => edge.sourceId === 'child-b' && edge.targetId === 'child-a')).toBe(false);
  });

  it('keeps partner and spouse relationships on the same generation with distinct styles', () => {
    const { graph, node } = layout(['person-a', 'person-b', 'person-c'], [
      { id: 'u1', type: 'spouse', personAId: 'person-a', personBId: 'person-b' },
      { id: 'u2', type: 'ex_partner', personAId: 'person-a', personBId: 'person-c' },
    ]);

    expect(node('person-a').generation).toBe(node('person-b').generation);
    expect(node('person-a').position.y).toBe(node('person-b').position.y);
    expect(graph.edges.filter((edge) => edge.kind === 'partner')).toHaveLength(2);
    expect(edgeStyleForPartnerType('spouse')).not.toEqual(edgeStyleForPartnerType('partner'));
    expect('strokeDasharray' in edgeStyleForPartnerType('ex_partner')).toBe(true);
  });

  it('derives add-sibling semantics from shared parents', () => {
    const relationships: FamilyRelationship[] = [
      { id: 'pc1', type: 'parent_child', parentId: 'parent-a', childId: 'child-a', parentRole: 'biological' },
      { id: 'pc2', type: 'parent_child', parentId: 'parent-b', childId: 'child-a', parentRole: 'biological' },
    ];

    const siblingLinks = siblingParentChildRelationships({ targetId: 'child-a', siblingId: 'child-b', relationships });
    const { graph, node } = layout(['parent-a', 'parent-b', 'child-a', 'child-b'], [...relationships, ...siblingLinks]);

    expect(siblingLinks.map((link) => [link.parentId, link.childId])).toEqual([
      ['parent-a', 'child-b'],
      ['parent-b', 'child-b'],
    ]);
    expect(node('child-a').generation).toBe(node('child-b').generation);
    expect(graph.edges.some((edge) => edge.sourceId === 'child-a' && edge.targetId === 'child-b')).toBe(false);
  });

  it.each(['adoptive', 'foster', 'step', 'guardian'] as const)('keeps %s parents above children with distinct edge styling', (role) => {
    const { graph, node } = layout(['parent', 'child'], [
      { id: 'pc1', type: 'parent_child', parentId: 'parent', childId: 'child', parentRole: role },
    ]);

    const edge = graph.edges.find((item) => item.kind === 'parent_to_family');
    expect(edge).toBeDefined();
    expect(node('parent').generation).toBe(node('child').generation - 1);
    expect('strokeDasharray' in edgeStyleForFamilyEdge(edge!)).toBe(true);
    expect(edgeStyleForFamilyEdge(edge!)).not.toEqual(relationshipEdgeStyles.biological_parent_child);
  });

  it('lays out selected-style family data with parents above, partner beside, child below', () => {
    const { graph, node } = layout(['parent-a', 'parent-b', 'selected', 'partner', 'child'], [
      { id: 'pc1', type: 'parent_child', parentId: 'parent-a', childId: 'selected', parentRole: 'biological' },
      { id: 'pc2', type: 'parent_child', parentId: 'parent-b', childId: 'selected', parentRole: 'biological' },
      { id: 'u1', type: 'partner', personAId: 'selected', personBId: 'partner' },
      { id: 'pc3', type: 'parent_child', parentId: 'selected', childId: 'child', parentRole: 'biological' },
      { id: 'pc4', type: 'parent_child', parentId: 'partner', childId: 'child', parentRole: 'biological' },
    ]);

    expect(node('parent-a').position.y).toBeLessThan(node('selected').position.y);
    expect(node('parent-b').position.y).toBeLessThan(node('selected').position.y);
    expect(node('partner').generation).toBe(node('selected').generation);
    expect(node('child').generation).toBe(node('selected').generation + 1);
    expect(graph.familyUnits).toHaveLength(2);
  });
});

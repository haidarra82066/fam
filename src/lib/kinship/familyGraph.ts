export type ParentRole =
  | 'biological'
  | 'adoptive'
  | 'foster'
  | 'step'
  | 'guardian'
  | 'unknown'
  | (string & {});

export type PartnerRelationshipType = 'partner' | 'spouse' | 'ex_partner';

export type FamilyPerson = {
  id: string;
  displayName: string;
  gender?: string | null;
  sortIndex?: number;
};

export type PartnerRelationship = {
  id: string;
  type: PartnerRelationshipType;
  personAId: string;
  personBId: string;
};

export type ParentChildRelationship = {
  id: string;
  type: 'parent_child';
  parentId: string;
  childId: string;
  parentRole?: ParentRole | null;
  unionId?: string | null;
};

export type FamilyRelationship = PartnerRelationship | ParentChildRelationship;

export type FamilyUnit = {
  id: string;
  parentIds: string[];
  childIds: string[];
  parentRoleByParentId: Record<string, ParentRole>;
  childParentRoles: Record<string, ParentRole[]>;
  relationshipIdsByChildId: Record<string, string[]>;
};

export type FamilyGraphEdge =
  | {
      id: string;
      kind: 'partner';
      sourceId: string;
      targetId: string;
      relationshipType: PartnerRelationshipType;
      relationshipId: string;
    }
  | {
      id: string;
      kind: 'parent_to_family';
      sourceId: string;
      targetId: string;
      parentRole: ParentRole;
      parentId: string;
      familyUnitId: string;
    }
  | {
      id: string;
      kind: 'family_to_child';
      sourceId: string;
      targetId: string;
      parentRoles: ParentRole[];
      childId: string;
      familyUnitId: string;
      relationshipIds: string[];
    };

export type FamilyGraph = {
  persons: FamilyPerson[];
  relationships: FamilyRelationship[];
  familyUnits: FamilyUnit[];
  edges: FamilyGraphEdge[];
  parentsByChild: Map<string, ParentChildRelationship[]>;
  childrenByParent: Map<string, ParentChildRelationship[]>;
  partnerRelationships: PartnerRelationship[];
};

export type PositionedFamilyPersonNode = {
  kind: 'person';
  id: string;
  person: FamilyPerson;
  position: { x: number; y: number };
  width: number;
  height: number;
  generation: number;
};

export type PositionedFamilyUnitNode = {
  kind: 'familyUnit';
  id: string;
  familyUnit: FamilyUnit;
  position: { x: number; y: number };
  width: number;
  height: number;
  generation: number;
};

export type PositionedFamilyGraph = {
  personNodes: PositionedFamilyPersonNode[];
  familyUnitNodes: PositionedFamilyUnitNode[];
  edges: FamilyGraphEdge[];
  generationsByPersonId: Map<string, number>;
};

export type DbUnionRow = {
  id: string;
  partner1_id: string;
  partner2_id?: string | null;
  union_type?: string | null;
};

export type DbParentChildRow = {
  id: string;
  parent_id: string;
  child_id: string;
  parent_role?: string | null;
  union_id?: string | null;
};

export const FAMILY_LAYOUT = {
  personWidth: 220,
  personHeight: 112,
  junctionSize: 14,
  generationGap: 240,
  partnerSpacing: 56,
  siblingSpacing: 72,
  blockSpacing: 132,
};

export const relationshipEdgeStyles = {
  spouse: {
    stroke: '#c77d73',
    strokeWidth: 2,
  },
  partner: {
    stroke: '#c77d73',
    strokeWidth: 2,
    strokeDasharray: '4 2',
  },
  ex_partner: {
    stroke: '#b98983',
    strokeWidth: 1.5,
    strokeDasharray: '6 4',
  },
  biological_parent_child: {
    stroke: '#8daaa7',
    strokeWidth: 2,
  },
  adoptive_parent_child: {
    stroke: '#789d99',
    strokeWidth: 2,
    strokeDasharray: '6 3',
  },
  foster_parent_child: {
    stroke: '#789d99',
    strokeWidth: 2,
    strokeDasharray: '2 3',
  },
  step_parent_child: {
    stroke: '#789d99',
    strokeWidth: 2,
    strokeDasharray: '8 3 2 3',
  },
  guardian_parent_child: {
    stroke: '#8aa6a3',
    strokeWidth: 1.5,
    strokeDasharray: '3 4',
  },
  unknown_parent_child: {
    stroke: '#9fb6b3',
    strokeWidth: 1.6,
    strokeDasharray: '5 4',
  },
} as const;

class DisjointSet {
  private readonly parent = new Map<string, string>();

  constructor(ids: string[]) {
    for (const id of ids) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id);
    if (!parent || parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    const winner = rootA.localeCompare(rootB) <= 0 ? rootA : rootB;
    const loser = winner === rootA ? rootB : rootA;
    this.parent.set(loser, winner);
  }
}

function sortKey(person: FamilyPerson) {
  return `${String(person.sortIndex ?? 999999).padStart(6, '0')}|${person.displayName.toLocaleLowerCase()}|${person.id}`;
}

function sortPeople(a: FamilyPerson, b: FamilyPerson) {
  return sortKey(a).localeCompare(sortKey(b));
}

function roleKey(role: ParentRole | null | undefined): ParentRole {
  return role || 'unknown';
}

function dominantParentRole(roles: ParentRole[]): ParentRole {
  const normalized = roles.map(roleKey);
  const nonUnknown = normalized.filter((role) => role !== 'unknown');
  const nonBiological = nonUnknown.find((role) => role !== 'biological');
  return nonBiological ?? nonUnknown[0] ?? 'unknown';
}

export function normalizeUnionType(unionType?: string | null): PartnerRelationshipType {
  if (unionType === 'married') return 'spouse';
  if (unionType === 'ex_partner' || unionType === 'divorced' || unionType === 'separated') return 'ex_partner';
  return 'partner';
}

export function relationshipsFromRows(input: {
  unions: DbUnionRow[];
  parentChild: DbParentChildRow[];
}): FamilyRelationship[] {
  return [
    ...input.parentChild.map((relation) => ({
      id: relation.id,
      type: 'parent_child' as const,
      parentId: relation.parent_id,
      childId: relation.child_id,
      parentRole: roleKey(relation.parent_role),
      unionId: relation.union_id ?? null,
    })),
    ...input.unions
      .filter((union) => Boolean(union.partner2_id))
      .map((union) => ({
        id: union.id,
        type: normalizeUnionType(union.union_type),
        personAId: union.partner1_id,
        personBId: union.partner2_id as string,
      })),
  ];
}

export function parentRoleLabel(role?: ParentRole | null) {
  const normalized = roleKey(role);
  if (normalized === 'biological') return undefined;
  return normalized.replace(/_/g, ' ');
}

export function edgeStyleForParentRole(role?: ParentRole | null) {
  const normalized = roleKey(role);
  if (normalized === 'adoptive') return relationshipEdgeStyles.adoptive_parent_child;
  if (normalized === 'foster') return relationshipEdgeStyles.foster_parent_child;
  if (normalized === 'step') return relationshipEdgeStyles.step_parent_child;
  if (normalized === 'guardian') return relationshipEdgeStyles.guardian_parent_child;
  if (normalized === 'biological') return relationshipEdgeStyles.biological_parent_child;
  return relationshipEdgeStyles.unknown_parent_child;
}

export function edgeStyleForPartnerType(type: PartnerRelationshipType) {
  return relationshipEdgeStyles[type];
}

export function edgeStyleForFamilyEdge(edge: FamilyGraphEdge) {
  if (edge.kind === 'partner') return edgeStyleForPartnerType(edge.relationshipType);
  if (edge.kind === 'parent_to_family') return edgeStyleForParentRole(edge.parentRole);
  return edgeStyleForParentRole(dominantParentRole(edge.parentRoles));
}

export function buildFamilyGraph(persons: FamilyPerson[], relationships: FamilyRelationship[]): FamilyGraph {
  const normalizedPersons = persons
    .map((person, index) => ({
      ...person,
      displayName: person.displayName || person.id,
      sortIndex: person.sortIndex ?? index,
    }))
    .sort(sortPeople);
  const personIds = new Set(normalizedPersons.map((person) => person.id));
  const parentsByChild = new Map<string, ParentChildRelationship[]>();
  const childrenByParent = new Map<string, ParentChildRelationship[]>();
  const partnerRelationships: PartnerRelationship[] = [];

  const parentChildRelationships = relationships.filter((relationship): relationship is ParentChildRelationship => {
    return (
      relationship.type === 'parent_child' &&
      relationship.parentId !== relationship.childId &&
      personIds.has(relationship.parentId) &&
      personIds.has(relationship.childId)
    );
  });

  for (const relationship of parentChildRelationships) {
    const normalized = { ...relationship, parentRole: roleKey(relationship.parentRole) };
    const parents = parentsByChild.get(normalized.childId) ?? [];
    parents.push(normalized);
    parentsByChild.set(normalized.childId, parents);

    const children = childrenByParent.get(normalized.parentId) ?? [];
    children.push(normalized);
    childrenByParent.set(normalized.parentId, children);
  }

  for (const relationship of relationships) {
    if (
      relationship.type !== 'parent_child' &&
      relationship.personAId !== relationship.personBId &&
      personIds.has(relationship.personAId) &&
      personIds.has(relationship.personBId)
    ) {
      partnerRelationships.push(relationship);
    }
  }

  const familyUnitsByKey = new Map<string, FamilyUnit>();

  for (const person of normalizedPersons) {
    const parents = (parentsByChild.get(person.id) ?? [])
      .slice()
      .sort((a, b) => sortKey(normalizedPersons.find((candidate) => candidate.id === a.parentId)!).localeCompare(sortKey(normalizedPersons.find((candidate) => candidate.id === b.parentId)!)));

    if (!parents.length) continue;

    const parentIds = parents.map((parent) => parent.parentId);
    const key = parentIds.join('|');
    const unit =
      familyUnitsByKey.get(key) ??
      ({
        id: `family:${key}`,
        parentIds,
        childIds: [],
        parentRoleByParentId: {},
        childParentRoles: {},
        relationshipIdsByChildId: {},
      } satisfies FamilyUnit);

    unit.childIds.push(person.id);
    unit.childParentRoles[person.id] = parents.map((parent) => roleKey(parent.parentRole));
    unit.relationshipIdsByChildId[person.id] = parents.map((parent) => parent.id);

    for (const parentId of parentIds) {
      const roles = [
        ...(unit.parentRoleByParentId[parentId] ? [unit.parentRoleByParentId[parentId]] : []),
        ...parents.filter((parent) => parent.parentId === parentId).map((parent) => roleKey(parent.parentRole)),
      ];
      unit.parentRoleByParentId[parentId] = dominantParentRole(roles);
    }

    familyUnitsByKey.set(key, unit);
  }

  const familyUnits = Array.from(familyUnitsByKey.values()).sort((a, b) => a.id.localeCompare(b.id));
  for (const unit of familyUnits) {
    unit.childIds.sort((a, b) => {
      const personA = normalizedPersons.find((person) => person.id === a);
      const personB = normalizedPersons.find((person) => person.id === b);
      if (!personA || !personB) return a.localeCompare(b);
      return sortPeople(personA, personB);
    });
  }

  const edges: FamilyGraphEdge[] = [];

  for (const relationship of partnerRelationships.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    edges.push({
      id: `partner:${relationship.id}`,
      kind: 'partner',
      sourceId: relationship.personAId,
      targetId: relationship.personBId,
      relationshipType: relationship.type,
      relationshipId: relationship.id,
    });
  }

  for (const unit of familyUnits) {
    for (const parentId of unit.parentIds) {
      edges.push({
        id: `${unit.id}:parent:${parentId}`,
        kind: 'parent_to_family',
        sourceId: parentId,
        targetId: unit.id,
        parentRole: unit.parentRoleByParentId[parentId] ?? 'unknown',
        parentId,
        familyUnitId: unit.id,
      });
    }

    for (const childId of unit.childIds) {
      edges.push({
        id: `${unit.id}:child:${childId}`,
        kind: 'family_to_child',
        sourceId: unit.id,
        targetId: childId,
        parentRoles: unit.childParentRoles[childId] ?? ['unknown'],
        childId,
        familyUnitId: unit.id,
        relationshipIds: unit.relationshipIdsByChildId[childId] ?? [],
      });
    }
  }

  return {
    persons: normalizedPersons,
    relationships,
    familyUnits,
    edges,
    parentsByChild,
    childrenByParent,
    partnerRelationships,
  };
}

export function siblingParentChildRelationships(input: {
  targetId: string;
  siblingId: string;
  relationships: FamilyRelationship[];
}): ParentChildRelationship[] {
  return input.relationships
    .filter((relationship): relationship is ParentChildRelationship => relationship.type === 'parent_child' && relationship.childId === input.targetId)
    .map((relationship) => ({
      ...relationship,
      id: `sibling:${relationship.id}:${input.siblingId}`,
      childId: input.siblingId,
    }));
}

export function layoutFamilyGraph(graph: FamilyGraph): PositionedFamilyGraph {
  const peopleById = new Map(graph.persons.map((person) => [person.id, person]));
  const dsu = new DisjointSet(graph.persons.map((person) => person.id));

  for (const relationship of graph.partnerRelationships) {
    dsu.union(relationship.personAId, relationship.personBId);
  }

  for (const unit of graph.familyUnits) {
    const [firstParent, ...rest] = unit.parentIds;
    for (const parentId of rest) dsu.union(firstParent, parentId);
  }

  const compByPersonId = new Map(graph.persons.map((person) => [person.id, dsu.find(person.id)]));
  const compMembers = new Map<string, FamilyPerson[]>();

  for (const person of graph.persons) {
    const compId = compByPersonId.get(person.id) ?? person.id;
    const members = compMembers.get(compId) ?? [];
    members.push(person);
    compMembers.set(compId, members);
  }

  for (const members of compMembers.values()) members.sort(sortPeople);

  const compGeneration = new Map<string, number>();
  for (const compId of compMembers.keys()) compGeneration.set(compId, 0);

  const parentChildRelationships = graph.relationships.filter(
    (relationship): relationship is ParentChildRelationship => relationship.type === 'parent_child',
  );

  const maxPasses = Math.max(1, compMembers.size);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const relationship of parentChildRelationships) {
      const parentComp = compByPersonId.get(relationship.parentId);
      const childComp = compByPersonId.get(relationship.childId);
      if (!parentComp || !childComp || parentComp === childComp) continue;
      const requiredChildGeneration = (compGeneration.get(parentComp) ?? 0) + 1;
      if ((compGeneration.get(childComp) ?? 0) < requiredChildGeneration) {
        compGeneration.set(childComp, requiredChildGeneration);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const minGeneration = Math.min(0, ...Array.from(compGeneration.values()));
  if (minGeneration !== 0) {
    for (const [compId, generation] of compGeneration) compGeneration.set(compId, generation - minGeneration);
  }

  const generationByPersonId = new Map<string, number>();
  for (const person of graph.persons) {
    generationByPersonId.set(person.id, compGeneration.get(compByPersonId.get(person.id) ?? person.id) ?? 0);
  }

  const compsByGeneration = new Map<number, string[]>();
  for (const [compId, members] of compMembers) {
    const generation = compGeneration.get(compId) ?? 0;
    const comps = compsByGeneration.get(generation) ?? [];
    comps.push(compId);
    compsByGeneration.set(generation, comps);
    members.sort(sortPeople);
  }

  const compSort = (a: string, b: string) => {
    const personA = compMembers.get(a)?.[0];
    const personB = compMembers.get(b)?.[0];
    if (!personA || !personB) return a.localeCompare(b);
    return sortPeople(personA, personB);
  };

  for (const comps of compsByGeneration.values()) comps.sort(compSort);

  const personPositions = new Map<string, { x: number; y: number }>();
  const familyUnitPositions = new Map<string, { x: number; y: number; generation: number }>();
  const unitById = new Map(graph.familyUnits.map((unit) => [unit.id, unit]));
  const generations = Array.from(compsByGeneration.keys()).sort((a, b) => a - b);

  function compWidth(compId: string) {
    const members = compMembers.get(compId) ?? [];
    if (!members.length) return 0;
    return members.length * FAMILY_LAYOUT.personWidth + (members.length - 1) * FAMILY_LAYOUT.partnerSpacing;
  }

  function blockWidth(compIds: string[]) {
    return compIds.reduce((total, compId, index) => total + compWidth(compId) + (index ? FAMILY_LAYOUT.siblingSpacing : 0), 0);
  }

  function placeComp(compId: string, left: number, y: number) {
    let cursor = left;
    for (const member of compMembers.get(compId) ?? []) {
      personPositions.set(member.id, { x: cursor, y });
      cursor += FAMILY_LAYOUT.personWidth + FAMILY_LAYOUT.partnerSpacing;
    }
  }

  function familyUnitCenter(unit: FamilyUnit) {
    const parentCenters = unit.parentIds
      .map((parentId) => personPositions.get(parentId))
      .filter((position): position is { x: number; y: number } => Boolean(position))
      .map((position) => position.x + FAMILY_LAYOUT.personWidth / 2);

    if (parentCenters.length) {
      return parentCenters.reduce((total, value) => total + value, 0) / parentCenters.length;
    }

    const childCenters = unit.childIds
      .map((childId) => personPositions.get(childId))
      .filter((position): position is { x: number; y: number } => Boolean(position))
      .map((position) => position.x + FAMILY_LAYOUT.personWidth / 2);

    if (childCenters.length) {
      return childCenters.reduce((total, value) => total + value, 0) / childCenters.length;
    }

    return 0;
  }

  type LayoutBlock = {
    compIds: string[];
    width: number;
    desiredCenter?: number;
    sortValue: string;
  };

  for (const generation of generations) {
    const compIds = compsByGeneration.get(generation) ?? [];
    const assignedComps = new Set<string>();
    const blocks: LayoutBlock[] = [];

    for (const unit of graph.familyUnits) {
      const childComps = Array.from(
        new Set(
          unit.childIds
            .map((childId) => compByPersonId.get(childId))
            .filter((compId): compId is string => {
              if (!compId) return false;
              return (compGeneration.get(compId) ?? 0) === generation;
            }),
        ),
      )
        .filter((compId) => !assignedComps.has(compId))
        .sort(compSort);

      if (!childComps.length) continue;

      for (const compId of childComps) assignedComps.add(compId);

      const positionedUnit = familyUnitPositions.get(unit.id);
      blocks.push({
        compIds: childComps,
        width: blockWidth(childComps),
        desiredCenter: positionedUnit ? positionedUnit.x + FAMILY_LAYOUT.junctionSize / 2 : undefined,
        sortValue: unit.id,
      });
    }

    for (const compId of compIds) {
      if (assignedComps.has(compId)) continue;
      blocks.push({
        compIds: [compId],
        width: compWidth(compId),
        sortValue: compMembers.get(compId)?.[0] ? sortKey(compMembers.get(compId)![0]) : compId,
      });
    }

    blocks.sort((a, b) => {
      if (a.desiredCenter !== undefined && b.desiredCenter !== undefined) return a.desiredCenter - b.desiredCenter || a.sortValue.localeCompare(b.sortValue);
      if (a.desiredCenter !== undefined) return -1;
      if (b.desiredCenter !== undefined) return 1;
      return a.sortValue.localeCompare(b.sortValue);
    });

    const y = generation * FAMILY_LAYOUT.generationGap;

    if (!blocks.some((block) => block.desiredCenter !== undefined)) {
      const totalWidth = blocks.reduce((total, block, index) => total + block.width + (index ? FAMILY_LAYOUT.blockSpacing : 0), 0);
      let cursor = -totalWidth / 2;
      for (const block of blocks) {
        let blockCursor = cursor;
        for (const compId of block.compIds) {
          placeComp(compId, blockCursor, y);
          blockCursor += compWidth(compId) + FAMILY_LAYOUT.siblingSpacing;
        }
        cursor += block.width + FAMILY_LAYOUT.blockSpacing;
      }
    } else {
      let cursor: number | null = null;
      for (const block of blocks) {
        let left: number = block.desiredCenter !== undefined ? block.desiredCenter - block.width / 2 : cursor !== null ? cursor + FAMILY_LAYOUT.blockSpacing : -block.width / 2;
        if (cursor !== null && left < cursor + FAMILY_LAYOUT.blockSpacing) left = cursor + FAMILY_LAYOUT.blockSpacing;

        let blockCursor = left;
        for (const compId of block.compIds) {
          placeComp(compId, blockCursor, y);
          blockCursor += compWidth(compId) + FAMILY_LAYOUT.siblingSpacing;
        }
        cursor = left + block.width;
      }
    }

    for (const unit of graph.familyUnits) {
      const parentGenerations = unit.parentIds.map((parentId) => generationByPersonId.get(parentId) ?? 0);
      if (!parentGenerations.length || Math.min(...parentGenerations) !== generation) continue;
      const centerX = familyUnitCenter(unit);
      familyUnitPositions.set(unit.id, {
        x: centerX - FAMILY_LAYOUT.junctionSize / 2,
        y: y + FAMILY_LAYOUT.personHeight / 2 - FAMILY_LAYOUT.junctionSize / 2,
        generation,
      });
    }
  }

  for (const unit of graph.familyUnits) {
    if (familyUnitPositions.has(unit.id)) continue;
    const parentGeneration = Math.min(...unit.parentIds.map((parentId) => generationByPersonId.get(parentId) ?? 0));
    familyUnitPositions.set(unit.id, {
      x: familyUnitCenter(unit) - FAMILY_LAYOUT.junctionSize / 2,
      y: parentGeneration * FAMILY_LAYOUT.generationGap + FAMILY_LAYOUT.personHeight / 2 - FAMILY_LAYOUT.junctionSize / 2,
      generation: parentGeneration,
    });
  }

  return {
    personNodes: graph.persons.map((person) => ({
      kind: 'person',
      id: person.id,
      person,
      position: personPositions.get(person.id) ?? { x: 0, y: 0 },
      width: FAMILY_LAYOUT.personWidth,
      height: FAMILY_LAYOUT.personHeight,
      generation: generationByPersonId.get(person.id) ?? 0,
    })),
    familyUnitNodes: Array.from(familyUnitPositions.entries())
      .map(([id, position]) => ({
        kind: 'familyUnit' as const,
        id,
        familyUnit: unitById.get(id)!,
        position: { x: position.x, y: position.y },
        width: FAMILY_LAYOUT.junctionSize,
        height: FAMILY_LAYOUT.junctionSize,
        generation: position.generation,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: graph.edges,
    generationsByPersonId: generationByPersonId,
  };
}

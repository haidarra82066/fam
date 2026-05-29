import { deriveRelationships } from './deriveRelationship';
import type { KinshipInput, ParentChildType, UnionStatus } from './types';

export type DbKinshipPersonRow = {
  id: string;
  display_name?: string | null;
  gender?: string | null;
};

export type DbKinshipUnionRow = {
  id: string;
  partner1_id: string;
  partner2_id?: string | null;
  union_type?: string | null;
};

export type DbKinshipParentChildRow = {
  id: string;
  parent_id: string;
  child_id: string;
  parent_role?: string | null;
};

function sexFromGender(gender?: string | null) {
  const normalized = gender?.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'man' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'woman' || normalized === 'f') return 'female';
  return 'unknown';
}

function parentRoleFromDb(role?: string | null): ParentChildType {
  if (
    role === 'biological' ||
    role === 'adoptive' ||
    role === 'step' ||
    role === 'foster' ||
    role === 'guardian' ||
    role === 'donor' ||
    role === 'surrogate' ||
    role === 'unknown'
  ) {
    return role;
  }

  return 'unknown';
}

function unionStatusFromDb(status?: string | null): UnionStatus {
  if (status === 'married') return 'spouse';
  if (status === 'partnered') return 'partner';
  if (status === 'ex_partner') return 'ex-partner';
  if (status === 'co_parent') return 'co-parent';
  if (
    status === 'partner' ||
    status === 'spouse' ||
    status === 'ex-partner' ||
    status === 'divorced' ||
    status === 'separated' ||
    status === 'unknown'
  ) {
    return status;
  }

  return 'unknown';
}

export function kinshipInputFromDbRows(input: {
  persons: DbKinshipPersonRow[];
  unions: DbKinshipUnionRow[];
  parentChild: DbKinshipParentChildRow[];
  focusPersonId: string;
}): KinshipInput {
  return {
    focusPersonId: input.focusPersonId,
    persons: input.persons.map((person) => ({
      id: person.id,
      display_name: person.display_name ?? undefined,
      sex: sexFromGender(person.gender),
    })),
    unions: input.unions
      .filter((union) => Boolean(union.partner2_id))
      .map((union) => ({
        id: union.id,
        partner_1_id: union.partner1_id,
        partner_2_id: union.partner2_id as string,
        status: unionStatusFromDb(union.union_type),
      })),
    parent_child_relationships: input.parentChild.map((relation) => ({
      id: relation.id,
      parent_id: relation.parent_id,
      child_id: relation.child_id,
      relation_type: parentRoleFromDb(relation.parent_role),
    })),
  };
}

export function deriveRelationshipsFromDbRows(input: Parameters<typeof kinshipInputFromDbRows>[0]) {
  return deriveRelationships(kinshipInputFromDbRows(input));
}

export type Sex = 'male' | 'female' | 'unknown';

export type ParentChildType =
  | 'biological'
  | 'adoptive'
  | 'step'
  | 'foster'
  | 'guardian'
  | 'unknown';

export type UnionStatus = 'partner' | 'spouse' | 'ex-partner' | 'divorced' | 'unknown';

export interface Person {
  id: string;
  display_name?: string;
  sex?: Sex | null;
}

export interface Union {
  id: string;
  partner_1_id: string;
  partner_2_id: string;
  status?: UnionStatus | null;
}

export interface ParentChildRelationship {
  id: string;
  parent_id: string;
  child_id: string;
  relation_type?: ParentChildType | null;
}

export interface KinshipInput {
  persons: Person[];
  unions: Union[];
  parent_child_relationships: ParentChildRelationship[];
  focusPersonId: string;
}

export interface RelationshipResult {
  relationship_label: string;
  generation_delta: number;
  relationship_path: string[];
  confidence: number;
}

export interface KinshipEdge {
  to: string;
  kind: 'parent' | 'child' | 'partner';
  relationType?: string;
  unionStatus?: string;
}

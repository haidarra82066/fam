'use client';

import { useEffect, useMemo, useState } from 'react';
import * as ReactFlowLib from '@xyflow/react';
import {
  Baby,
  Heart,
  Lock,
  Search,
  Sparkles,
  UserPlus,
  Users,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ReactFlow = (ReactFlowLib as any).ReactFlow;
const Background = (ReactFlowLib as any).Background;
const Controls = (ReactFlowLib as any).Controls;
const Handle = (ReactFlowLib as any).Handle;
const MiniMap = (ReactFlowLib as any).MiniMap;
const Position = (ReactFlowLib as any).Position;
const ReactFlowProvider = (ReactFlowLib as any).ReactFlowProvider;
const useReactFlow = (ReactFlowLib as any).useReactFlow as () => {
  fitView: (options?: Record<string, unknown>) => void;
  setCenter: (x: number, y: number, options?: Record<string, unknown>) => void;
};

type Person = {
  id: string;
  tree_id: string;
  display_name: string;
  given_names?: string | null;
  surname_now?: string | null;
  surname_at_birth?: string | null;
  nickname?: string | null;
  gender?: string | null;
  living_status?: 'living' | 'deceased' | 'unknown' | string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  death_date?: string | null;
  death_place?: string | null;
  profession?: string | null;
  education?: string | null;
  short_bio?: string | null;
  notes?: string | null;
  photo_path?: string | null;
  is_private?: boolean | null;
};

type ParentChild = {
  id: string;
  parent_id: string;
  child_id: string;
  parent_role?: string | null;
  union_id?: string | null;
};

type Union = {
  id: string;
  partner1_id: string;
  partner2_id?: string | null;
  union_type?: string | null;
};

type CreateDialog =
  | { mode: 'first_person'; targetId?: undefined }
  | { mode: RelationshipMode; targetId: string }
  | { mode: 'existing'; targetId: string };

type RelationshipMode =
  | 'father'
  | 'mother'
  | 'parent'
  | 'child'
  | 'partner'
  | 'spouse'
  | 'ex_partner'
  | 'sibling'
  | 'adoptive_parent'
  | 'step_parent'
  | 'foster_parent'
  | 'guardian';

type Props = {
  persons: Person[];
  unions: Union[];
  parentChild: ParentChild[];
  treeId: string;
  canEdit: boolean;
  createPersonAction: (formData: FormData) => void | Promise<void>;
  updatePersonAction: (formData: FormData) => void | Promise<void>;
};

const nodeTypes = { personBubble: PersonBubbleNode };

const relationshipActions: Array<{ mode: RelationshipMode; label: string; icon: typeof UserPlus }> = [
  { mode: 'father', label: 'Add father', icon: UserPlus },
  { mode: 'mother', label: 'Add mother', icon: UserPlus },
  { mode: 'parent', label: 'Add parent', icon: UserPlus },
  { mode: 'child', label: 'Add child', icon: Baby },
  { mode: 'partner', label: 'Add partner', icon: Heart },
  { mode: 'spouse', label: 'Add spouse', icon: Heart },
  { mode: 'ex_partner', label: 'Add ex-partner', icon: Heart },
  { mode: 'sibling', label: 'Add sibling', icon: Users },
  { mode: 'adoptive_parent', label: 'Add adoptive parent', icon: UserPlus },
  { mode: 'step_parent', label: 'Add step parent', icon: UserPlus },
  { mode: 'foster_parent', label: 'Add foster parent', icon: UserPlus },
  { mode: 'guardian', label: 'Add guardian', icon: UserPlus },
];

const dialogTitles: Record<RelationshipMode | 'first_person' | 'existing', string> = {
  first_person: 'Add first person',
  father: 'Add father',
  mother: 'Add mother',
  parent: 'Add parent',
  child: 'Add child',
  partner: 'Add partner',
  spouse: 'Add spouse',
  ex_partner: 'Add ex-partner',
  sibling: 'Add sibling',
  adoptive_parent: 'Add adoptive parent',
  step_parent: 'Add step parent',
  foster_parent: 'Add foster parent',
  guardian: 'Add guardian',
  existing: 'Add existing person as relative',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function year(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 4);
}

function lifeYears(person: Person) {
  const birth = year(person.birth_date);
  const death = year(person.death_date);
  if (birth && death) return `${birth} to ${death}`;
  if (birth) return `born ${birth}`;
  if (death) return `died ${death}`;
  return 'Life dates unknown';
}

function partnerName(union: Union, selectedId: string, personById: Map<string, Person>) {
  const partnerId = union.partner1_id === selectedId ? union.partner2_id : union.partner1_id;
  return partnerId ? personById.get(partnerId)?.display_name ?? 'Unknown partner' : 'Unknown partner';
}

function createRelationshipIndexes(parentChild: ParentChild[]) {
  const parentsByChild = new Map<string, ParentChild[]>();
  const childrenByParent = new Map<string, ParentChild[]>();

  for (const relation of parentChild) {
    const parents = parentsByChild.get(relation.child_id) ?? [];
    parents.push(relation);
    parentsByChild.set(relation.child_id, parents);

    const children = childrenByParent.get(relation.parent_id) ?? [];
    children.push(relation);
    childrenByParent.set(relation.parent_id, children);
  }

  return { parentsByChild, childrenByParent };
}

function buildLayout(persons: Person[], parentChild: ParentChild[], unions: Union[]) {
  const ids = new Set(persons.map((person) => person.id));
  const { parentsByChild, childrenByParent } = createRelationshipIndexes(parentChild);
  const depths = new Map<string, number>();
  const roots = persons.filter((person) => !(parentsByChild.get(person.id)?.length));
  const queue = (roots.length ? roots : persons).map((person) => person.id);

  for (const root of queue) depths.set(root, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const depth = depths.get(id) ?? 0;
    for (const child of childrenByParent.get(id) ?? []) {
      const nextDepth = depth + 1;
      if (!depths.has(child.child_id) || (depths.get(child.child_id) ?? 0) < nextDepth) {
        depths.set(child.child_id, nextDepth);
        queue.push(child.child_id);
      }
    }
  }

  for (const person of persons) {
    if (!depths.has(person.id)) depths.set(person.id, 0);
  }

  for (let pass = 0; pass < 4; pass += 1) {
    for (const union of unions) {
      if (!union.partner2_id || !ids.has(union.partner1_id) || !ids.has(union.partner2_id)) continue;
      const sharedDepth = Math.min(depths.get(union.partner1_id) ?? 0, depths.get(union.partner2_id) ?? 0);
      depths.set(union.partner1_id, sharedDepth);
      depths.set(union.partner2_id, sharedDepth);
    }
  }

  const rows = new Map<number, Person[]>();
  for (const person of persons) {
    const row = rows.get(depths.get(person.id) ?? 0) ?? [];
    row.push(person);
    rows.set(depths.get(person.id) ?? 0, row);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const rowGap = 210;
  const colGap = 290;

  Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([depth, row]) => {
      row
        .sort((a, b) => a.display_name.localeCompare(b.display_name))
        .forEach((person, index) => {
          const rowWidth = (row.length - 1) * colGap;
          positions.set(person.id, {
            x: index * colGap - rowWidth / 2,
            y: depth * rowGap,
          });
        });
    });

  return positions;
}

function relationshipLabel(personId: string, focusId: string | null, persons: Person[], parentChild: ParentChild[], unions: Union[]) {
  if (!focusId || personId === focusId) return 'Focus person';

  const personById = new Map(persons.map((person) => [person.id, person]));
  const focus = personById.get(focusId);
  const person = personById.get(personId);
  const parentsOfFocus = parentChild.filter((relation) => relation.child_id === focusId);
  const parentsOfPerson = parentChild.filter((relation) => relation.child_id === personId);

  const directParent = parentsOfFocus.find((relation) => relation.parent_id === personId);
  if (directParent) {
    if (directParent.parent_role === 'adoptive') return 'adoptive parent';
    if (directParent.parent_role === 'step') return 'step parent';
    if (directParent.parent_role === 'foster') return 'foster parent';
    if (directParent.parent_role === 'guardian') return 'guardian';
    if (person?.gender === 'male') return 'father';
    if (person?.gender === 'female') return 'mother';
    return 'parent';
  }

  if (parentChild.some((relation) => relation.parent_id === focusId && relation.child_id === personId)) {
    if (person?.gender === 'male') return 'son';
    if (person?.gender === 'female') return 'daughter';
    return 'child';
  }

  const union = unions.find((item) => {
    const partner2Id = item.partner2_id;
    return partner2Id && ((item.partner1_id === focusId && partner2Id === personId) || (item.partner1_id === personId && partner2Id === focusId));
  });

  if (union) {
    if (union.union_type === 'married') return 'spouse';
    if (union.union_type === 'ex_partner') return 'ex-partner';
    return 'partner';
  }

  const sharedParents = parentsOfPerson.filter((relation) => parentsOfFocus.some((focusParent) => focusParent.parent_id === relation.parent_id));
  if (sharedParents.length) return sharedParents.length === 1 ? 'half-sibling' : 'sibling';

  const focusParents = new Set(parentsOfFocus.map((relation) => relation.parent_id));
  if (parentChild.some((relation) => relation.child_id && focusParents.has(relation.child_id) && relation.parent_id === personId)) {
    return person?.gender === 'female' ? 'grandmother' : person?.gender === 'male' ? 'grandfather' : 'grandparent';
  }

  const personParents = new Set(parentsOfPerson.map((relation) => relation.parent_id));
  if (parentChild.some((relation) => relation.child_id && personParents.has(relation.child_id) && relation.parent_id === focusId)) {
    return focus?.gender === 'female' ? 'grandchild' : 'grandchild';
  }

  return 'family member';
}

function PersonBubbleNode({ data }: { data: any }) {
  const person = data.person as Person;
  const isDeceased = person.living_status === 'deceased';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => data.onSelect(person.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') data.onSelect(person.id);
      }}
      className={cn(
        'group w-[220px] rounded-[28px] border bg-white px-4 py-3 text-left shadow-[0_18px_50px_rgba(37,54,63,0.12)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(37,54,63,0.18)]',
        data.selected ? 'border-accent ring-4 ring-accent/15' : 'border-slate-200',
        isDeceased && 'border-slate-300 bg-slate-50',
        !data.searchMatch && 'opacity-30',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent" />

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#e8f1ef] to-[#c9dcdb] text-sm font-semibold text-[#275f66]',
            isDeceased && 'from-slate-100 to-slate-200 text-slate-500',
          )}
        >
          {person.photo_path ? <span className="text-xs">Photo</span> : initials(person.display_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-slate-950">{person.display_name}</p>
            {person.is_private ? <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-accent">{data.relationshipLabel}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{lifeYears(person)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        {isDeceased ? <span className="rounded-full bg-slate-100 px-2 py-0.5">Remembered</span> : null}
        {person.short_bio || person.notes ? <span className="rounded-full bg-[#eef7f5] px-2 py-0.5">Notes</span> : null}
        {!person.birth_date ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Incomplete</span> : null}
      </div>
    </div>
  );
}

export function FamilyTreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FamilyTreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function FamilyTreeCanvasInner({ persons, unions, parentChild, treeId, canEdit, createPersonAction, updatePersonAction }: Props) {
  const { fitView, setCenter } = useReactFlow();
  const [query, setQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(persons[0]?.id ?? null);
  const [dialog, setDialog] = useState<CreateDialog | null>(null);
  const personById = useMemo(() => new Map(persons.map((person) => [person.id, person])), [persons]);
  const { parentsByChild } = useMemo(() => createRelationshipIndexes(parentChild), [parentChild]);
  const positions = useMemo(() => buildLayout(persons, parentChild, unions), [persons, parentChild, unions]);
  const selectedPerson = selectedPersonId ? personById.get(selectedPersonId) ?? null : null;
  const searchValue = query.trim().toLowerCase();

  useEffect(() => {
    if (persons.length && selectedPersonId && !personById.has(selectedPersonId)) {
      setSelectedPersonId(persons[0].id);
    }
    if (persons.length && !selectedPersonId) {
      setSelectedPersonId(persons[0].id);
    }
  }, [personById, persons, selectedPersonId]);

  const nodes = useMemo(
    () =>
      persons.map((person) => {
        const position = positions.get(person.id) ?? { x: 0, y: 0 };
        const searchMatch = !searchValue || person.display_name.toLowerCase().includes(searchValue);

        return {
          id: person.id,
          type: 'personBubble',
          position,
          data: {
            person,
            selected: person.id === selectedPersonId,
            searchMatch,
            onSelect: setSelectedPersonId,
            relationshipLabel: relationshipLabel(person.id, selectedPersonId, persons, parentChild, unions),
          },
        };
      }),
    [parentChild, persons, positions, searchValue, selectedPersonId, unions],
  );

  const edges = useMemo(() => {
    const parentEdges = parentChild.map((relation) => ({
      id: `parent-${relation.id}`,
      source: relation.parent_id,
      target: relation.child_id,
      type: 'smoothstep',
      label: relation.parent_role && relation.parent_role !== 'biological' ? relation.parent_role.replace('_', ' ') : undefined,
      markerEnd: { type: 'arrowclosed', color: '#88a7a5' },
      style: { stroke: '#9bb7b5', strokeWidth: 1.7 },
      labelStyle: { fill: '#667b78', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#f8fbfa', fillOpacity: 0.85 },
    }));

    const unionEdges = unions
      .filter((union) => union.partner2_id)
      .map((union) => ({
        id: `union-${union.id}`,
        source: union.partner1_id,
        target: union.partner2_id as string,
        type: 'straight',
        label: union.union_type === 'married' ? 'spouse' : union.union_type === 'ex_partner' ? 'ex-partner' : 'partner',
        style: { stroke: '#d6a7a1', strokeWidth: 2, strokeDasharray: union.union_type === 'ex_partner' ? '6 5' : undefined },
        labelStyle: { fill: '#9b5c55', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#fff8f7', fillOpacity: 0.92 },
      }));

    return [...parentEdges, ...unionEdges];
  }, [parentChild, unions]);

  const selectedUnions = useMemo(
    () => (selectedPersonId ? unions.filter((union) => union.partner1_id === selectedPersonId || union.partner2_id === selectedPersonId) : []),
    [selectedPersonId, unions],
  );

  function centerPerson(personId: string) {
    const position = positions.get(personId);
    setSelectedPersonId(personId);
    if (position) {
      setCenter(position.x + 110, position.y + 60, { zoom: 0.9, duration: 500 });
    }
  }

  const searchMatches = useMemo(
    () => (searchValue ? persons.filter((person) => person.display_name.toLowerCase().includes(searchValue)).slice(0, 6) : []),
    [persons, searchValue],
  );

  if (!persons.length) {
    return (
      <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-border bg-[radial-gradient(circle_at_center,#ffffff_0%,#f4faf8_48%,#edf3f1_100%)] shadow-soft">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(79,141,149,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,141,149,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="relative grid min-h-[560px] place-items-center p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-white shadow-[0_16px_44px_rgba(39,95,102,0.14)]">
              <Sparkles className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Start your family tree</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Begin with any person you know. It can be you, a parent, a grandparent, or an ancestor.</p>
            {canEdit ? (
              <Button type="button" className="mt-6 rounded-full px-6 py-3" onClick={() => setDialog({ mode: 'first_person' })}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add first person
              </Button>
            ) : null}
          </div>
        </div>
        {dialog ? (
          <PersonCreateDialog
            dialog={dialog}
            treeId={treeId}
            persons={persons}
            unions={unions}
            parentChild={parentChild}
            personById={personById}
            action={createPersonAction}
            onClose={() => setDialog(null)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-border bg-[#f8fbfa] shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border bg-white/85 p-3 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-white px-3 py-2 shadow-sm md:w-[340px]">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search family members"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button type="button" className="rounded-full" onClick={() => setDialog({ mode: 'first_person' })}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add person
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-full" onClick={() => fitView({ padding: 0.24, duration: 500 })}>
            <ZoomIn className="mr-2 h-4 w-4" />
            Fit tree
          </Button>
        </div>
      </div>

      {searchMatches.length ? (
        <div className="absolute left-4 top-[78px] z-20 w-[min(320px,calc(100%-2rem))] rounded-2xl border border-border bg-white p-2 shadow-soft">
          {searchMatches.map((person) => (
            <button
              key={person.id}
              type="button"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#eef7f5]"
              onClick={() => centerPerson(person.id)}
            >
              {person.display_name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="h-[72vh] min-h-[620px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.28 }}
          minZoom={0.25}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          onNodeClick={(_: unknown, node: { id: string }) => setSelectedPersonId(node.id)}
        >
          <Background color="#dbe8e5" gap={32} />
          <Controls position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor={(node: { id: string }) => (node.id === selectedPersonId ? '#4f8d95' : '#dfe8e6')}
            maskColor="rgba(248,251,250,0.78)"
          />
        </ReactFlow>
      </div>

      {selectedPerson ? (
        <PersonDrawer
          person={selectedPerson}
          treeId={treeId}
          canEdit={canEdit}
          persons={persons}
          selectedUnions={selectedUnions}
          personById={personById}
          parentCount={parentsByChild.get(selectedPerson.id)?.length ?? 0}
          updateAction={updatePersonAction}
          onClose={() => setSelectedPersonId(null)}
          onCreate={(mode) => setDialog({ mode, targetId: selectedPerson.id })}
          onConnectExisting={() => setDialog({ mode: 'existing', targetId: selectedPerson.id })}
        />
      ) : null}

      {dialog ? (
        <PersonCreateDialog
          dialog={dialog}
          treeId={treeId}
          persons={persons}
          unions={unions}
          parentChild={parentChild}
          personById={personById}
          action={createPersonAction}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

function PersonDrawer({
  person,
  treeId,
  canEdit,
  persons,
  selectedUnions,
  personById,
  parentCount,
  updateAction,
  onClose,
  onCreate,
  onConnectExisting,
}: {
  person: Person;
  treeId: string;
  canEdit: boolean;
  persons: Person[];
  selectedUnions: Union[];
  personById: Map<string, Person>;
  parentCount: number;
  updateAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
  onCreate: (mode: RelationshipMode) => void;
  onConnectExisting: () => void;
}) {
  return (
    <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[88%] overflow-y-auto rounded-t-[28px] border-t border-border bg-white p-4 shadow-[0_-18px_60px_rgba(15,23,42,0.18)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[390px] md:rounded-l-[28px] md:rounded-tr-none md:border-l md:border-t-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Person details</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{person.display_name}</h2>
          <p className="mt-1 text-sm text-muted">{lifeYears(person)}</p>
        </div>
        <button type="button" className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:bg-slate-50" onClick={onClose}>
          Close
        </button>
      </div>

      {canEdit ? (
        <div className="mb-5 rounded-2xl bg-[#f5faf8] p-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Grow from this person</h3>
          <div className="grid grid-cols-2 gap-2">
            {relationshipActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.mode}
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-accent hover:text-accent"
                  onClick={() => onCreate(action.mode)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {action.label}
                </button>
              );
            })}
            {persons.length > 1 ? (
              <button
                type="button"
                className="col-span-2 flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-accent hover:text-accent"
                onClick={onConnectExisting}
              >
                <Users className="h-3.5 w-3.5" />
                Add existing person as relative
              </button>
            ) : null}
          </div>
          {selectedUnions.length ? (
            <p className="mt-3 text-xs text-muted">
              Partners: {selectedUnions.map((union) => partnerName(union, person.id, personById)).join(', ')}
            </p>
          ) : null}
          {!parentCount ? <p className="mt-2 text-xs text-muted">No parents linked yet. Siblings can create shared unknown parents if needed.</p> : null}
        </div>
      ) : null}

      <form key={person.id} action={updateAction} className="space-y-3">
        <input type="hidden" name="tree_id" value={treeId} />
        <input type="hidden" name="person_id" value={person.id} />
        <Field label="Display name" name="display_name" defaultValue={person.display_name} required disabled={!canEdit} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" name="given_names" defaultValue={person.given_names ?? ''} disabled={!canEdit} />
          <Field label="Nickname" name="nickname" defaultValue={person.nickname ?? ''} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Surname now" name="surname_now" defaultValue={person.surname_now ?? ''} disabled={!canEdit} />
          <Field label="Surname at birth" name="surname_at_birth" defaultValue={person.surname_at_birth ?? ''} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Living status" name="living_status" defaultValue={person.living_status ?? 'unknown'} disabled={!canEdit} options={['living', 'deceased', 'unknown']} />
          <Field label="Gender" name="gender" defaultValue={person.gender ?? ''} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birth date" name="birth_date" defaultValue={person.birth_date ?? ''} disabled={!canEdit} />
          <Field label="Death date" name="death_date" defaultValue={person.death_date ?? ''} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birth place" name="birth_place" defaultValue={person.birth_place ?? ''} disabled={!canEdit} />
          <Field label="Death place" name="death_place" defaultValue={person.death_place ?? ''} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Profession" name="profession" defaultValue={person.profession ?? ''} disabled={!canEdit} />
          <Field label="Education" name="education" defaultValue={person.education ?? ''} disabled={!canEdit} />
        </div>
        <TextAreaField label="Short biography" name="short_bio" defaultValue={person.short_bio ?? ''} disabled={!canEdit} />
        <TextAreaField label="Notes" name="notes" defaultValue={person.notes ?? ''} disabled={!canEdit} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="is_private" defaultChecked={Boolean(person.is_private)} disabled={!canEdit} />
          Private person
        </label>
        {canEdit ? <Button className="w-full rounded-full">Save details</Button> : null}
      </form>
    </aside>
  );
}

function PersonCreateDialog({
  dialog,
  treeId,
  persons,
  unions,
  parentChild,
  personById,
  action,
  onClose,
}: {
  dialog: CreateDialog;
  treeId: string;
  persons: Person[];
  unions: Union[];
  parentChild: ParentChild[];
  personById: Map<string, Person>;
  action: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const targetId = 'targetId' in dialog ? dialog.targetId : undefined;
  const targetPerson = targetId ? personById.get(targetId) : null;
  const targetUnions = targetId ? unions.filter((union) => union.partner1_id === targetId || union.partner2_id === targetId) : [];
  const targetParents = targetId ? parentChild.filter((relation) => relation.child_id === targetId) : [];
  const defaultGender = dialog.mode === 'father' ? 'male' : dialog.mode === 'mother' ? 'female' : '';

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-sm md:place-items-center md:p-4">
      <div className="w-full max-w-xl rounded-t-[28px] bg-white p-5 shadow-2xl md:rounded-[28px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{dialogTitles[dialog.mode]}</h2>
            <p className="mt-1 text-sm text-muted">
              {targetPerson ? `Connected to ${targetPerson.display_name}.` : 'Start with any person. You can add details later.'}
            </p>
          </div>
          <button type="button" className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:bg-slate-50" onClick={onClose}>
            Close
          </button>
        </div>

        {dialog.mode === 'existing' && targetId ? (
          <form action={action} className="space-y-3" onSubmit={onClose}>
            <input type="hidden" name="mode" value="existing" />
            <input type="hidden" name="tree_id" value={treeId} />
            <input type="hidden" name="target_id" value={targetId} />
            <label className="block text-sm font-medium text-slate-700">
              Existing person
              <select name="existing_person_id" required className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-accent">
                {persons
                  .filter((person) => person.id !== targetId)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name}
                    </option>
                  ))}
              </select>
            </label>
            <SelectField label="Relationship to selected person" name="existing_relation" defaultValue="parent" options={['parent', 'child', 'partner', 'spouse', 'sibling']} />
            <Button className="w-full rounded-full">Connect person</Button>
          </form>
        ) : (
          <form action={action} className="space-y-3" onSubmit={onClose}>
            <input type="hidden" name="tree_id" value={treeId} />
            <input type="hidden" name="mode" value={dialog.mode} />
            {targetId ? <input type="hidden" name="target_id" value={targetId} /> : null}
            <Field label="Display name" name="display_name" required autoFocus />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Gender" name="gender" defaultValue={defaultGender} />
              <SelectField label="Living status" name="living_status" defaultValue="unknown" options={['living', 'deceased', 'unknown']} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Birth date" name="birth_date" />
              <Field label="Death date" name="death_date" />
            </div>
            <TextAreaField label="Short note" name="short_bio" rows={3} />
            {dialog.mode === 'child' && targetUnions.length ? (
              <label className="block text-sm font-medium text-slate-700">
                Child belongs to
                <select name="union_id" className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-accent">
                  <option value="">Only {targetPerson?.display_name}</option>
                  {targetUnions.map((union) => (
                    <option key={union.id} value={union.id}>
                      {targetPerson?.display_name} and {partnerName(union, targetId ?? '', personById)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {dialog.mode === 'sibling' && targetId && !targetParents.length ? (
              <label className="flex items-center gap-2 rounded-2xl bg-[#f6faf8] p-3 text-sm text-slate-700">
                <input type="checkbox" name="create_unknown_parents" />
                Create shared unknown parents for these siblings
              </label>
            ) : null}
            <Button className="w-full rounded-full">{dialog.mode === 'first_person' ? 'Create first bubble' : 'Create person and connect'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  autoFocus,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm outline-none transition focus:border-accent disabled:bg-slate-50"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm capitalize outline-none transition focus:border-accent disabled:bg-slate-50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 4,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        disabled={disabled}
        className="mt-1 w-full resize-none rounded-2xl border border-border bg-white px-3 py-3 text-sm outline-none transition focus:border-accent disabled:bg-slate-50"
      />
    </label>
  );
}

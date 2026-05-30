'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ReactFlowLib from '@xyflow/react';
import {
  Baby,
  ChevronUp,
  Heart,
  Lock,
  Search,
  Sparkles,
  UserPlus,
  Users,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FAMILY_LAYOUT,
  buildFamilyGraph,
  edgeStyleForFamilyEdge,
  layoutFamilyGraph,
  parentRoleLabel,
  relationshipsFromRows,
  type FamilyGraphEdge,
  type FamilyPerson,
} from '@/src/lib/kinship/familyGraph';
import { deriveRelationshipsFromDbRows } from '@/src/lib/kinship/dbRows';

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
  | 'divorced_partner'
  | 'co_parent'
  | 'separated_partner'
  | 'unknown_partner'
  | 'sibling'
  | 'brother'
  | 'sister'
  | 'adoptive_parent'
  | 'step_parent'
  | 'foster_parent'
  | 'guardian'
  | 'donor_parent'
  | 'surrogate_parent';

type Props = {
  persons: Person[];
  unions: Union[];
  parentChild: ParentChild[];
  treeId: string;
  canEdit: boolean;
  createPersonAction: (formData: FormData) => void | Promise<void>;
  updatePersonAction: (formData: FormData) => void | Promise<void>;
};

const nodeTypes = { personBubble: PersonBubbleNode, familyJunction: FamilyJunctionNode };

const relationshipActionGroups: Array<{
  title: string;
  actions: Array<{ mode: RelationshipMode; label: string; icon: LucideIcon }>;
}> = [
  {
    title: 'Parents',
    actions: [
      { mode: 'father', label: 'Father', icon: UserPlus },
      { mode: 'mother', label: 'Mother', icon: UserPlus },
      { mode: 'parent', label: 'Parent', icon: UserPlus },
      { mode: 'adoptive_parent', label: 'Adoptive parent', icon: UserPlus },
      { mode: 'step_parent', label: 'Step parent', icon: UserPlus },
      { mode: 'foster_parent', label: 'Foster parent', icon: UserPlus },
      { mode: 'guardian', label: 'Guardian', icon: UserPlus },
      { mode: 'donor_parent', label: 'Donor parent', icon: UserPlus },
      { mode: 'surrogate_parent', label: 'Surrogate parent', icon: UserPlus },
    ],
  },
  {
    title: 'Same generation',
    actions: [
      { mode: 'brother', label: 'Brother', icon: Users },
      { mode: 'sister', label: 'Sister', icon: Users },
      { mode: 'sibling', label: 'Sibling', icon: Users },
      { mode: 'partner', label: 'Partner', icon: Heart },
      { mode: 'spouse', label: 'Spouse', icon: Heart },
      { mode: 'ex_partner', label: 'Ex-partner', icon: Heart },
      { mode: 'divorced_partner', label: 'Divorced partner', icon: Heart },
      { mode: 'co_parent', label: 'Co-parent', icon: Heart },
      { mode: 'separated_partner', label: 'Separated partner', icon: Heart },
      { mode: 'unknown_partner', label: 'Relationship', icon: Heart },
    ],
  },
  {
    title: 'Children',
    actions: [{ mode: 'child', label: 'Child', icon: Baby }],
  },
];

const existingRelationshipOptions: Array<{ value: RelationshipMode | 'parent' | 'child'; label: string }> = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'ex_partner', label: 'Ex-partner' },
  { value: 'divorced_partner', label: 'Divorced partner' },
  { value: 'co_parent', label: 'Co-parent' },
  { value: 'separated_partner', label: 'Separated partner' },
  { value: 'unknown_partner', label: 'Relationship' },
  { value: 'adoptive_parent', label: 'Adoptive parent' },
  { value: 'foster_parent', label: 'Foster parent' },
  { value: 'step_parent', label: 'Step parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'donor_parent', label: 'Donor parent' },
  { value: 'surrogate_parent', label: 'Surrogate parent' },
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
  divorced_partner: 'Add divorced partner',
  co_parent: 'Add co-parent',
  separated_partner: 'Add separated partner',
  unknown_partner: 'Add relationship',
  sibling: 'Add sibling',
  brother: 'Add brother',
  sister: 'Add sister',
  adoptive_parent: 'Add adoptive parent',
  step_parent: 'Add step parent',
  foster_parent: 'Add foster parent',
  guardian: 'Add guardian',
  donor_parent: 'Add donor parent',
  surrogate_parent: 'Add surrogate parent',
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

function lifeDetail(person: Person) {
  const born = [person.birth_date, person.birth_place].filter(Boolean).join(' - ');
  const died = [person.death_date, person.death_place].filter(Boolean).join(' - ');

  return [
    { label: 'Born', value: born },
    { label: 'Died', value: died },
    { label: 'Status', value: person.living_status ?? 'unknown' },
    { label: 'Work', value: person.profession },
  ].filter((item) => Boolean(item.value));
}

function partnerName(union: Union, selectedId: string, personById: Map<string, Person>) {
  const partnerId = union.partner1_id === selectedId ? union.partner2_id : union.partner1_id;
  return partnerId ? personById.get(partnerId)?.display_name ?? 'Unknown partner' : 'Unknown partner';
}

function buildPositionedGraph(persons: Person[], parentChild: ParentChild[], unions: Union[]) {
  const familyPersons: FamilyPerson[] = persons.map((person, index) => ({
    id: person.id,
    displayName: person.display_name,
    gender: person.gender,
    sortIndex: index,
  }));
  const relationships = relationshipsFromRows({ unions, parentChild });

  return layoutFamilyGraph(buildFamilyGraph(familyPersons, relationships));
}

function labelForGraphEdge(edge: FamilyGraphEdge) {
  if (edge.kind === 'partner') {
    if (edge.relationshipType === 'spouse') return 'spouse';
    if (edge.relationshipType === 'ex_partner') return 'ex-partner';
    if (edge.relationshipType === 'divorced') return 'divorced';
    if (edge.relationshipType === 'separated') return 'separated';
    if (edge.relationshipType === 'co_parent') return 'co-parent';
    if (edge.relationshipType === 'unknown') return 'relationship';
    return 'partner';
  }

  if (edge.kind === 'parent_to_family') return parentRoleLabel(edge.parentRole);

  const nonBiologicalRole = edge.parentRoles.find((role) => role !== 'biological' && role !== 'unknown');
  const unknownRole = edge.parentRoles.find((role) => role === 'unknown');
  return parentRoleLabel(nonBiologicalRole ?? unknownRole);
}

function nodeCenter(node: { position: { x: number; y: number }; width: number; height: number }) {
  return {
    x: node.position.x + node.width / 2,
    y: node.position.y + node.height / 2,
  };
}

function sideHandles(source: { x: number; y: number }, target: { x: number; y: number }) {
  if (source.x <= target.x) {
    return { sourceHandle: 'right-source', targetHandle: 'left-target' };
  }

  return { sourceHandle: 'left-source', targetHandle: 'right-target' };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function reactFlowHandlesForEdge(
  edge: FamilyGraphEdge,
  geometryById: Map<string, { position: { x: number; y: number }; width: number; height: number }>,
) {
  const sourceNode = geometryById.get(edge.sourceId);
  const targetNode = geometryById.get(edge.targetId);
  if (!sourceNode || !targetNode) return {};

  const source = nodeCenter(sourceNode);
  const target = nodeCenter(targetNode);

  if (edge.kind === 'family_to_child') {
    return { sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'smoothstep' };
  }

  if (edge.kind === 'parent_to_family' && Math.abs(source.x - target.x) < 18) {
    return { sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'smoothstep' };
  }

  return { ...sideHandles(source, target), type: 'straight' };
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
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          data.onSelect(person.id);
        }
      }}
      className={cn(
        'nodrag nopan group w-[220px] rounded-lg border bg-white px-4 py-3 text-left shadow-[0_14px_34px_rgba(37,54,63,0.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(37,54,63,0.16)]',
        'cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25',
        data.selected ? 'border-accent ring-4 ring-accent/15' : 'border-slate-200',
        isDeceased && 'border-slate-300 bg-slate-50',
        !data.searchMatch && 'opacity-30',
      )}
    >
      <Handle id="top-target" type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle id="left-source" type="source" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle id="left-target" type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle id="right-source" type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle id="right-target" type="target" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent" />

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
        {isDeceased ? <span className="rounded-md bg-slate-100 px-2 py-0.5">Remembered</span> : null}
        {person.short_bio || person.notes ? <span className="rounded-md bg-[#eef7f5] px-2 py-0.5">Notes</span> : null}
        {!person.birth_date ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">Incomplete</span> : null}
      </div>
    </div>
  );
}

function FamilyJunctionNode() {
  return (
    <div className="h-3.5 w-3.5 rounded-full border border-[#8daaa7] bg-white shadow-[0_4px_12px_rgba(79,141,149,0.16)]">
      <Handle id="top-target" type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="left-source" type="source" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="left-target" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="right-source" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="right-target" type="target" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
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
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [query, setQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(persons[0]?.id ?? null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialog, setDialog] = useState<CreateDialog | null>(null);
  const personById = useMemo(() => new Map(persons.map((person) => [person.id, person])), [persons]);
  const positionedGraph = useMemo(() => buildPositionedGraph(persons, parentChild, unions), [parentChild, persons, unions]);
  const relationshipLabels = useMemo<Record<string, { relationship_label: string }>>(
    () =>
      selectedPersonId
        ? deriveRelationshipsFromDbRows({
            persons,
            unions,
            parentChild,
            focusPersonId: selectedPersonId,
          })
        : {},
    [parentChild, persons, selectedPersonId, unions],
  );
  const personPositions = useMemo(() => new Map(positionedGraph.personNodes.map((node) => [node.id, node.position])), [positionedGraph]);
  const geometryById = useMemo(() => {
    const geometry = new Map<string, { position: { x: number; y: number }; width: number; height: number }>();
    for (const node of positionedGraph.personNodes) geometry.set(node.id, node);
    for (const node of positionedGraph.familyUnitNodes) geometry.set(node.id, node);
    return geometry;
  }, [positionedGraph]);
  const selectedPerson = selectedPersonId ? personById.get(selectedPersonId) ?? null : null;
  const searchValue = query.trim().toLowerCase();

  const selectPerson = useCallback((personId: string, options?: { openDetails?: boolean }) => {
    setSelectedPersonId(personId);
    setDetailsOpen(options?.openDetails ?? isDesktop);
  }, [isDesktop]);

  useEffect(() => {
    if (persons.length && selectedPersonId && !personById.has(selectedPersonId)) {
      setSelectedPersonId(persons[0].id);
    }
    if (persons.length && !selectedPersonId) {
      setSelectedPersonId(persons[0].id);
    }
  }, [personById, persons, selectedPersonId]);

  useEffect(() => {
    if (!persons.length) return;
    setDetailsOpen(isDesktop);
  }, [isDesktop, persons.length]);

  useEffect(() => {
    if (!persons.length) return;
    const timer = window.setTimeout(() => fitView({ padding: isDesktop ? 0.2 : 0.38, duration: 350 }), 0);
    return () => window.clearTimeout(timer);
  }, [fitView, isDesktop, persons.length, positionedGraph]);

  const nodes = useMemo(
    () => [
      ...positionedGraph.personNodes.map((graphNode) => {
        const person = personById.get(graphNode.id);
        if (!person) return null;
        const searchMatch = !searchValue || person.display_name.toLowerCase().includes(searchValue);

        return {
          id: person.id,
          type: 'personBubble',
          position: graphNode.position,
          data: {
            person,
            selected: person.id === selectedPersonId,
            searchMatch,
            onSelect: selectPerson,
            relationshipLabel: person.id === selectedPersonId ? 'Focus person' : relationshipLabels[person.id]?.relationship_label ?? 'family member',
          },
        };
      }),
      ...positionedGraph.familyUnitNodes.map((graphNode) => ({
        id: graphNode.id,
        type: 'familyJunction',
        position: graphNode.position,
        selectable: false,
        focusable: false,
        draggable: false,
        data: { familyUnit: graphNode.familyUnit },
      })),
    ].filter(Boolean),
    [personById, positionedGraph, relationshipLabels, searchValue, selectPerson, selectedPersonId],
  );

  const edges = useMemo(
    () =>
      positionedGraph.edges.map((edge) => {
        const handles = reactFlowHandlesForEdge(edge, geometryById);
        const label = labelForGraphEdge(edge);
        const isPartnerEdge = edge.kind === 'partner';

        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          type: handles.type,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          label,
          style: edgeStyleForFamilyEdge(edge),
          labelStyle: { fill: isPartnerEdge ? '#9b5c55' : '#667b78', fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: isPartnerEdge ? '#fff8f7' : '#f8fbfa', fillOpacity: 0.9 },
          data: edge,
        };
      }),
    [geometryById, positionedGraph.edges],
  );

  const selectedUnions = useMemo(
    () => (selectedPersonId ? unions.filter((union) => union.partner1_id === selectedPersonId || union.partner2_id === selectedPersonId) : []),
    [selectedPersonId, unions],
  );

  function centerPerson(personId: string, openDetails = isDesktop) {
    const position = personPositions.get(personId);
    selectPerson(personId, { openDetails });
    if (query) setQuery('');
    if (position) {
      setCenter(position.x + FAMILY_LAYOUT.personWidth / 2, position.y + FAMILY_LAYOUT.personHeight / 2, { zoom: 0.9, duration: 500 });
    }
  }

  const searchMatches = useMemo(
    () => (searchValue ? persons.filter((person) => person.display_name.toLowerCase().includes(searchValue)).slice(0, 6) : []),
    [persons, searchValue],
  );
  const quickPeople = useMemo(() => {
    const selected = selectedPersonId ? persons.find((person) => person.id === selectedPersonId) : null;
    const rest = persons.filter((person) => person.id !== selectedPersonId).slice(0, 7);
    return selected ? [selected, ...rest] : rest;
  }, [persons, selectedPersonId]);

  if (!persons.length) {
    return (
      <div className="relative flex h-full min-h-[560px] overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_center,#ffffff_0%,#f4faf8_48%,#edf3f1_100%)] shadow-soft">
        <div className="genealogy-grid absolute inset-0" />
        <div className="relative grid min-h-full flex-1 place-items-center p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-white shadow-[0_16px_44px_rgba(39,95,102,0.14)]">
              <Sparkles className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-950">Start your family tree</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Begin with any person you know. It can be you, a parent, a grandparent, or an ancestor.</p>
            {canEdit ? (
              <Button type="button" className="mt-6 rounded-lg px-6 py-3" onClick={() => setDialog({ mode: 'first_person' })}>
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
    <div className="relative flex h-full min-h-[620px] flex-col overflow-hidden rounded-lg border border-[#cddbd8] bg-[#f8fbfa] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-white/95 p-3 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 lg:w-[360px]">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search family members"
          />
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          {canEdit ? (
            <Button type="button" className="rounded-lg" onClick={() => setDialog({ mode: 'first_person' })}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add person
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => fitView({ padding: 0.24, duration: 500 })}>
            <ZoomIn className="mr-2 h-4 w-4" />
            Fit tree
          </Button>
        </div>
      </div>

      <div className="app-nav-scroll flex gap-2 overflow-x-auto border-b border-border bg-white/80 px-3 py-2 md:hidden">
        {quickPeople.map((person) => (
          <button
            key={person.id}
            type="button"
            className={cn(
              'flex min-h-11 min-w-[150px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left shadow-sm',
              person.id === selectedPersonId ? 'border-accent bg-[#eef7f5]' : 'border-border bg-white',
            )}
            onClick={() => centerPerson(person.id, false)}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8f1ef] text-[11px] font-semibold text-[#275f66]">
              {initials(person.display_name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-950">{person.display_name}</span>
              <span className="block truncate text-[11px] text-muted">{person.id === selectedPersonId ? 'Selected' : relationshipLabels[person.id]?.relationship_label ?? 'Family'}</span>
            </span>
          </button>
        ))}
      </div>

      {searchMatches.length ? (
        <div className="absolute left-4 top-[72px] z-20 w-[min(320px,calc(100%-2rem))] rounded-lg border border-border bg-white p-2 shadow-soft sm:top-[76px]">
          {searchMatches.map((person) => (
            <button
              key={person.id}
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#eef7f5]"
              onClick={() => centerPerson(person.id, isDesktop)}
            >
              {person.display_name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            className="family-tree-flow"
            fitView
            fitViewOptions={{ padding: isDesktop ? 0.24 : 0.38 }}
            minZoom={0.25}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            selectionOnDrag={false}
            panOnDrag
            zoomOnPinch
            zoomOnScroll={false}
            preventScrolling={false}
            onNodeClick={(_: unknown, node: { id: string; type?: string }) => {
              if (node.type === 'personBubble') selectPerson(node.id);
            }}
          >
            <Background color="#dbe8e5" gap={32} />
            {isDesktop ? (
              <>
                <Controls position="bottom-left" />
                <MiniMap
                  pannable
                  zoomable
                  position="bottom-right"
                  nodeColor={(node: { id: string; type?: string }) => (node.id === selectedPersonId ? '#4f8d95' : node.type === 'familyJunction' ? '#8daaa7' : '#dfe8e6')}
                  maskColor="rgba(248,251,250,0.78)"
                />
              </>
            ) : null}
          </ReactFlow>
        </div>

        {selectedPerson && detailsOpen ? (
          <PersonDrawer
            person={selectedPerson}
            treeId={treeId}
            canEdit={canEdit}
            persons={persons}
            selectedUnions={selectedUnions}
            personById={personById}
            updateAction={updatePersonAction}
            onClose={() => setDetailsOpen(false)}
            onCreate={(mode) => setDialog({ mode, targetId: selectedPerson.id })}
            onConnectExisting={() => setDialog({ mode: 'existing', targetId: selectedPerson.id })}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 md:hidden">
        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-lg border border-[#cddbd8] bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur">
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border bg-white text-slate-700"
            onClick={() => fitView({ padding: 0.38, duration: 450 })}
            aria-label="Fit tree"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {selectedPerson ? (
            <button
              type="button"
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white"
              onClick={() => setDetailsOpen(true)}
            >
              <ChevronUp className="h-4 w-4" />
              <span className="truncate">{selectedPerson.display_name}</span>
            </button>
          ) : (
            <div className="min-w-0 flex-1 px-2 text-center text-xs font-medium text-muted">No person selected</div>
          )}
          {canEdit ? (
            <button
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-accent text-white"
              onClick={() => (selectedPerson ? setDetailsOpen(true) : setDialog({ mode: 'first_person' }))}
              aria-label={selectedPerson ? 'Open relationship actions' : 'Add person'}
            >
              <UserPlus className="h-4 w-4" />
            </button>
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

function PersonDrawer({
  person,
  treeId,
  canEdit,
  persons,
  selectedUnions,
  personById,
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
  updateAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
  onCreate: (mode: RelationshipMode) => void;
  onConnectExisting: () => void;
}) {
  const facts = lifeDetail(person);
  const quickActions: Array<{ mode: RelationshipMode | 'existing'; label: string; icon: LucideIcon }> = [
    { mode: 'parent', label: 'Parent', icon: UserPlus },
    { mode: 'sibling', label: 'Sibling', icon: Users },
    { mode: 'partner', label: 'Partner', icon: Heart },
    { mode: 'child', label: 'Child', icon: Baby },
    { mode: 'existing', label: 'Existing', icon: Users },
  ];

  return (
    <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[88%] overflow-y-auto rounded-t-lg border-t border-border bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(15,23,42,0.18)] md:relative md:inset-auto md:h-full md:max-h-none md:w-[410px] md:shrink-0 md:rounded-none md:border-l md:border-t-0 md:pb-4 md:shadow-none">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-border bg-white/95 px-4 pb-4 pt-3 backdrop-blur md:static md:mx-0 md:mt-0 md:border-b-0 md:bg-transparent md:p-0">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-accent">Person details</p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-slate-950">{person.display_name}</h2>
            <p className="mt-1 text-sm text-muted">{lifeYears(person)}</p>
          </div>
          <button type="button" className="min-h-10 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50" onClick={onClose}>
            <span className="md:hidden">Back to tree</span>
            <span className="hidden md:inline">Close</span>
          </button>
        </div>
      </div>

      {facts.length ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {facts.slice(0, 4).map((fact) => (
            <div key={fact.label} className="min-w-0 rounded-lg border border-[#dfe8e5] bg-[#f8fbfa] p-3">
              <p className="text-xs font-medium text-muted">{fact.label}</p>
              <p className="mt-1 truncate text-sm font-semibold capitalize text-slate-900">{fact.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <div className="mb-5 rounded-lg border border-[#dfe9e7] bg-[#f5faf8] p-3">
          <h3 className="text-sm font-semibold text-slate-900">Next action</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-2">
            {quickActions.map((action) => {
              if (action.mode === 'existing' && persons.length <= 1) return null;
              const Icon = action.icon;
              return (
                <button
                  key={action.mode}
                  type="button"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  onClick={() => (action.mode === 'existing' ? onConnectExisting() : onCreate(action.mode))}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
          {selectedUnions.length ? (
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-muted">
              Partners: {selectedUnions.map((union) => partnerName(union, person.id, personById)).join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {canEdit ? (
        <div className="mb-5 rounded-lg border border-[#e5ece9] bg-white p-3">
          <h3 className="text-sm font-semibold text-slate-900">All relationship types</h3>
          <div className="mt-3 space-y-4">
            {relationshipActionGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">{group.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.mode}
                        type="button"
                        className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                        onClick={() => onCreate(action.mode)}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {persons.length > 1 ? (
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                onClick={onConnectExisting}
              >
                <Users className="h-3.5 w-3.5" />
                Add existing person as relative
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <form key={person.id} action={updateAction} className="space-y-4">
        <input type="hidden" name="tree_id" value={treeId} />
        <input type="hidden" name="person_id" value={person.id} />
        <div className="rounded-lg border border-[#e5ece9] bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Names</h3>
          <div className="space-y-3">
            <Field label="Display name" name="display_name" defaultValue={person.display_name} required disabled={!canEdit} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Full name" name="given_names" defaultValue={person.given_names ?? ''} disabled={!canEdit} />
              <Field label="Nickname" name="nickname" defaultValue={person.nickname ?? ''} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Surname now" name="surname_now" defaultValue={person.surname_now ?? ''} disabled={!canEdit} />
              <Field label="Surname at birth" name="surname_at_birth" defaultValue={person.surname_at_birth ?? ''} disabled={!canEdit} />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#e5ece9] bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Life details</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Living status" name="living_status" defaultValue={person.living_status ?? 'unknown'} disabled={!canEdit} options={['living', 'deceased', 'unknown']} />
              <Field label="Gender" name="gender" defaultValue={person.gender ?? ''} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Birth date" name="birth_date" defaultValue={person.birth_date ?? ''} disabled={!canEdit} />
              <Field label="Death date" name="death_date" defaultValue={person.death_date ?? ''} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Birth place" name="birth_place" defaultValue={person.birth_place ?? ''} disabled={!canEdit} />
              <Field label="Death place" name="death_place" defaultValue={person.death_place ?? ''} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Profession" name="profession" defaultValue={person.profession ?? ''} disabled={!canEdit} />
              <Field label="Education" name="education" defaultValue={person.education ?? ''} disabled={!canEdit} />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#e5ece9] bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Story</h3>
          <div className="space-y-3">
            <TextAreaField label="Short biography" name="short_bio" defaultValue={person.short_bio ?? ''} disabled={!canEdit} />
            <TextAreaField label="Notes" name="notes" defaultValue={person.notes ?? ''} disabled={!canEdit} />
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-[#f8fbfa] px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" name="is_private" defaultChecked={Boolean(person.is_private)} disabled={!canEdit} className="h-4 w-4 rounded border-border text-accent" />
              Private person
            </label>
          </div>
        </div>
        {canEdit ? <Button className="w-full rounded-lg">Save details</Button> : null}
      </form>
    </aside>
  );
}

function isSiblingMode(mode: string) {
  return mode === 'sibling' || mode === 'brother' || mode === 'sister';
}

function SharedParentChoices({
  targetPerson,
  targetParents,
  personById,
}: {
  targetPerson: Person | null;
  targetParents: ParentChild[];
  personById: Map<string, Person>;
}) {
  if (!targetParents.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#b9ccc9] bg-[#f6faf8] p-3 text-sm text-slate-700">
        No known parent is attached to {targetPerson?.display_name ?? 'this person'}. The app will create a private "Unknown parent" placeholder and share it with both siblings.
      </div>
    );
  }

  return (
    <fieldset className="rounded-lg border border-[#dfe9e7] bg-[#f8fbfa] p-3">
      <legend className="px-1 text-xs font-semibold text-slate-500">Shared parents</legend>
      <div className="mt-2 space-y-2">
        {targetParents.map((relation) => {
          const parent = personById.get(relation.parent_id);
          const role = parentRoleLabel(relation.parent_role) ?? 'biological';

          return (
            <label key={relation.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="shared_parent_ids"
                value={relation.parent_id}
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-border text-accent"
              />
              <span>
                <span className="font-medium text-slate-900">{parent?.display_name ?? 'Unknown parent'}</span>
                <span className="text-muted"> ({role})</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
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
  const targetPerson = targetId ? personById.get(targetId) ?? null : null;
  const targetUnions = targetId ? unions.filter((union) => union.partner1_id === targetId || union.partner2_id === targetId) : [];
  const targetParents = targetId ? parentChild.filter((relation) => relation.child_id === targetId) : [];
  const defaultGender = dialog.mode === 'father' || dialog.mode === 'brother' ? 'male' : dialog.mode === 'mother' || dialog.mode === 'sister' ? 'female' : '';
  const isSiblingDialog = isSiblingMode(dialog.mode);
  const [existingRelation, setExistingRelation] = useState<string>('parent');

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-sm md:place-items-center md:p-4">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-white p-5 shadow-2xl md:rounded-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{dialogTitles[dialog.mode]}</h2>
            <p className="mt-1 text-sm text-muted">
              {targetPerson ? `Connected to ${targetPerson.display_name}.` : 'Start with any person. You can add details later.'}
            </p>
          </div>
          <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50" onClick={onClose}>
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
              <select name="existing_person_id" required className="studio-field mt-1">
                {persons
                  .filter((person) => person.id !== targetId)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Relationship to selected person
              <select
                name="existing_relation"
                value={existingRelation}
                onChange={(event) => setExistingRelation(event.target.value)}
                className="studio-field mt-1"
              >
                {existingRelationshipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {isSiblingMode(existingRelation) ? <SharedParentChoices targetPerson={targetPerson} targetParents={targetParents} personById={personById} /> : null}
            <Button className="w-full rounded-lg">Connect person</Button>
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
                <select name="union_id" className="studio-field mt-1">
                  <option value="">Only {targetPerson?.display_name}</option>
                  {targetUnions.map((union) => (
                    <option key={union.id} value={union.id}>
                      {targetPerson?.display_name} and {partnerName(union, targetId ?? '', personById)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {isSiblingDialog ? <SharedParentChoices targetPerson={targetPerson} targetParents={targetParents} personById={personById} /> : null}
            <Button className="w-full rounded-lg">
              {dialog.mode === 'first_person' ? 'Create first bubble' : 'Create person and connect'}
            </Button>
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
        className="studio-field mt-1"
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
        className="studio-field mt-1 capitalize"
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
        className="studio-field mt-1 resize-none"
      />
    </label>
  );
}

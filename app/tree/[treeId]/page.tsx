import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { SiteShell } from '@/components/site-shell';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { parseForm, requireUser, writeAuditLog, z } from '@/lib/security';
import { FamilyTreeCanvas } from '@/components/tree/family-tree-canvas';
import { ShareModal } from '@/components/tree/share-modal';
import { cn } from '@/lib/utils';

const editorRoles = ['owner', 'editor'] as const;
const contributorRoles = ['owner', 'editor', 'contributor'] as const;

const optionalText = (max = 500) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }, z.string().max(max).optional());

const optionalUuid = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().uuid().optional());

const inviteSchema = z.object({
  tree_id: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.enum(['viewer', 'contributor', 'editor']),
  expires_days: z.coerce.number().int().min(1).max(30).default(7),
});

const createPersonSchema = z.object({
  tree_id: z.string().uuid(),
  target_id: optionalUuid,
  union_id: optionalUuid,
  mode: z.enum([
    'first_person',
    'father',
    'mother',
    'parent',
    'child',
    'partner',
    'spouse',
    'ex_partner',
    'divorced_partner',
    'co_parent',
    'separated_partner',
    'unknown_partner',
    'sibling',
    'brother',
    'sister',
    'adoptive_parent',
    'step_parent',
    'foster_parent',
    'guardian',
    'donor_parent',
    'surrogate_parent',
  ]),
  display_name: z.string().trim().min(1).max(120),
  gender: optionalText(60),
  living_status: z.enum(['living', 'deceased', 'unknown']).default('unknown'),
  birth_date: optionalText(40),
  death_date: optionalText(40),
  short_bio: optionalText(500),
});

const connectExistingSchema = z.object({
  tree_id: z.string().uuid(),
  target_id: z.string().uuid(),
  existing_person_id: z.string().uuid(),
  existing_relation: z.enum([
    'parent',
    'child',
    'father',
    'mother',
    'partner',
    'spouse',
    'ex_partner',
    'divorced_partner',
    'co_parent',
    'separated_partner',
    'unknown_partner',
    'sibling',
    'brother',
    'sister',
    'adoptive_parent',
    'foster_parent',
    'step_parent',
    'guardian',
    'donor_parent',
    'surrogate_parent',
  ]),
});

const updatePersonSchema = z.object({
  tree_id: z.string().uuid(),
  person_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(120),
  given_names: optionalText(160),
  surname_now: optionalText(120),
  surname_at_birth: optionalText(120),
  nickname: optionalText(120),
  gender: optionalText(60),
  living_status: z.enum(['living', 'deceased', 'unknown']).default('unknown'),
  birth_date: optionalText(40),
  birth_place: optionalText(160),
  death_date: optionalText(40),
  death_place: optionalText(160),
  profession: optionalText(160),
  education: optionalText(160),
  short_bio: optionalText(600),
  notes: optionalText(2000),
  is_private: z.preprocess((value) => value === 'on' || value === 'true', z.boolean()).default(false),
});

async function assertMember(treeId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tree_memberships')
    .select('id, role')
    .eq('tree_id', treeId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) notFound();
  return { supabase, membership: data };
}

function requireRole(treeId: string, role: string, allowedRoles: readonly string[]) {
  if (!allowedRoles.includes(role)) {
    redirect(`/tree/${treeId}?error=not_authorized`);
  }
}

function parentRoleForMode(mode: string) {
  if (mode === 'adoptive_parent') return 'adoptive';
  if (mode === 'step_parent') return 'step';
  if (mode === 'foster_parent') return 'foster';
  if (mode === 'guardian') return 'guardian';
  if (mode === 'donor_parent') return 'donor';
  if (mode === 'surrogate_parent') return 'surrogate';
  return 'biological';
}

function defaultGenderForMode(mode: string, gender?: string) {
  if (gender) return gender;
  if (mode === 'father') return 'male';
  if (mode === 'mother') return 'female';
  if (mode === 'brother') return 'male';
  if (mode === 'sister') return 'female';
  return null;
}

function personPayload(parsed: z.infer<typeof createPersonSchema>, userId: string) {
  return {
    tree_id: parsed.tree_id,
    display_name: parsed.display_name,
    gender: defaultGenderForMode(parsed.mode, parsed.gender),
    living_status: parsed.living_status,
    birth_date: parsed.birth_date ?? null,
    death_date: parsed.death_date ?? null,
    short_bio: parsed.short_bio ?? null,
    created_by: userId,
    updated_by: userId,
  };
}

async function addParentChild(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  treeId: string;
  parentId: string;
  childId: string;
  parentRole?: string;
  unionId?: string | null;
}) {
  if (input.parentId === input.childId) return;

  const { data: existing, error: existingError } = await input.supabase
    .from('parent_child_relationships')
    .select('id')
    .eq('tree_id', input.treeId)
    .eq('parent_id', input.parentId)
    .eq('child_id', input.childId)
    .maybeSingle();

  if (existingError) redirect(`/tree/${input.treeId}?error=relationship_failed`);
  if (existing) return;

  const { error } = await input.supabase.from('parent_child_relationships').insert({
    tree_id: input.treeId,
    parent_id: input.parentId,
    child_id: input.childId,
    parent_role: input.parentRole ?? 'biological',
    union_id: input.unionId ?? null,
    confidence: 'confirmed',
  });

  if (error) redirect(`/tree/${input.treeId}?error=relationship_failed`);
}

async function createUnion(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  treeId: string;
  partner1Id: string;
  partner2Id: string;
  unionType: 'partnered' | 'married' | 'ex_partner' | 'divorced' | 'co_parent' | 'separated' | 'unknown';
}) {
  if (input.partner1Id === input.partner2Id) return;

  const { data: existing, error: existingError } = await input.supabase
    .from('unions')
    .select('id')
    .eq('tree_id', input.treeId)
    .or(
      `and(partner1_id.eq.${input.partner1Id},partner2_id.eq.${input.partner2Id}),and(partner1_id.eq.${input.partner2Id},partner2_id.eq.${input.partner1Id})`,
    )
    .limit(1);

  if (existingError) redirect(`/tree/${input.treeId}?error=union_failed`);
  if (existing?.length) return;

  const { error } = await input.supabase.from('unions').insert({
    tree_id: input.treeId,
    partner1_id: input.partner1Id,
    partner2_id: input.partner2Id,
    union_type: input.unionType,
  });

  if (error) redirect(`/tree/${input.treeId}?error=union_failed`);
}

type SiblingParentLink = {
  parent_id: string;
  parent_role: string | null;
  union_id: string | null;
};

function selectedSharedParentIds(formData: FormData) {
  return new Set(
    formData
      .getAll('shared_parent_ids')
      .map((value) => String(value))
      .filter(Boolean),
  );
}

async function getParentLinksForChild(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  treeId: string;
  childId: string;
}) {
  const { data: parents, error } = await input.supabase
    .from('parent_child_relationships')
    .select('parent_id, parent_role, union_id')
    .eq('tree_id', input.treeId)
    .eq('child_id', input.childId);

  if (error) redirect(`/tree/${input.treeId}?error=sibling_failed`);
  return (parents ?? []) as SiblingParentLink[];
}

async function copySiblingParents(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  treeId: string;
  actorId: string;
  targetId: string;
  siblingId: string;
  parentLinks?: SiblingParentLink[];
  selectedParentIds?: Set<string>;
}) {
  const allParents = input.parentLinks ?? (await getParentLinksForChild({ supabase: input.supabase, treeId: input.treeId, childId: input.targetId }));
  const parents = input.selectedParentIds?.size
    ? allParents.filter((parent) => input.selectedParentIds?.has(parent.parent_id))
    : allParents;

  if (!parents.length) {
    const { data: placeholder, error } = await input.supabase
      .from('persons')
      .insert({
        tree_id: input.treeId,
        display_name: 'Unknown parent',
        living_status: 'unknown',
        is_private: true,
        created_by: input.actorId,
        updated_by: input.actorId,
      })
      .select('id')
      .single();

    if (error || !placeholder) redirect(`/tree/${input.treeId}?error=sibling_failed`);

    await addParentChild({
      supabase: input.supabase,
      treeId: input.treeId,
      parentId: placeholder.id,
      childId: input.targetId,
      parentRole: 'unknown',
    });
    await addParentChild({
      supabase: input.supabase,
      treeId: input.treeId,
      parentId: placeholder.id,
      childId: input.siblingId,
      parentRole: 'unknown',
    });
    return;
  }

  await Promise.all(
    parents.map((parent) =>
      addParentChild({
        supabase: input.supabase,
        treeId: input.treeId,
        parentId: parent.parent_id,
        childId: input.siblingId,
        parentRole: parent.parent_role ?? undefined,
        unionId: parent.union_id,
      }),
    ),
  );
}

async function createPersonOrRelative(formData: FormData) {
  'use server';

  const mode = formData.get('mode');

  if (mode === 'existing') {
    await connectExistingPerson(formData);
    return;
  }

  const { user } = await requireUser();
  const parsed = parseForm(createPersonSchema, formData);
  const { supabase, membership } = await assertMember(parsed.tree_id, user.id);
  requireRole(parsed.tree_id, membership.role, contributorRoles);

  if (parsed.mode !== 'first_person') {
    requireRole(parsed.tree_id, membership.role, editorRoles);
  }

  let siblingParentLinks: SiblingParentLink[] | undefined;
  if (['sibling', 'brother', 'sister'].includes(parsed.mode) && parsed.target_id) {
    siblingParentLinks = await getParentLinksForChild({ supabase, treeId: parsed.tree_id, childId: parsed.target_id });
  }

  const { data: person, error } = await supabase.from('persons').insert(personPayload(parsed, user.id)).select('id').single();
  if (error || !person) redirect(`/tree/${parsed.tree_id}?error=person_failed`);

  const targetId = parsed.target_id;

  if (targetId) {
    if (['father', 'mother', 'parent', 'adoptive_parent', 'step_parent', 'foster_parent', 'guardian', 'donor_parent', 'surrogate_parent'].includes(parsed.mode)) {
      await addParentChild({
        supabase,
        treeId: parsed.tree_id,
        parentId: person.id,
        childId: targetId,
        parentRole: parentRoleForMode(parsed.mode),
      });
    }

    if (parsed.mode === 'child') {
      let otherParentId: string | null = null;

      if (parsed.union_id) {
        const { data: union } = await supabase
          .from('unions')
          .select('partner1_id, partner2_id')
          .eq('tree_id', parsed.tree_id)
          .eq('id', parsed.union_id)
          .maybeSingle();

        if (union) {
          otherParentId = union.partner1_id === targetId ? union.partner2_id : union.partner1_id;
        }
      }

      await addParentChild({
        supabase,
        treeId: parsed.tree_id,
        parentId: targetId,
        childId: person.id,
        unionId: parsed.union_id ?? null,
      });

      if (otherParentId) {
        await addParentChild({
          supabase,
          treeId: parsed.tree_id,
          parentId: otherParentId,
          childId: person.id,
          unionId: parsed.union_id ?? null,
        });
      }
    }

    if (['partner', 'spouse', 'ex_partner', 'divorced_partner', 'co_parent', 'separated_partner', 'unknown_partner'].includes(parsed.mode)) {
      await createUnion({
        supabase,
        treeId: parsed.tree_id,
        partner1Id: targetId,
        partner2Id: person.id,
        unionType:
          parsed.mode === 'spouse'
            ? 'married'
            : parsed.mode === 'ex_partner'
              ? 'ex_partner'
              : parsed.mode === 'divorced_partner'
                ? 'divorced'
              : parsed.mode === 'co_parent'
                ? 'co_parent'
                : parsed.mode === 'separated_partner'
                  ? 'separated'
                  : parsed.mode === 'unknown_partner'
                    ? 'unknown'
                    : 'partnered',
      });
    }

    if (['sibling', 'brother', 'sister'].includes(parsed.mode)) {
      await copySiblingParents({
        supabase,
        treeId: parsed.tree_id,
        actorId: user.id,
        targetId,
        siblingId: person.id,
        parentLinks: siblingParentLinks,
        selectedParentIds: selectedSharedParentIds(formData),
      });
    }
  }

  await writeAuditLog({
    treeId: parsed.tree_id,
    actorId: user.id,
    action: parsed.mode === 'first_person' ? 'first_person_created' : 'relative_created',
    entityType: 'person',
    entityId: person.id,
    metadata: { mode: parsed.mode, target_id: targetId ?? null },
  });

  revalidatePath(`/tree/${parsed.tree_id}`);
}

async function connectExistingPerson(formData: FormData) {
  'use server';

  const { user } = await requireUser();
  const parsed = parseForm(connectExistingSchema, formData);
  const { supabase, membership } = await assertMember(parsed.tree_id, user.id);
  requireRole(parsed.tree_id, membership.role, editorRoles);

  if (parsed.target_id === parsed.existing_person_id) {
    redirect(`/tree/${parsed.tree_id}?error=same_person`);
  }

  const { data: existingPerson } = await supabase
    .from('persons')
    .select('id')
    .eq('tree_id', parsed.tree_id)
    .eq('id', parsed.existing_person_id)
    .maybeSingle();

  if (!existingPerson) redirect(`/tree/${parsed.tree_id}?error=missing_person`);

  if (['parent', 'father', 'mother', 'adoptive_parent', 'foster_parent', 'step_parent', 'guardian', 'donor_parent', 'surrogate_parent'].includes(parsed.existing_relation)) {
    await addParentChild({
      supabase,
      treeId: parsed.tree_id,
      parentId: parsed.existing_person_id,
      childId: parsed.target_id,
      parentRole: parentRoleForMode(parsed.existing_relation),
    });
  }

  if (parsed.existing_relation === 'child') {
    await addParentChild({
      supabase,
      treeId: parsed.tree_id,
      parentId: parsed.target_id,
      childId: parsed.existing_person_id,
    });
  }

  if (['partner', 'spouse', 'ex_partner', 'divorced_partner', 'co_parent', 'separated_partner', 'unknown_partner'].includes(parsed.existing_relation)) {
    await createUnion({
      supabase,
      treeId: parsed.tree_id,
      partner1Id: parsed.target_id,
      partner2Id: parsed.existing_person_id,
      unionType:
        parsed.existing_relation === 'spouse'
          ? 'married'
          : parsed.existing_relation === 'ex_partner'
            ? 'ex_partner'
            : parsed.existing_relation === 'divorced_partner'
              ? 'divorced'
            : parsed.existing_relation === 'co_parent'
              ? 'co_parent'
              : parsed.existing_relation === 'separated_partner'
                ? 'separated'
                : parsed.existing_relation === 'unknown_partner'
                  ? 'unknown'
                  : 'partnered',
    });
  }

  if (['sibling', 'brother', 'sister'].includes(parsed.existing_relation)) {
    await copySiblingParents({
      supabase,
      treeId: parsed.tree_id,
      actorId: user.id,
      targetId: parsed.target_id,
      siblingId: parsed.existing_person_id,
      selectedParentIds: selectedSharedParentIds(formData),
    });
  }

  await writeAuditLog({
    treeId: parsed.tree_id,
    actorId: user.id,
    action: 'existing_person_connected',
    entityType: 'person',
    entityId: parsed.existing_person_id,
    metadata: { target_id: parsed.target_id, relation: parsed.existing_relation },
  });

  revalidatePath(`/tree/${parsed.tree_id}`);
}

async function updatePerson(formData: FormData) {
  'use server';

  const { user } = await requireUser();
  const parsed = parseForm(updatePersonSchema, formData);
  const { supabase, membership } = await assertMember(parsed.tree_id, user.id);
  requireRole(parsed.tree_id, membership.role, contributorRoles);

  const { error } = await supabase
    .from('persons')
    .update({
      display_name: parsed.display_name,
      given_names: parsed.given_names ?? null,
      surname_now: parsed.surname_now ?? null,
      surname_at_birth: parsed.surname_at_birth ?? null,
      nickname: parsed.nickname ?? null,
      gender: parsed.gender ?? null,
      living_status: parsed.living_status,
      birth_date: parsed.birth_date ?? null,
      birth_place: parsed.birth_place ?? null,
      death_date: parsed.death_date ?? null,
      death_place: parsed.death_place ?? null,
      profession: parsed.profession ?? null,
      education: parsed.education ?? null,
      short_bio: parsed.short_bio ?? null,
      notes: parsed.notes ?? null,
      is_private: parsed.is_private,
      updated_by: user.id,
    })
    .eq('tree_id', parsed.tree_id)
    .eq('id', parsed.person_id);

  if (error) redirect(`/tree/${parsed.tree_id}?error=person_update_failed`);

  await writeAuditLog({
    treeId: parsed.tree_id,
    actorId: user.id,
    action: 'person_updated',
    entityType: 'person',
    entityId: parsed.person_id,
  });

  revalidatePath(`/tree/${parsed.tree_id}`);
}

async function createInvitation(formData: FormData) {
  'use server';

  const { user } = await requireUser();
  const { tree_id: treeId, email, role, expires_days: expiresDays } = parseForm(inviteSchema, formData);
  const { supabase } = await assertMember(treeId, user.id);
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();
  const { data: invite, error } = await supabase
    .from('invitations')
    .insert({ tree_id: treeId, invited_email: email, role, token_hash: tokenHash, expires_at: expiresAt, created_by: user.id })
    .select('id')
    .single();

  if (error || !invite) redirect(`/tree/${treeId}?error=invite_failed`);

  await writeAuditLog({
    treeId,
    actorId: user.id,
    action: 'invitation_created',
    entityType: 'invitation',
    entityId: invite.id,
    metadata: { email, role, expires_at: expiresAt },
  });

  revalidatePath(`/tree/${treeId}`);
  redirect(`/tree/${treeId}?invite=${encodeURIComponent(token)}`);
}

export default async function TreePage({ params, searchParams }: { params: Promise<{ treeId: string }>; searchParams: Promise<{ invite?: string; error?: string }> }) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { user } = await requireUser();
  const { supabase, membership } = await assertMember(treeId, user.id);
  const { data: tree } = await supabase.from('family_trees').select('id, name, description, updated_at').eq('id', treeId).maybeSingle();

  if (!tree) notFound();

  const [{ data: persons }, { data: unions }, { data: relationships }] = await Promise.all([
    supabase.from('persons').select('*').eq('tree_id', treeId).order('created_at', { ascending: true }),
    supabase.from('unions').select('*').eq('tree_id', treeId).order('created_at', { ascending: true }),
    supabase.from('parent_child_relationships').select('*').eq('tree_id', treeId).order('created_at', { ascending: true }),
  ]);

  const canManageMembers = editorRoles.includes(membership.role as (typeof editorRoles)[number]);
  const canEditTree = contributorRoles.includes(membership.role as (typeof contributorRoles)[number]);

  const errorMessages: Record<string, string> = {
    sibling_failed: 'The sibling relationship could not be created.',
    relationship_failed: 'The relationship could not be saved.',
    union_failed: 'The partner relationship could not be saved.',
    person_failed: 'The person could not be created.',
    not_authorized: 'You do not have permission to do that.',
  };
  const personCount = persons?.length ?? 0;
  const parentLinkCount = relationships?.length ?? 0;
  const unionCount = unions?.length ?? 0;

  return (
    <SiteShell variant="workspace">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 overflow-hidden rounded-xl border border-[#cddbd8] bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{tree.name}</h1>
                <span className="rounded-md border border-[#d8e7e3] bg-[#f3faf7] px-2 py-1 text-xs font-semibold capitalize text-accent">{membership.role}</span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{tree.description || 'Build the family map one person and one relationship at a time.'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-md bg-[#eef7f5] px-2.5 py-1">{personCount} people</span>
                <span className="rounded-md bg-[#fff2ef] px-2.5 py-1">{unionCount} unions</span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1">{parentLinkCount} parent links</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/tree/${treeId}/members`} className={cn(buttonVariants({ variant: 'outline' }))}>
                Membership
              </a>
              {canManageMembers ? <ShareModal treeId={treeId} action={createInvitation} latestInviteToken={sp.invite} /> : null}
            </div>
          </div>
        </div>

        {sp.error ? (
          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessages[sp.error] ?? `Action failed: ${sp.error}`}
          </div>
        ) : null}

        <div className="min-h-[620px] flex-1 md:min-h-0">
          <FamilyTreeCanvas
            persons={persons ?? []}
            unions={unions ?? []}
            parentChild={relationships ?? []}
            treeId={treeId}
            canEdit={canEditTree}
            createPersonAction={createPersonOrRelative}
            updatePersonAction={updatePerson}
          />
        </div>
      </div>
    </SiteShell>
  );
}

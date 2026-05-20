import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { parseForm, requireUser, writeAuditLog, z } from '@/lib/security';
import { FamilyTreeCanvas } from '@/components/tree/family-tree-canvas';
import { ShareModal } from '@/components/tree/share-modal';

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
    'sibling',
    'adoptive_parent',
    'step_parent',
    'foster_parent',
    'guardian',
  ]),
  display_name: z.string().trim().min(1).max(120),
  gender: optionalText(60),
  living_status: z.enum(['living', 'deceased', 'unknown']).default('unknown'),
  birth_date: optionalText(40),
  death_date: optionalText(40),
  short_bio: optionalText(500),
  create_unknown_parents: z.preprocess((value) => value === 'on' || value === 'true', z.boolean()).default(false),
});

const connectExistingSchema = z.object({
  tree_id: z.string().uuid(),
  target_id: z.string().uuid(),
  existing_person_id: z.string().uuid(),
  existing_relation: z.enum(['parent', 'child', 'partner', 'spouse', 'sibling']),
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
  return 'biological';
}

function defaultGenderForMode(mode: string, gender?: string) {
  if (gender) return gender;
  if (mode === 'father') return 'male';
  if (mode === 'mother') return 'female';
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
  unionType: 'partnered' | 'married' | 'ex_partner';
}) {
  if (input.partner1Id === input.partner2Id) return;

  const { error } = await input.supabase.from('unions').insert({
    tree_id: input.treeId,
    partner1_id: input.partner1Id,
    partner2_id: input.partner2Id,
    union_type: input.unionType,
  });

  if (error) redirect(`/tree/${input.treeId}?error=union_failed`);
}

async function copySiblingParents(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  treeId: string;
  targetId: string;
  siblingId: string;
  createUnknownParents?: boolean;
  actorId: string;
}) {
  const { data: parents, error } = await input.supabase
    .from('parent_child_relationships')
    .select('parent_id, parent_role, union_id')
    .eq('tree_id', input.treeId)
    .eq('child_id', input.targetId);

  if (error) redirect(`/tree/${input.treeId}?error=sibling_failed`);

  if (parents?.length) {
    await Promise.all(
      parents.map((parent) =>
        addParentChild({
          supabase: input.supabase,
          treeId: input.treeId,
          parentId: parent.parent_id,
          childId: input.siblingId,
          parentRole: parent.parent_role,
          unionId: parent.union_id,
        }),
      ),
    );
    return;
  }

  if (!input.createUnknownParents) return;

  const { data: unknownParents, error: unknownError } = await input.supabase
    .from('persons')
    .insert([
      {
        tree_id: input.treeId,
        display_name: 'Unknown parent',
        living_status: 'unknown',
        created_by: input.actorId,
        updated_by: input.actorId,
      },
      {
        tree_id: input.treeId,
        display_name: 'Unknown parent',
        living_status: 'unknown',
        created_by: input.actorId,
        updated_by: input.actorId,
      },
    ])
    .select('id');

  if (unknownError || !unknownParents?.length) redirect(`/tree/${input.treeId}?error=sibling_failed`);

  await Promise.all(
    unknownParents.flatMap((parent) => [
      addParentChild({ supabase: input.supabase, treeId: input.treeId, parentId: parent.id, childId: input.targetId, parentRole: 'unknown' }),
      addParentChild({ supabase: input.supabase, treeId: input.treeId, parentId: parent.id, childId: input.siblingId, parentRole: 'unknown' }),
    ]),
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

  const { data: person, error } = await supabase.from('persons').insert(personPayload(parsed, user.id)).select('id').single();
  if (error || !person) redirect(`/tree/${parsed.tree_id}?error=person_failed`);

  const targetId = parsed.target_id;

  if (targetId) {
    if (['father', 'mother', 'parent', 'adoptive_parent', 'step_parent', 'foster_parent', 'guardian'].includes(parsed.mode)) {
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

    if (['partner', 'spouse', 'ex_partner'].includes(parsed.mode)) {
      await createUnion({
        supabase,
        treeId: parsed.tree_id,
        partner1Id: targetId,
        partner2Id: person.id,
        unionType: parsed.mode === 'spouse' ? 'married' : parsed.mode === 'ex_partner' ? 'ex_partner' : 'partnered',
      });
    }

    if (parsed.mode === 'sibling') {
      await copySiblingParents({
        supabase,
        treeId: parsed.tree_id,
        targetId,
        siblingId: person.id,
        createUnknownParents: parsed.create_unknown_parents,
        actorId: user.id,
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

  if (parsed.existing_relation === 'parent') {
    await addParentChild({
      supabase,
      treeId: parsed.tree_id,
      parentId: parsed.existing_person_id,
      childId: parsed.target_id,
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

  if (parsed.existing_relation === 'partner' || parsed.existing_relation === 'spouse') {
    await createUnion({
      supabase,
      treeId: parsed.tree_id,
      partner1Id: parsed.target_id,
      partner2Id: parsed.existing_person_id,
      unionType: parsed.existing_relation === 'spouse' ? 'married' : 'partnered',
    });
  }

  if (parsed.existing_relation === 'sibling') {
    await copySiblingParents({
      supabase,
      treeId: parsed.tree_id,
      targetId: parsed.target_id,
      siblingId: parsed.existing_person_id,
      actorId: user.id,
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

  return (
    <SiteShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{tree.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{tree.description || 'Build the family map one person and one relationship at a time.'}</p>
          </div>
          <div className="flex gap-2">
            <a href={`/tree/${treeId}/members`}>
              <Button variant="outline">Membership</Button>
            </a>
            {canManageMembers ? <ShareModal treeId={treeId} action={createInvitation} latestInviteToken={sp.invite} /> : null}
          </div>
        </div>

        {sp.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Action failed: {sp.error}</div> : null}

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
    </SiteShell>
  );
}

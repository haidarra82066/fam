import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { z } from 'next/dist/compiled/zod';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfile, isAdminEmail } from '@/lib/auth';

const WINDOW_MS = 60_000;
const MAX_AUTH_ACTIONS = 20;
const requestLog = new Map<string, number[]>();

export { z };

export async function requireUser() {
  const { user, profile } = await getCurrentUserWithProfile();
  if (!user) redirect('/login');
  if (profile?.status !== 'approved') redirect('/pending-approval');
  return { user, profile };
}

export async function requireAdmin() {
  const { user } = await requireUser();
  if (!isAdminEmail(user.email)) redirect('/dashboard');
  return user;
}

export async function assertTreeRole(treeId: string, allowedRoles: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tree_memberships')
    .select('id, role')
    .eq('tree_id', treeId)
    .eq('user_id', (await requireUser()).user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!data || !allowedRoles.includes(data.role)) {
    notAuthorized(treeId);
  }

  return { supabase, membership: data };
}

export function parseForm<T>(schema: { safeParse: (input: unknown) => any }, formData: FormData) {
  const result = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'invalid_request';
    throw new Error(message);
  }
  return result.data;
}

export async function writeAuditLog(input: {
  treeId?: string | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from('audit_logs').insert({
    tree_id: input.treeId ?? null,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function enforceAuthRouteRateLimit(action: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for') ?? 'unknown';
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown';
  const key = createHash('sha256').update(`${ip}:${action}`).digest('hex');
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const attempts = (requestLog.get(key) ?? []).filter((ts) => ts > windowStart);

  if (attempts.length >= MAX_AUTH_ACTIONS) {
    throw new Error('rate_limited');
  }

  attempts.push(now);
  requestLog.set(key, attempts);
}

function notAuthorized(treeId: string): never {
  redirect(`/tree/${treeId}?error=not_authorized`);
}

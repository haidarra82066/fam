import { createClient } from '@/lib/supabase/server';

export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export async function getCurrentUserWithProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, status, created_at, approved_at, approved_by')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile };
}

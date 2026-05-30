import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth';
import { cn } from '@/lib/utils';

const navLinkClass =
  'inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35';

export async function SiteShell({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'workspace';
}) {
  let userEmail: string | null = null;
  const isWorkspace = variant === 'workspace';
  const hasSupabaseEnv =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <div className={isWorkspace ? 'flex min-h-dvh flex-col bg-[#edf4f1]' : 'min-h-dvh bg-transparent'}>
      <header className="sticky top-0 z-40 border-b border-[#dfe8e5] bg-white/88 backdrop-blur-md">
        <div className={isWorkspace ? 'flex w-full items-center gap-3 px-3 py-2.5 sm:px-4' : 'mx-auto flex max-w-7xl items-center gap-3 px-4 py-3'}>
          <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 text-lg font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#d8e7e3] bg-[#eef7f5] text-sm font-bold text-accent">f</span>
            <span className="hidden sm:inline">fam</span>
          </Link>
          <nav className="app-nav-scroll flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto whitespace-nowrap text-sm text-muted sm:gap-2">
            {!userEmail ? (
              <>
                <Link className={navLinkClass} href="/login">Login</Link>
                <Link className={cn(navLinkClass, 'bg-accent font-semibold text-white hover:bg-[#447d84] hover:text-white')} href="/signup">Sign up</Link>
              </>
            ) : (
              <>
                <Link className={navLinkClass} href="/dashboard">Dashboard</Link>
                <Link className={navLinkClass} href="/features">Features</Link>
                {isAdminEmail(userEmail) ? <Link className={navLinkClass} href="/admin/access-requests">Admin</Link> : null}
                <form action="/auth/logout" method="post" className="shrink-0">
                  <button className={navLinkClass} type="submit">Logout</button>
                </form>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className={isWorkspace ? 'flex min-h-0 flex-1 flex-col p-3 sm:p-4' : 'mx-auto w-full max-w-7xl px-4 py-8 sm:py-10'}>{children}</main>
    </div>
  );
}

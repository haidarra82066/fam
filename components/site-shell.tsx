import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth';

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
    <div className={isWorkspace ? 'flex min-h-dvh flex-col bg-[#eef4f2]' : 'min-h-dvh bg-background'}>
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
        <div className={isWorkspace ? 'flex w-full items-center gap-3 px-3 py-2.5 sm:px-4' : 'mx-auto flex max-w-7xl items-center gap-3 px-4 py-3'}>
          <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-slate-950">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f1ef] text-sm font-bold text-accent">f</span>
            <span>fam</span>
          </Link>
          <nav className="app-nav-scroll flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto whitespace-nowrap text-sm text-muted sm:gap-2">
            {!userEmail ? (
              <>
                <Link className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950" href="/login">Login</Link>
                <Link className="shrink-0 rounded-lg bg-accent px-3 py-2 font-semibold text-white hover:bg-[#447d84]" href="/signup">Sign up</Link>
              </>
            ) : (
              <>
                <Link className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950" href="/dashboard">Dashboard</Link>
                <Link className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950" href="/features">Features</Link>
                {isAdminEmail(userEmail) ? <Link className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950" href="/admin/access-requests">Admin</Link> : null}
                <form action="/auth/logout" method="post" className="shrink-0">
                  <button className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-slate-100 hover:text-slate-950" type="submit">Logout</button>
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

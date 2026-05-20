import Link from 'next/link';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">fam</Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}

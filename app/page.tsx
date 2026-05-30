import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Search, Share2, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <SiteShell>
      <section className="grid min-h-[calc(100dvh-9rem)] w-full min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-8 overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
        <div className="w-[90vw] min-w-0 max-w-2xl space-y-6 lg:w-auto">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">fam</h1>
          <p className="max-w-full text-xl leading-8 text-slate-700">A private workspace for building family trees, inviting relatives, and seeing every relationship in context.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className={cn(buttonVariants(), 'w-full sm:w-auto')} href="/signup">Get started</Link>
            <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} href="/login">Log in</Link>
          </div>
        </div>

        <Card className="w-[90vw] min-w-0 max-w-full overflow-hidden border-[#cfdcda] p-0 lg:w-auto">
          <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Family workspace</h2>
              <p className="text-xs text-muted">Relationships update around the selected person.</p>
            </div>
            <div className="flex gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted"><Search className="h-4 w-4" /></span>
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted"><Share2 className="h-4 w-4" /></span>
            </div>
          </div>
          <div className="relative min-h-[420px] bg-[linear-gradient(rgba(79,141,149,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,141,149,0.08)_1px,transparent_1px)] bg-[size:36px_36px] p-6">
            <div className="absolute left-[12%] top-[12%] rounded-lg border border-border bg-white px-4 py-3 shadow-soft">
              <p className="text-sm font-semibold">Marta Klein</p>
              <p className="text-xs text-accent">grandmother</p>
            </div>
            <div className="absolute right-[13%] top-[14%] rounded-lg border border-border bg-white px-4 py-3 shadow-soft">
              <p className="text-sm font-semibold">Jonas Klein</p>
              <p className="text-xs text-accent">grandfather</p>
            </div>
            <div className="absolute left-1/2 top-[48%] -translate-x-1/2 rounded-lg border border-accent bg-white px-4 py-3 shadow-[0_12px_36px_rgba(79,141,149,0.18)] ring-4 ring-accent/10">
              <p className="text-sm font-semibold">Alex Rivera</p>
              <p className="text-xs text-accent">Focus person</p>
            </div>
            <div className="absolute bottom-[12%] left-[16%] rounded-lg border border-border bg-white px-4 py-3 shadow-soft">
              <p className="text-sm font-semibold">Leo Rivera</p>
              <p className="text-xs text-accent">son</p>
            </div>
            <div className="absolute bottom-[14%] right-[12%] w-44 rounded-lg border border-border bg-white p-3 shadow-soft">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700"><Users className="h-4 w-4 text-accent" /> Add relationship</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted">
                <span>Brother</span><span>Spouse</span><span>Co-parent</span><span>Cousin</span>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}

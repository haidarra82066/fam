import type { ReactNode } from 'react';
import { GitBranch, Lock, ShieldCheck, Users } from 'lucide-react';
import { Surface, StatusChip } from '@/components/ui/studio';

export function AuthShell({
  title,
  description,
  children,
  mode,
}: {
  title: string;
  description: string;
  children: ReactNode;
  mode: 'login' | 'signup';
}) {
  return (
    <div className="grid min-h-[calc(100dvh-9rem)] w-full grid-cols-[minmax(0,1fr)] items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,440px)]">
      <div className="relative hidden min-h-[520px] overflow-hidden rounded-lg border border-[#d4e2df] bg-[#f8fbfa] p-7 shadow-panel lg:block">
        <div className="genealogy-grid absolute inset-0 opacity-80" />
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight text-slate-950">Enter the studio with a private family archive.</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Every account starts with protected access, then opens into dashboards, trees, invitations, and relationship tools.
          </p>
        </div>
        <div className="absolute bottom-7 left-7 right-7 z-10 grid gap-3">
          <div className="rounded-lg border border-[#dfe8e5] bg-white/92 p-4 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef7f5] text-accent">
                {mode === 'login' ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-semibold text-slate-950">{mode === 'login' ? 'Secure return' : 'Approval-first access'}</p>
                <p className="text-sm text-muted">{mode === 'login' ? 'Continue your latest family workspace.' : 'Admins approve new accounts before private trees open.'}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatusChip tone="accent" className="justify-center"><GitBranch className="mr-1 h-3.5 w-3.5" /> Trees</StatusChip>
            <StatusChip tone="clay" className="justify-center"><Users className="mr-1 h-3.5 w-3.5" /> Roles</StatusChip>
            <StatusChip tone="warning" className="justify-center"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Audit</StatusChip>
          </div>
        </div>
      </div>

      <Surface variant="hero" className="mx-auto w-full max-w-md space-y-5 p-5 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {children}
      </Surface>
    </div>
  );
}

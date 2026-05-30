import Link from 'next/link';
import { Clock3, MailCheck, ShieldCheck } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { buttonVariants } from '@/components/ui/button';
import { Surface, StatusChip } from '@/components/ui/studio';
import { cn } from '@/lib/utils';

export default function PendingApprovalPage() {
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100dvh-9rem)] w-full place-items-center">
        <Surface variant="hero" className="w-full max-w-2xl overflow-hidden p-0 text-center">
          <div className="archive-lines p-6 sm:p-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-[#d8e7e3] bg-white text-accent shadow-soft">
              <Clock3 className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-3xl font-semibold text-slate-950">Pending approval</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
              Your account was created and is waiting for an admin to grant access to private family workspaces.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <StatusChip tone="warning" className="justify-center"><MailCheck className="mr-1.5 h-3.5 w-3.5" /> Watch your inbox</StatusChip>
              <StatusChip tone="accent" className="justify-center"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Protected access</StatusChip>
            </div>
            <Link className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 w-full sm:w-auto')} href="/login">Back to login</Link>
          </div>
        </Surface>
      </div>
    </SiteShell>
  );
}

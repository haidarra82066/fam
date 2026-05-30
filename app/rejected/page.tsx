import Link from 'next/link';
import { CircleAlert, Mail, ShieldX } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { buttonVariants } from '@/components/ui/button';
import { Surface, StatusChip } from '@/components/ui/studio';
import { cn } from '@/lib/utils';

export default function RejectedPage() {
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100dvh-9rem)] w-full place-items-center">
        <Surface variant="hero" className="w-full max-w-2xl overflow-hidden p-0 text-center">
          <div className="archive-lines p-6 sm:p-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 shadow-soft">
              <ShieldX className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-3xl font-semibold text-slate-950">Access request rejected</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
              Your account request was not approved. Contact an administrator if this was unexpected.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <StatusChip tone="danger" className="justify-center"><CircleAlert className="mr-1.5 h-3.5 w-3.5" /> Access closed</StatusChip>
              <StatusChip tone="neutral" className="justify-center"><Mail className="mr-1.5 h-3.5 w-3.5" /> Contact admin</StatusChip>
            </div>
            <Link className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 w-full sm:w-auto')} href="/login">Back to login</Link>
          </div>
        </Surface>
      </div>
    </SiteShell>
  );
}

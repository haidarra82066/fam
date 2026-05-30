import Link from 'next/link';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Surface, StatusChip } from '@/components/ui/studio';
import { cn } from '@/lib/utils';

export function ComingSoonLayout({
  title,
  summary,
  highlights,
  privacyNotes,
  caution,
}: {
  title: string;
  summary: string;
  highlights: string[];
  privacyNotes: string[];
  caution?: string;
}) {
  return (
    <div className="space-y-6">
      <Surface variant="hero" className="archive-lines p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <StatusChip tone="warning"><Clock3 className="mr-1.5 h-3.5 w-3.5" /> Coming soon</StatusChip>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{summary}</p>
          </div>
          <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} href="/features">
            <ArrowLeft className="h-4 w-4" />
            Back to feature hub
          </Link>
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Planned experience</h2>
          <ul className="space-y-2 text-sm text-muted">
            {highlights.map((item) => <li key={item} className="rounded-md bg-[#f8fbfa] px-3 py-2">{item}</li>)}
          </ul>
        </Surface>
        <Surface className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Privacy notes</h2>
          <ul className="space-y-2 text-sm text-muted">
            {privacyNotes.map((item) => <li key={item} className="rounded-md bg-[#f8fbfa] px-3 py-2">{item}</li>)}
          </ul>
          {caution ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{caution}</p> : null}
        </Surface>
      </div>
    </div>
  );
}

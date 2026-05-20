import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-8 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Coming soon</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/80">{summary}</p>
        <div className="mt-5 flex gap-3">
          <Button disabled>Coming soon</Button>
          <Link href="/features"><Button variant="outline">Back to feature hub</Button></Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Planned experience</h2>
          <ul className="space-y-2 text-sm text-muted">
            {highlights.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Privacy notes</h2>
          <ul className="space-y-2 text-sm text-muted">
            {privacyNotes.map((item) => <li key={item}>• {item}</li>)}
          </ul>
          {caution ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{caution}</p> : null}
        </Card>
      </div>
    </div>
  );
}

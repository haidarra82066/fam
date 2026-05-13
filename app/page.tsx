import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <SiteShell>
      <section className="space-y-8">
        <div className="space-y-4 text-center md:text-left">
          <p className="text-sm font-medium text-accent">Build your family story</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">A calm, modern home for your family trees.</h1>
          <p className="max-w-2xl text-muted">Invite family members, organize generations, and shape relationships visually with a simple workflow.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/signup"><Button>Get started</Button></Link>
            <Link href="/login"><Button variant="outline">Log in</Button></Link>
          </div>
        </div>
        <Card className="p-8">
          <h2 className="text-lg font-semibold">Empty state preview</h2>
          <p className="mt-2 text-sm text-muted">No trees yet. Create your first family tree after account approval.</p>
        </Card>
      </section>
    </SiteShell>
  );
}

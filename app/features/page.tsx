import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { Card } from '@/components/ui/card';
import { featureFlags } from '@/lib/feature-flags';

const items = [
  { href: '/features/ai-family-assistant', title: 'AI Family Assistant', desc: 'Chat with AI to add relatives, clean duplicates, and ask questions about your tree.', key: 'aiFamilyAssistant' as const },
  { href: '/features/family-reports', title: 'Family Reports', desc: 'Insightful reports on generations, migration, surnames, and missing data.', key: 'familyReports' as const },
  { href: '/features/family-asset-manager', title: 'Family Asset Manager', desc: 'Track current and historical ownership, documents, and transfer timelines.', key: 'familyAssetManager' as const },
  { href: '/features/visual-export-studio', title: 'Visual Export Studio', desc: 'Create premium visuals and export branches or entire trees to PDF/SVG/PNG.', key: 'visualExportStudio' as const },
  { href: '/features/family-storytelling', title: 'Family Storytelling', desc: 'AI-guided personalized narratives with controls for tone, depth, and timeline.', key: 'familyStorytelling' as const },
  { href: '/features/dna-connections', title: 'DNA Connections', desc: 'Future privacy-first integrations with DNA providers, opt-in only.', key: 'dnaConnections' as const },
  { href: '/features/health-history', title: 'Health History', desc: 'Private-by-default family health history tools with strict caution guardrails.', key: 'healthHistory' as const },
];

export default function FeaturesHubPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <Card className="border-0 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 p-8 text-white shadow-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Feature hub</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Coming Soon</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/80">We’re building advanced modules carefully. You can preview each roadmap feature, privacy approach, and intended scope—without any fake or risky functionality today.</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full space-y-3 border-border/80 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <span className="rounded-full border px-2 py-1 text-xs">{featureFlags[item.key] ? 'Enabled' : 'Coming soon'}</span>
                </div>
                <p className="text-sm text-muted">{item.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

import Link from 'next/link';
import { ArrowRight, Boxes, Clock3 } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { Surface, StatusChip } from '@/components/ui/studio';
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
        <Surface variant="hero" className="archive-lines p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Boxes className="h-4 w-4" />
                Feature hub
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">Coming Soon</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                We're building advanced modules carefully. Preview each roadmap feature, privacy approach, and intended scope without fake or risky functionality today.
              </p>
            </div>
            <StatusChip tone="warning" className="shrink-0"><Clock3 className="mr-1.5 h-3.5 w-3.5" /> Roadmap</StatusChip>
          </div>
        </Surface>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
              <Surface className="flex h-full min-h-40 flex-col justify-between p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.desc}</p>
                  </div>
                  <StatusChip tone={featureFlags[item.key] ? 'success' : 'neutral'}>{featureFlags[item.key] ? 'Enabled' : 'Coming soon'}</StatusChip>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  View detail
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Surface>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

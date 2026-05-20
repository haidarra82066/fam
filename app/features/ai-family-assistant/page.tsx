import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() {
  return <SiteShell><ComingSoonLayout title='AI Family Assistant' summary='A guided assistant to help you maintain your tree with natural language: add relatives, merge likely duplicates, and answer tree questions.' highlights={[
    'Ask AI to suggest relationships and potential placements.',
    'Review duplicate-detection suggestions before any merge.',
    'Get concise answers grounded in your own tree data.',
  ]} privacyNotes={[
    'No automatic edits without explicit user confirmation.',
    'Data minimization and clear auditability for AI-assisted actions.',
    'Feature remains disabled until safety controls are finalized.',
  ]} /></SiteShell>;
}

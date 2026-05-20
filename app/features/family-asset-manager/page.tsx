import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() { return <SiteShell><ComingSoonLayout title='Family Asset Manager' summary='Track family-owned assets and ownership history over time in a structured, collaborative workspace.' highlights={[
  'Asset profile cards with key metadata and attachments.',
  'Current owners plus historical ownership timelines.',
  'Transfer events and supporting document references.',
]} privacyNotes={[
  'No financial execution or valuation advice features.',
  'Access controls will follow tree membership roles.',
  'Sensitive records will support restricted visibility options.',
]} /></SiteShell>; }

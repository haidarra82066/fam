import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() { return <SiteShell><ComingSoonLayout title='DNA Connections' summary='Future integrations for importing DNA relationship hints from supported platforms with strict opt-in controls.' highlights={[
  'Consent-driven imports from connected DNA providers.',
  'Potential-match hints shown as suggestions, not facts.',
  'Dedicated review flow before any tree updates.',
]} privacyNotes={[
  'Privacy-first and opt-in only; no automatic data ingest.',
  'No DNA analysis is active in this release.',
  'Existing placeholder schema remains unused for live collection.',
]} /></SiteShell>; }

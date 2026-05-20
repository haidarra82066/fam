import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() { return <SiteShell><ComingSoonLayout title='Health History' summary='Private-by-default family health history workspace designed for careful record-keeping and future caution-first insights.' highlights={[
  'Structured family health history entries with access controls.',
  'Branch-level privacy and sharing controls.',
  'Future optional risk insight tooling with conservative safeguards.',
]} privacyNotes={[
  'No health data collection is enabled by this release.',
  'Feature will remain private-by-default when launched.',
  'No diagnosis functionality is offered.',
]} caution='Important: This feature is not medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals.' /></SiteShell>; }

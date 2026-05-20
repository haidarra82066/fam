import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() { return <SiteShell><ComingSoonLayout title='Family Reports' summary='Generate polished reports on family structure and data quality to help your family collaborate on what to fill in next.' highlights={[
  'Generational depth and branch coverage summaries.',
  'Surname and migration trend overviews.',
  'Missing data inventory (dates, places, relationships).',
]} privacyNotes={[
  'Reports only include data your role can access.',
  'No hidden-member or private-field leakage across permissions.',
  'Export controls will be role-aware and logged.',
]} /></SiteShell>; }

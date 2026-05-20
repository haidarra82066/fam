import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() { return <SiteShell><ComingSoonLayout title='Visual Export Studio' summary='Design beautiful family visuals from full trees or selected branches, ready for digital sharing and print.' highlights={[
  'Curated visual themes for clean family posters.',
  'Exports planned for PDF, SVG, and PNG.',
  'Future optional printed visual ordering workflow.',
]} privacyNotes={[
  'Exports will honor private-profile visibility settings.',
  'No background processing of hidden data for unauthorized users.',
  'Large exports will include clear access and audit checks.',
]} /></SiteShell>; }

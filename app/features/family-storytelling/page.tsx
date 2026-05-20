import { SiteShell } from '@/components/site-shell';
import { ComingSoonLayout } from '@/components/features/coming-soon-layout';

export default function Page() { return <SiteShell><ComingSoonLayout title='Family Storytelling' summary='AI-guided narrative generation to turn your family data into meaningful stories for reunions, keepsakes, and learning.' highlights={[
  'Choose tone, depth, people, and timeline focus.',
  'Generate drafts users can edit before sharing.',
  'Support branch-specific narratives and highlights.',
]} privacyNotes={[
  'Narrative generation will use explicit, user-scoped inputs.',
  'No automatic publishing to members without review.',
  'Story drafts remain editable and attributable.',
]} /></SiteShell>; }

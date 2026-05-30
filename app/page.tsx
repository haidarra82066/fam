import Link from 'next/link';
import { ArrowRight, GitBranch, Heart, Lock, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { buttonVariants } from '@/components/ui/button';
import { Surface, StatusChip } from '@/components/ui/studio';
import { cn } from '@/lib/utils';

const previewPeople = [
  { name: 'Marta Klein', relation: 'grandmother', className: 'left-[7%] top-[17%]' },
  { name: 'Jonas Klein', relation: 'grandfather', className: 'right-[10%] top-[18%]' },
  { name: 'Alex Rivera', relation: 'Focus person', className: 'left-1/2 top-[44%] -translate-x-1/2 border-accent ring-4 ring-accent/10' },
  { name: 'Mila Rivera', relation: 'sister', className: 'left-[12%] bottom-[18%]' },
  { name: 'Leo Rivera', relation: 'son', className: 'right-[14%] bottom-[16%]' },
];

export default function HomePage() {
  return (
    <SiteShell>
      <div className="space-y-10">
        <section className="relative min-h-[calc(100dvh-12rem)] overflow-hidden rounded-lg border border-[#d4e2df] bg-[#f8fbfa] px-4 py-8 shadow-panel sm:px-8 lg:px-10">
          <div className="genealogy-grid absolute inset-0 opacity-80" />
          <div className="absolute inset-y-8 right-0 hidden w-full max-w-3xl lg:block">
            <div className="relative h-full min-h-[460px]">
              <div className="absolute left-[19%] right-[20%] top-[31%] h-px bg-[#9dbdb8]" />
              <div className="absolute left-1/2 top-[31%] h-[24%] w-px bg-[#9dbdb8]" />
              <div className="absolute bottom-[29%] left-[22%] right-[24%] h-px bg-[#c8aaa4]" />
              {previewPeople.map((person) => (
                <div
                  key={person.name}
                  className={cn('absolute w-44 rounded-lg border border-[#dfe8e5] bg-white/95 p-3 shadow-soft backdrop-blur', person.className)}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef7f5] text-xs font-semibold text-[#275f66]">
                      {person.name.split(' ').map((part) => part[0]).join('')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950">{person.name}</span>
                      <span className="block truncate text-xs font-medium text-accent">{person.relation}</span>
                    </span>
                  </div>
                </div>
              ))}
              <Surface variant="default" className="absolute bottom-[7%] right-[8%] w-56 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <UserPlus className="h-4 w-4 text-accent" />
                  Add relationship
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span className="rounded-md bg-[#eef7f5] px-2 py-1">Brother</span>
                  <span className="rounded-md bg-[#fff4f1] px-2 py-1">Spouse</span>
                  <span className="rounded-md bg-[#fff8e7] px-2 py-1">Cousin</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">In-law</span>
                </div>
              </Surface>
            </div>
          </div>

          <div className="relative z-10 flex max-w-xl flex-col justify-start py-8 pt-10 sm:min-h-[calc(100dvh-14rem)] sm:justify-center sm:pt-8">
            <h1 className="text-5xl font-semibold leading-none text-slate-950 sm:text-6xl">fam</h1>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              A private Genealogy Studio for building family trees, inviting relatives, and seeing every relationship from the person you select.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className={cn(buttonVariants(), 'w-full sm:w-auto')} href="/signup">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} href="/login">Log in</Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatusChip tone="accent" className="justify-center"><Lock className="mr-1.5 h-3.5 w-3.5" /> Private</StatusChip>
              <StatusChip tone="clay" className="justify-center"><Users className="mr-1.5 h-3.5 w-3.5" /> Collaborative</StatusChip>
              <StatusChip tone="warning" className="justify-center"><GitBranch className="mr-1.5 h-3.5 w-3.5" /> Derived kinship</StatusChip>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Search, title: 'Relationship context', text: 'Select any person and labels update around them, from siblings and cousins to in-laws and great-grandparents.' },
            { icon: ShieldCheck, title: 'Approval-first access', text: 'New accounts wait for approval, and every tree keeps roles for viewers, contributors, editors, and owners.' },
            { icon: Heart, title: 'Built for real families', text: 'Parent-child links and unions stay normalized, so the app can grow without messy manual labels.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Surface key={item.title} className="p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef7f5] text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
              </Surface>
            );
          })}
        </section>
      </div>
    </SiteShell>
  );
}

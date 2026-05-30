'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { Surface, StatusChip } from '@/components/ui/studio';
import { cn } from '@/lib/utils';

export type SetupStep = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  href?: string;
  actionLabel?: string;
};

export function SetupChecklist({
  storageKey,
  title = 'Set up your family workspace',
  steps,
  className,
}: {
  storageKey: string;
  title?: string;
  steps: SetupStep[];
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(storageKey) === 'dismissed');
  }, [storageKey]);

  const completeCount = useMemo(() => steps.filter((step) => step.complete).length, [steps]);
  const progress = steps.length ? Math.round((completeCount / steps.length) * 100) : 0;
  const nextStep = steps.find((step) => !step.complete);

  if (dismissed || completeCount === steps.length) return null;

  function dismiss() {
    window.localStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  }

  return (
    <Surface variant="subtle" className={cn('overflow-hidden p-0', className)}>
      <div className="flex flex-col gap-4 border-b border-[#dfe8e5] bg-white/80 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <StatusChip tone="accent">{completeCount} of {steps.length} complete</StatusChip>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">
            {nextStep ? nextStep.description : 'Your studio is ready for everyday family work.'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss setup checklist"
          className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-lg border border-border bg-white text-muted transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-1 bg-[#e5eeeb]">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.complete ? CheckCircle2 : Circle;
          const content = (
            <div
              className={cn(
                'flex h-full min-h-24 gap-3 rounded-lg border bg-white p-3 transition',
                step.complete ? 'border-emerald-100 bg-emerald-50/45' : 'border-[#dfe8e5] hover:border-accent/60',
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', step.complete ? 'text-emerald-600' : 'text-muted')} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{step.description}</p>
                {!step.complete && step.href && step.actionLabel ? <p className="mt-2 text-xs font-semibold text-accent">{step.actionLabel}</p> : null}
              </div>
            </div>
          );

          if (step.complete || !step.href) return <div key={step.id}>{content}</div>;

          return (
            <Link key={step.id} href={step.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
              {content}
            </Link>
          );
        })}
      </div>
    </Surface>
  );
}

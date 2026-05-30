import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SurfaceVariant = 'default' | 'subtle' | 'inset' | 'hero' | 'danger';

const surfaceVariants: Record<SurfaceVariant, string> = {
  default: 'border-border bg-card shadow-soft',
  subtle: 'border-[#dbe6e3] bg-[#f8fbfa] shadow-sm',
  inset: 'border-[#dfe8e5] bg-[#eef5f2]',
  hero: 'border-[#cddbd8] bg-white shadow-[0_24px_70px_rgba(24,38,43,0.09)]',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export function Surface({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: SurfaceVariant }) {
  return <div className={cn('rounded-lg border', surfaceVariants[variant], className)} {...props} />;
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d8e7e3] bg-[#eef7f5] text-accent">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <h1 className="min-w-0 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{title}</h1>
        </div>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon?: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <Surface variant="subtle" className={cn('grid min-h-56 place-items-center border-dashed p-6 text-center', className)}>
      <div className="max-w-md">
        {Icon ? (
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[#d8e7e3] bg-white text-accent shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        {action || secondaryAction ? (
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'clay';

const statusTones: Record<StatusTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  accent: 'border-[#d8e7e3] bg-[#eef7f5] text-accent',
  clay: 'border-[#f0d9d4] bg-[#fff4f1] text-[#a5574e]',
};

export function StatusChip({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: StatusTone }) {
  return <span className={cn('inline-flex min-h-8 items-center whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold', statusTones[tone], className)} {...props} />;
}

export function FieldFrame({
  label,
  description,
  error,
  children,
  className,
}: {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block text-sm font-medium text-slate-700', className)}>
      <span>{label}</span>
      {description ? <span className="mt-0.5 block text-xs font-normal leading-5 text-muted">{description}</span> : null}
      <span className="mt-1 block">{children}</span>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

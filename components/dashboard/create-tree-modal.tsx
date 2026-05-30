'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export function CreateTreeModal({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button onClick={() => modalRef.current?.showModal()} type="button" className="w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        Create tree
      </Button>
      <dialog ref={modalRef} className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/35 backdrop:backdrop-blur-sm">
        <form action={action} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Create family tree</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Add a name and optional description.</p>
            </div>
            <button type="button" className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-border text-muted hover:bg-slate-50" onClick={() => modalRef.current?.close()} aria-label="Close create tree dialog">
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Tree name
            <input required name="name" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Rivera family" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea name="description" className="mt-1 min-h-28 w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Who this workspace is for, and what relatives should know." />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => modalRef.current?.close()}>Cancel</button>
            <Button>
              <Plus className="h-4 w-4" />
              Create tree
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

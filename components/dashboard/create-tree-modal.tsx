'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';

export function CreateTreeModal({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button onClick={() => modalRef.current?.showModal()} type="button">Create tree</Button>
      <dialog ref={modalRef} className="w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/35">
        <form action={action} className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Create family tree</h2>
            <p className="text-sm text-muted">Add a name and optional description.</p>
          </div>
          <input required name="name" className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Tree name" />
          <textarea name="description" className="min-h-24 w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Description (optional)" />
          <div className="flex justify-end gap-2">
            <button type="button" className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => modalRef.current?.close()}>Cancel</button>
            <Button>Create tree</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';

export function CreateTreeModal({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button onClick={() => modalRef.current?.showModal()} type="button">Create tree</Button>
      <dialog ref={modalRef} className="w-full max-w-md rounded-xl border border-border bg-white p-0 backdrop:bg-black/30">
        <form action={action} className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold">Create family tree</h2>
            <p className="text-sm text-muted">Add a name and optional description.</p>
          </div>
          <input required name="name" className="w-full rounded-xl border border-border bg-white px-3 py-2" placeholder="Tree name" />
          <textarea name="description" className="min-h-20 w-full rounded-xl border border-border bg-white px-3 py-2" placeholder="Description (optional)" />
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm" onClick={() => modalRef.current?.close()}>Cancel</button>
            <Button>Create tree</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

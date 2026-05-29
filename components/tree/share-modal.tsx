'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  treeId: string;
  action: (formData: FormData) => void;
  latestInviteToken?: string;
};

const roleDescriptions: Record<string, string> = {
  viewer: 'Can read the family tree but cannot edit.',
  contributor: 'Can add notes/proposed persons where contributor actions are enabled.',
  editor: 'Can edit persons, relationships, and manage invitations/members.',
};

export function ShareModal({ treeId, action, latestInviteToken }: Props) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const inviteLink = useMemo(() => latestInviteToken && origin ? `${origin}/invite/${latestInviteToken}` : '', [latestInviteToken, origin]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return <>
    <Button type="button" onClick={() => setOpen(true)}>Share</Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl sm:rounded-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Share this tree</h2>
            <p className="mt-1 text-sm text-muted">Invite approved relatives as viewers, contributors, or editors.</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </div>
        <form action={action} className="space-y-3">
          <input type='hidden' name='tree_id' value={treeId} />
          <input name="email" type="email" required placeholder="family@example.com" className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent" />
          <select name="role" className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent" defaultValue="viewer">
            <option value='viewer'>viewer</option><option value='contributor'>contributor</option><option value='editor'>editor</option>
          </select>
          <input name="expires_days" aria-label="Invite expiration days" type="number" min={1} max={30} defaultValue={7} className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent" />
          <Button className="w-full">Create invite</Button>
        </form>
        <div className="mt-4 space-y-1 rounded-lg bg-[#f8fbfa] p-3 text-xs text-muted">{Object.entries(roleDescriptions).map(([role, text]) => <p key={role}><b>{role}:</b> {text}</p>)}</div>
        {inviteLink ? <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold text-slate-900">Invite link</p>
          <input readOnly value={inviteLink} className="min-h-10 w-full rounded-lg border border-border px-2 py-1 text-xs" />
          <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy invite link</Button>
          <img className="rounded-lg border border-border" alt="Invite QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`} />
        </div> : null}
      </div>
    </div> : null}
  </>;
}

'use client';

import { useMemo, useState } from 'react';
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
  const inviteLink = useMemo(() => latestInviteToken ? `${window.location.origin}/invite/${latestInviteToken}` : '', [latestInviteToken]);

  return <>
    <Button type='button' onClick={() => setOpen(true)}>Share</Button>
    {open ? <div className='fixed inset-0 z-50 grid place-items-center bg-black/40 p-4'>
      <div className='w-full max-w-lg rounded-xl bg-white p-5 space-y-4'>
        <h2 className='text-xl font-semibold'>Share this tree</h2>
        <p className='text-sm text-muted'>Owner: full control. Editor: manage members/edit tree. Contributor: add notes/proposals. Viewer: read-only.</p>
        <form action={action} className='space-y-3'>
          <input type='hidden' name='tree_id' value={treeId} />
          <input name='email' type='email' required placeholder='family@example.com' className='w-full rounded border px-3 py-2' />
          <select name='role' className='w-full rounded border px-3 py-2' defaultValue='viewer'>
            <option value='viewer'>viewer</option><option value='contributor'>contributor</option><option value='editor'>editor</option>
          </select>
          <input name='expires_days' type='number' min={1} max={90} defaultValue={7} className='w-full rounded border px-3 py-2' />
          <Button>Create invite</Button>
        </form>
        <div className='text-xs space-y-1 text-muted'>{Object.entries(roleDescriptions).map(([role, text]) => <p key={role}><b>{role}:</b> {text}</p>)}</div>
        {inviteLink ? <div className='space-y-2 rounded border p-3'>
          <p className='text-sm'>Invite link</p>
          <input readOnly value={inviteLink} className='w-full rounded border px-2 py-1 text-xs' />
          <Button type='button' variant='outline' onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy invite link</Button>
          <img alt='Invite QR code' src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`} />
        </div> : null}
        <Button type='button' variant='outline' onClick={() => setOpen(false)}>Close</Button>
      </div>
    </div> : null}
  </>;
}

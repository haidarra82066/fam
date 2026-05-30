'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldFrame, StatusChip, Surface } from '@/components/ui/studio';
import { Check, Copy, Send, ShieldCheck, X } from 'lucide-react';

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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const inviteLink = useMemo(() => latestInviteToken && origin ? `${origin}/invite/${latestInviteToken}` : '', [latestInviteToken, origin]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    } catch {
      setCopyStatus('idle');
    }
  }

  return <>
    <Button type="button" onClick={() => setOpen(true)}>
      <Send className="h-4 w-4" />
      Share
    </Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-lg sm:pb-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <ShieldCheck className="h-4 w-4" />
              Managed access
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Share this tree</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Invite approved relatives as viewers, contributors, or editors.</p>
          </div>
          <button type="button" className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-border text-muted hover:bg-slate-50" onClick={() => setOpen(false)} aria-label="Close share dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={action} className="space-y-3 rounded-lg border border-[#dfe9e7] bg-[#f8fbfa] p-3">
          <input type='hidden' name='tree_id' value={treeId} />
          <FieldFrame label="Email">
            <input name="email" type="email" autoComplete="email" required placeholder="family@example.com" className="studio-field" />
          </FieldFrame>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
            <FieldFrame label="Role">
              <select name="role" className="studio-field capitalize" defaultValue="viewer">
                <option value='viewer'>viewer</option><option value='contributor'>contributor</option><option value='editor'>editor</option>
              </select>
            </FieldFrame>
            <FieldFrame label="Expires">
              <input name="expires_days" aria-label="Invite expiration days" type="number" min={1} max={30} defaultValue={7} className="studio-field" />
            </FieldFrame>
          </div>
          <Button className="w-full">
            <Send className="h-4 w-4" />
            Create invite
          </Button>
        </form>
        <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">{Object.entries(roleDescriptions).map(([role, text]) => (
          <Surface key={role} className="p-3">
            <p className="font-semibold capitalize text-slate-900">{role}</p>
            <p className="mt-1 leading-5">{text}</p>
          </Surface>
        ))}</div>
        {inviteLink ? <Surface className="mt-4 space-y-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Invite link</p>
            <StatusChip tone={copyStatus === 'copied' ? 'success' : 'neutral'}>{copyStatus === 'copied' ? 'Copied' : 'Ready'}</StatusChip>
          </div>
          <input readOnly value={inviteLink} className="studio-field bg-slate-50 text-xs" />
          <Button type="button" variant="outline" onClick={copyInviteLink} className="w-full">
            {copyStatus === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copyStatus === 'copied' ? 'Copied' : 'Copy invite link'}
          </Button>
          <img className="mx-auto rounded-lg border border-border" alt="Invite QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`} />
        </Surface> : null}
      </div>
    </div> : null}
  </>;
}

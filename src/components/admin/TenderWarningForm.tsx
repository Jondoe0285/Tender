'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';

export function TenderWarningForm({ tenderId }: { tenderId: string }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function issueWarning(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/super-user/tenders/${encodeURIComponent(tenderId)}/warning`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, note }) });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to issue warning.');
    setReason('');
    setNote('');
    setMessage('Warning issued to the tender owner.');
  }

  return <form onSubmit={issueWarning} className="space-y-4">
    {message && <p role="status" className="rounded-md border border-steel-blue/20 bg-steel-blue/5 px-3 py-2 text-sm text-steel-blue">{message}</p>}
    <div><Label htmlFor="warning-reason">Reason</Label><Input id="warning-reason" required minLength={3} maxLength={160} value={reason} onChange={(event) => setReason(event.target.value)} /></div>
    <div><Label htmlFor="warning-note">Review note</Label><Textarea id="warning-note" required minLength={3} maxLength={1000} rows={5} value={note} onChange={(event) => setNote(event.target.value)} /></div>
    <Button type="submit" variant="danger" loading={saving}>Issue warning</Button>
  </form>;
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Request = { id: string; type: string; status: string; title: string; description: string; reviewNote: string | null; createdAt: string };

export function SupportRequestPanel({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/support-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: form.get('type'), title: form.get('title'), description: form.get('description') }) });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to submit your request.');
    setRequests((current) => [data.request, ...current]);
    event.currentTarget.reset();
    setMessage('Request submitted for review.');
  }

  return <div className="mx-auto max-w-3xl space-y-6"><Card><h2 className="font-heading text-xl font-bold text-foundation-navy">Support and change request</h2><p className="mt-2 text-sm text-concrete-grey">Do not include passwords, payment card details, full site addresses, or contact details for another party.</p><form onSubmit={submit} className="mt-5 grid gap-4"><label className="text-sm font-semibold text-foundation-navy">Request type<select name="type" required className="mt-1 w-full rounded-md border border-slate-300 p-2 text-foundation-navy"><option value="SUPPORT">Support incident</option><option value="CHANGE">Change or amendment</option><option value="PAYMENT">Payment query</option><option value="DATA_PRIVACY">Data or privacy request</option></select></label><label className="text-sm font-semibold text-foundation-navy">Subject<input name="title" required minLength={5} maxLength={120} className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label><label className="text-sm font-semibold text-foundation-navy">Request details<textarea name="description" required minLength={20} maxLength={2000} rows={6} className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>{message && <p role="status" className="text-sm font-semibold text-steel-blue">{message}</p>}<Button type="submit" loading={busy}>Submit request</Button></form></Card><Card><h2 className="font-heading text-xl font-bold text-foundation-navy">Your requests</h2><div className="mt-4 space-y-3">{requests.length === 0 ? <p className="text-sm text-concrete-grey">No requests submitted.</p> : requests.map((request) => <div key={request.id} className="border-t border-slate-200 pt-3"><p className="font-semibold text-foundation-navy">{request.title}</p><p className="text-xs font-semibold text-steel-blue">{request.type} · {request.status}</p><p className="mt-1 text-sm text-concrete-grey">{request.description}</p>{request.reviewNote && <p className="mt-2 text-sm text-foundation-navy">Review: {request.reviewNote}</p>}</div>)}</div></Card></div>;
}
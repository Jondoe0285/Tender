'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type User = { id: string; email: string; contactName: string };
type WaiverFeeType = 'RETAILER_UNLOCK' | 'CLIENT_RELEASE';
type Waiver = {
  id: string; feeType: string; reason: string; grantedAt: Date; expiresAt: Date | null; revokedAt: Date | null; revocationReason: string | null;
  user: User; grantedBy: { contactName: string }; revokedBy: { contactName: string } | null; _count: { payments: number };
};

export function PaymentWaiverPanel({ initialUsers, initialWaivers }: { initialUsers: User[]; initialWaivers: Waiver[] }) {
  const [form, setForm] = useState({ userId: '', feeType: 'RETAILER_UNLOCK' as WaiverFeeType, reason: '', expiresAt: '' });
  const [waivers, setWaivers] = useState(initialWaivers);
  const [revocations, setRevocations] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function grant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/super-user/owner/payment-waivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T00:00:00.000Z`).toISOString() : null }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Unable to grant payment waiver');
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to grant payment waiver'); } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/super-user/owner/payment-waivers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: revocations[id] ?? '' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Unable to revoke payment waiver');
      setWaivers((current) => current.map((waiver) => waiver.id === id ? { ...waiver, revokedAt: new Date(), revocationReason: revocations[id] ?? '', revokedBy: { contactName: 'Owner' } } : waiver));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to revoke payment waiver'); } finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-6"><Card><h2 className="font-heading text-xl font-bold text-foundation-navy">Payment waivers</h2><p className="mt-1 text-sm text-concrete-grey">Owner-only per-user waivers create a confirmed zero-value payment and audit event for every use.</p>{message && <p role="alert" className="mt-4 text-sm font-semibold text-attention">{message}</p>}<form onSubmit={grant} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm text-concrete-grey"><span className="mb-1 block font-medium text-foundation-navy">User</span><select required value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy"><option value="">Select a user</option>{initialUsers.map((user) => <option key={user.id} value={user.id}>{user.contactName} ({user.email})</option>)}</select></label><label className="text-sm text-concrete-grey"><span className="mb-1 block font-medium text-foundation-navy">Fee type</span><select value={form.feeType} onChange={(event) => setForm((current) => ({ ...current, feeType: event.target.value as WaiverFeeType }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy"><option value="RETAILER_UNLOCK">Provider tender unlock</option><option value="CLIENT_RELEASE">Accepted quote release</option></select></label><label className="text-sm text-concrete-grey md:col-span-2"><span className="mb-1 block font-medium text-foundation-navy">Reason</span><textarea required minLength={10} maxLength={1000} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy" /></label><label className="text-sm text-concrete-grey"><span className="mb-1 block font-medium text-foundation-navy">Expiry</span><input type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy" /><span className="mt-1 block text-xs">Leave blank for no expiry.</span></label><div className="flex items-end"><Button type="submit" loading={busy}>Grant waiver</Button></div></form></Card><Card className="divide-y divide-slate-100 p-0">{waivers.length === 0 ? <p className="px-6 py-8 text-sm text-concrete-grey">No payment waivers have been granted.</p> : waivers.map((waiver) => <div key={waiver.id} className="px-6 py-5"><p className="font-semibold text-foundation-navy">{waiver.user.contactName} <span className="font-normal text-concrete-grey">{waiver.user.email}</span></p><p className="mt-1 text-sm text-concrete-grey">{waiver.feeType === 'RETAILER_UNLOCK' ? 'Provider tender unlock' : 'Accepted quote release'} · Used {waiver._count.payments} time{waiver._count.payments === 1 ? '' : 's'}</p><p className="mt-1 text-sm text-concrete-grey">Reason: {waiver.reason}</p><p className="mt-1 text-xs text-concrete-grey">Granted by {waiver.grantedBy.contactName} on {new Date(waiver.grantedAt).toLocaleDateString('en-GB')}{waiver.expiresAt ? ` · Expires ${new Date(waiver.expiresAt).toLocaleDateString('en-GB')}` : ' · No expiry'}</p>{waiver.revokedAt ? <p className="mt-2 text-sm font-semibold text-attention">Revoked{waiver.revocationReason ? `: ${waiver.revocationReason}` : ''}</p> : <div className="mt-4 flex flex-wrap gap-2"><input aria-label={`Revocation reason for ${waiver.user.email}`} minLength={10} value={revocations[waiver.id] ?? ''} onChange={(event) => setRevocations((current) => ({ ...current, [waiver.id]: event.target.value }))} placeholder="Revocation reason" className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-foundation-navy" /><Button type="button" variant="danger" disabled={busy || (revocations[waiver.id] ?? '').trim().length < 10} onClick={() => revoke(waiver.id)}>Revoke</Button></div>}</div>)}</Card></div>;
}
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

export type AccountantRow = {
  id: string;
  email: string;
  contactName: string;
  contactPhone: string | null;
  suspended: boolean;
};

export function AccountantManagementPanel({ initialAccountants }: { initialAccountants: AccountantRow[] }) {
  const [accountants, setAccountants] = useState(initialAccountants);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', contactName: '', contactPhone: '' });

  async function createAccountant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy('create');
    setMessage(null);
    try {
      const response = await fetch('/api/super-user/accountants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contactPhone: form.contactPhone || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Unable to create this account');
      setMessage(`Accountant account created for ${form.email}.`);
      setForm({ email: '', password: '', contactName: '', contactPhone: '' });
      setShowCreate(false);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create this account');
    } finally {
      setIsBusy(null);
    }
  }

  async function handleAction(accountId: string, action: 'activate' | 'suspend' | 'reset-password') {
    setIsBusy(`${action}-${accountId}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/super-user/accountants/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Action failed');
      if (action === 'reset-password') {
        setMessage(`Temporary password: ${data.temporaryPassword}`);
      } else {
        setMessage('Account updated.');
        setAccountants((current) => current.map((row) => row.id === accountId ? { ...row, suspended: action === 'suspend' } : row));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-steel-blue">Accountant access</p>
            <p className="mt-1 max-w-xl text-sm text-concrete-grey">
              Accountants can view the Accounting Space (receipts, invoices, and performance reporting) only. They have no access to Super User settings, users, or platform configuration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="inline-flex items-center rounded-md bg-foundation-navy px-4 py-2 text-sm font-semibold text-site-white shadow-soft transition hover:bg-foundation-navy/90"
          >
            {showCreate ? 'Close form' : 'Add Accountant'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createAccountant} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Full name</span>
              <input required value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Email</span>
              <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Initial password</span>
              <input required type="text" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Phone</span>
              <input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={isBusy === 'create'} className="inline-flex items-center rounded-md bg-safety-amber px-4 py-2 text-sm font-semibold text-foundation-navy shadow-soft transition hover:bg-safety-amber/90 disabled:cursor-not-allowed disabled:opacity-60">
                {isBusy === 'create' ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </form>
        )}

        {message && <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-foundation-navy">{message}</p>}
      </Card>

      {accountants.length === 0 ? (
        <Card className="py-16 text-center text-sm text-concrete-grey">No accountant accounts are registered.</Card>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {accountants.map((account) => (
            <div key={account.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-foundation-navy">{account.contactName}</p>
                <p className="text-sm text-concrete-grey">{account.email}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-steel-blue">{account.suspended ? 'Suspended' : 'Active'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {account.suspended ? (
                  <ActionButton label="Reactivate" onClick={() => handleAction(account.id, 'activate')} busy={isBusy === `activate-${account.id}`} />
                ) : (
                  <ActionButton label="Suspend" onClick={() => handleAction(account.id, 'suspend')} busy={isBusy === `suspend-${account.id}`} />
                )}
                <ActionButton label="Reset password" onClick={() => handleAction(account.id, 'reset-password')} busy={isBusy === `reset-password-${account.id}`} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function ActionButton({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-foundation-navy shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? 'Working...' : label}
    </button>
  );
}

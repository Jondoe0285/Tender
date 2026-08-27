'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type AccountRow = {
  id: string;
  email: string;
  contactName: string;
  suspended: boolean;
  companyName?: string | null;
  categories?: string | null;
  tenders?: number;
  quotes?: number;
  unlocks?: number;
  launchCreditsLeft?: number | null;
};

export function AccountManagementTable({ role, rows }: { role: 'CLIENT' | 'RETAILER'; rows: AccountRow[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    contactName: '',
    contactPhone: '',
    companyName: '',
    categories: '',
    coverageAreas: '',
  });

  const isRetailer = role === 'RETAILER';

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy('create');
    setMessage(null);
    try {
      const body = {
        ...form,
        role,
        contactPhone: form.contactPhone || undefined,
        companyName: isRetailer ? form.companyName || undefined : undefined,
        categories: isRetailer ? form.categories.split(',').map((value) => value.trim()).filter(Boolean) : undefined,
        coverageAreas: form.coverageAreas || undefined,
        termsAccepted: true,
      };
      const response = await fetch('/api/super-user/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Unable to create this account');
      setMessage(`Account created for ${form.email}.`);
      setForm({ email: '', password: '', contactName: '', contactPhone: '', companyName: '', categories: '', coverageAreas: '' });
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
      const response = await fetch(`/api/super-user/users/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Action failed');
      setMessage(action === 'reset-password' ? `Temporary password: ${data.temporaryPassword}` : `Account ${action === 'suspend' ? 'suspended' : 'reactivated'} successfully.`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-steel-blue">Operations</p>
            <p className="mt-1 max-w-xl text-sm text-concrete-grey">
              Manage {role.toLowerCase()} account access, reset credentials, and status in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="inline-flex items-center rounded-md bg-foundation-navy px-4 py-2 text-sm font-semibold text-site-white shadow-soft transition hover:bg-foundation-navy/90"
          >
            {showCreate ? 'Close form' : `Add ${role === 'CLIENT' ? 'Client' : 'Retailer'}`}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createAccount} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <label className="text-sm text-concrete-grey md:col-span-1">
              <span className="mb-1 block font-medium text-foundation-navy">Full name</span>
              <input
                required
                value={form.contactName}
                onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>
            <label className="text-sm text-concrete-grey md:col-span-1">
              <span className="mb-1 block font-medium text-foundation-navy">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>
            <label className="text-sm text-concrete-grey md:col-span-1">
              <span className="mb-1 block font-medium text-foundation-navy">Initial password</span>
              <input
                required
                type="text"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>
            <label className="text-sm text-concrete-grey md:col-span-1">
              <span className="mb-1 block font-medium text-foundation-navy">Phone</span>
              <input
                value={form.contactPhone}
                onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>

            {isRetailer && (
              <>
                <label className="text-sm text-concrete-grey md:col-span-1">
                  <span className="mb-1 block font-medium text-foundation-navy">Company name</span>
                  <input
                    required
                    value={form.companyName}
                    onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
                  />
                </label>
                <label className="text-sm text-concrete-grey md:col-span-1">
                  <span className="mb-1 block font-medium text-foundation-navy">Categories</span>
                  <input
                    value={form.categories}
                    onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value }))}
                    placeholder="Concrete, Waste"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
                  />
                </label>
                <label className="text-sm text-concrete-grey md:col-span-2">
                  <span className="mb-1 block font-medium text-foundation-navy">Coverage areas</span>
                  <input
                    value={form.coverageAreas}
                    onChange={(event) => setForm((current) => ({ ...current, coverageAreas: event.target.value }))}
                    placeholder="Leeds, Manchester, Birmingham"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
                  />
                </label>
              </>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isBusy === 'create'}
                className="inline-flex items-center rounded-md bg-safety-amber px-4 py-2 text-sm font-semibold text-foundation-navy shadow-soft transition hover:bg-safety-amber/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy === 'create' ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </form>
        )}

        {message && <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-foundation-navy">{message}</p>}
      </Card>

      {rows.length === 0 ? (
        <Card className="py-16 text-center text-sm text-concrete-grey">No {role.toLowerCase()} accounts are registered.</Card>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {rows.map((account) => (
            <div key={account.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-foundation-navy">
                  {account.companyName ?? account.contactName}
                </h3>
                <p className="mt-1 text-sm text-concrete-grey">
                  {account.email}
                  {account.categories ? ` &middot; ${account.categories}` : ''}
                </p>
                {role === 'CLIENT' ? (
                  <p className="mt-1 text-sm text-concrete-grey">{account.tenders ?? 0} tender(s) raised</p>
                ) : (
                  <p className="mt-1 text-sm text-concrete-grey">
                    {(account.unlocks ?? 0)} unlock(s) &middot; {(account.quotes ?? 0)} quote(s)
                    {typeof account.launchCreditsLeft === 'number' ? ` &middot; ${account.launchCreditsLeft} credits left` : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={account.suspended ? 'attention' : 'approved'}>
                  {account.suspended ? 'Suspended' : 'Active'}
                </StatusBadge>
                <button
                  type="button"
                  onClick={() => handleAction(account.id, account.suspended ? 'activate' : 'suspend')}
                  disabled={isBusy === `${account.suspended ? 'activate' : 'suspend'}-${account.id}`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-foundation-navy transition hover:border-safety-amber hover:text-foundation-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {account.suspended ? 'Activate' : 'Suspend'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(account.id, 'reset-password')}
                  disabled={isBusy === `reset-password-${account.id}`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-foundation-navy transition hover:border-steel-blue hover:text-foundation-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy === `reset-password-${account.id}` ? 'Resetting...' : 'Reset password'}
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

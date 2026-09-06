'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';
import type { UserAnalyticsProfile } from '@/server/domain/userProfileService';

function formatDateTime(value: Date | null) {
  if (!value) return 'Never';
  return value.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return 'Less than a minute';
  return [hours > 0 ? `${hours}h` : null, `${minutes}m`].filter(Boolean).join(' ');
}

function formatActionLabel(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function UserAnalyticsProfileView({ profile }: { profile: UserAnalyticsProfile }) {
  const [memberships, setMemberships] = useState(profile.memberships);
  const [subscriptions, setSubscriptions] = useState(profile.subscriptions);
  const [membershipStartDate, setMembershipStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [membershipExpiryMonths, setMembershipExpiryMonths] = useState<'6' | '12'>('12');
  const [message, setMessage] = useState<string | null>(null);

  async function toggleEntitlement(type: 'membership' | 'subscription', planId: string, active: boolean) {
    const response = await fetch(`/api/super-user/retailers/${profile.id}/entitlements`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, planId, active, ...(type === 'membership' && active ? { startDate: membershipStartDate, expiryMonths: Number(membershipExpiryMonths) } : {}) }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update provider option.');
    if (type === 'membership') setMemberships((current) => active ? [...current.filter((item) => item.tierId !== planId), { tierId: planId, name: data.assignment.tier?.name ?? 'Membership tier', assignedAt: new Date(data.assignment.assignedAt), expiresAt: data.assignment.expiresAt ? new Date(data.assignment.expiresAt) : null }] : current.filter((item) => item.tierId !== planId));
    else setSubscriptions((current) => active ? [...current, { planId, name: data.assignment.plan?.name ?? 'Subscription plan' }] : current.filter((item) => item.planId !== planId));
    setMessage('Provider option updated.');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">{profile.role.replace('_', ' ')}</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">{profile.company ?? profile.contactName}</h2>
            <p className="mt-1 text-sm text-concrete-grey">{profile.contactName}</p>
          </div>
          <StatusBadge status={profile.suspended ? 'attention' : 'approved'}>{profile.suspended ? 'Suspended' : 'Active'}</StatusBadge>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Email</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Phone</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.contactPhone ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Company</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.company ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Address</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.address ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Registered</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDateTime(profile.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      {profile.warnings.length > 0 && <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Tender warnings</p>
        <div className="mt-4 divide-y divide-slate-100">{profile.warnings.map((warning) => <div key={warning.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-foundation-navy">{warning.reason}</p><StatusBadge status={warning.active ? 'attention' : 'neutral'}>{warning.active ? 'Active' : 'Inactive'}</StatusBadge></div><p className="mt-1 text-sm text-concrete-grey">{warning.tender.reference} · Issued by {warning.issuedBy.contactName} · {formatDateTime(warning.createdAt)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-foundation-navy">{warning.note}</p></div>)}</div>
      </Card>}

      {(profile.availableMembershipTiers.length > 0 || profile.availableSubscriptionPlans.length > 0) && <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Provider options</p>
        <p className="mt-1 text-sm text-concrete-grey">Assign active membership or subscription options to this profile. These controls are visible only in Super User account review.</p>
        {profile.availableMembershipTiers.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="membership-start-date">Membership start date</Label><Input id="membership-start-date" className="mt-2" type="date" value={membershipStartDate} onChange={(event) => setMembershipStartDate(event.target.value)} /></div><div><Label htmlFor="membership-expiry-months">Default expiry</Label><Select id="membership-expiry-months" className="mt-2" value={membershipExpiryMonths} onChange={(event) => setMembershipExpiryMonths(event.target.value as '6' | '12')}><option value="6">6 months</option><option value="12">12 months</option></Select></div></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {profile.availableMembershipTiers.map((tier) => { const membership = memberships.find((item) => item.tierId === tier.id); return <div key={tier.id} className="rounded-lg border border-slate-200 p-3"><Button variant={membership ? 'danger' : 'secondary'} onClick={() => void toggleEntitlement('membership', tier.id, !membership)}>{membership ? `Remove ${tier.name}` : `Assign ${tier.name}`}</Button>{membership && <p className="mt-2 text-xs text-concrete-grey">Starts {formatDateTime(membership.assignedAt)} · Expires {formatDateTime(membership.expiresAt)}</p>}</div>; })}
          {profile.availableSubscriptionPlans.map((plan) => { const active = subscriptions.some((subscription) => subscription.planId === plan.id); return <Button key={plan.id} variant={active ? 'danger' : 'secondary'} onClick={() => void toggleEntitlement('subscription', plan.id, !active)}>{active ? `Remove ${plan.name}` : `Assign ${plan.name}`}</Button>; })}
        </div>
      </Card>}

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Session analytics</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Last login</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDateTime(profile.lastLoginAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Last logout</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDateTime(profile.lastLogoutAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Total time online</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDuration(profile.totalTimeOnlineSeconds)}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Recent pages visited</p>
          </div>
          {profile.pageViews.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-concrete-grey">No recorded page visits yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.pageViews.map((view) => (
                <li key={view.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="font-medium text-foundation-navy">{view.path}</span>
                  <span className="text-xs text-concrete-grey">{formatDateTime(view.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-0">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Recent actions</p>
          </div>
          {profile.auditLogs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-concrete-grey">No recorded actions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.auditLogs.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="font-medium text-foundation-navy">{formatActionLabel(entry.action)}</span>
                  <span className="text-xs text-concrete-grey">{formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

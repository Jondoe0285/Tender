'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Field';
import type { UserAnalyticsProfile } from '@/server/domain/userProfileService';
import { VERIFICATION_DOCUMENT_TYPES, type VerificationDocumentType } from '@/lib/verification-documents';

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
  const [launchCredits, setLaunchCredits] = useState(String(profile.launchCreditsLeft ?? 0));
  const [releaseCredits, setReleaseCredits] = useState(String(profile.releaseCreditsLeft ?? 0));
  const [verificationStatus, setVerificationStatus] = useState(profile.verificationStatus);
  const [decidingVerification, setDecidingVerification] = useState(false);
  const [verificationComment, setVerificationComment] = useState('');
  const [verificationDocuments, setVerificationDocuments] = useState<Array<{ documentType: VerificationDocumentType; fileName: string; sizeBytes: number; expiryDate: string | null; uploadedAt: string; aiConfidencePercent: number | null; aiSummary: string | null; aiRequiresHumanReview: boolean; verified: boolean }>>([]);
  const [independentReviewStatus, setIndependentReviewStatus] = useState(profile.independentReviewStatus);
  const [independentReviewTier, setIndependentReviewTier] = useState(profile.independentReviewTier);
  const [decidingIndependentReview, setDecidingIndependentReview] = useState(false);
  const [independentReviewComment, setIndependentReviewComment] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(Date.now());
    if (!profile.verificationEligible) return;
    fetch(`/api/super-user/retailers/${profile.id}/verification-documents`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setVerificationDocuments(data.documents); });
  }, [profile.id, profile.verificationEligible]);

  async function decideVerification(action: 'approve-verification' | 'reject-verification') {
    setDecidingVerification(true);
    setMessage(null);
    const response = await fetch(`/api/super-user/users/${profile.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note: verificationComment || undefined }) });
    const data = await response.json().catch(() => null);
    setDecidingVerification(false);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update verification status.');
    setVerificationStatus(data.verificationStatus);
    setMessage('Verification status updated.');
  }

  async function decideIndependentReview(action: 'approve-independent-review' | 'decline-independent-review') {
    setDecidingIndependentReview(true);
    setMessage(null);
    const response = await fetch(`/api/super-user/users/${profile.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, tier: independentReviewTier || undefined, note: independentReviewComment || undefined }) });
    const data = await response.json().catch(() => null);
    setDecidingIndependentReview(false);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update enhanced review status.');
    setIndependentReviewStatus(data.independentReviewStatus);
    setIndependentReviewTier(data.independentReviewTier ?? null);
    setMessage('Enhanced review status updated.');
  }

  async function toggleEntitlement(type: 'membership' | 'subscription', planId: string, active: boolean) {
    const response = await fetch(`/api/super-user/retailers/${profile.id}/entitlements`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, planId, active, ...(type === 'membership' && active ? { startDate: membershipStartDate, expiryMonths: Number(membershipExpiryMonths) } : {}) }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update provider option.');
    if (type === 'membership') setMemberships((current) => active ? [...current.filter((item) => item.tierId !== planId), { tierId: planId, name: data.assignment.tier?.name ?? 'Membership tier', assignedAt: new Date(data.assignment.assignedAt), expiresAt: data.assignment.expiresAt ? new Date(data.assignment.expiresAt) : null }] : current.filter((item) => item.tierId !== planId));
    else setSubscriptions((current) => active ? [...current, { planId, name: data.assignment.plan?.name ?? 'Subscription plan' }] : current.filter((item) => item.planId !== planId));
    setMessage('Provider option updated.');
  }

  async function saveCredits(action: 'set-launch-credits' | 'set-release-credits', value: string) {
    const credits = Number(value);
    if (!Number.isInteger(credits) || credits < 0) return setMessage('Credits must be a non-negative whole number.');
    const response = await fetch(`/api/super-user/users/${profile.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(action === 'set-launch-credits' ? { launchCreditsLeft: credits } : { releaseCreditsLeft: credits }) }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update credits.');
    if (action === 'set-launch-credits') setLaunchCredits(String(data.launchCreditsLeft));
    else setReleaseCredits(String(data.releaseCreditsLeft));
    setMessage('Credits updated.');
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

      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Label htmlFor="activity-period">Activity history</Label>
            <p className="mt-1 text-sm text-concrete-grey">Showing pages and actions from the selected period.</p>
          </div>
          <div className="flex gap-3">
            <Select id="activity-period" name="activity" defaultValue={profile.activityPeriod} aria-label="Activity history period">
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All retained activity</option>
            </Select>
            <Button type="submit">Apply filter</Button>
          </div>
        </form>
      </Card>

      {profile.verificationEligible && <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Provider verification</p>
            <p className="mt-1 text-sm text-concrete-grey">Requested {profile.verificationRequestedAt ? formatDateTime(profile.verificationRequestedAt) : 'never'}.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={verificationStatus === 'VERIFIED' ? 'approved' : verificationStatus === 'PENDING' ? 'pending' : verificationStatus === 'REJECTED' || verificationStatus === 'EXPIRED' ? 'attention' : 'neutral'}>
              {verificationStatus === 'VERIFIED' ? 'Verified' : verificationStatus === 'PENDING' ? 'Pending review' : verificationStatus === 'REJECTED' ? 'Not approved' : verificationStatus === 'EXPIRED' ? 'Expired' : (profile.isSoleTrader ? 'Sole Trader' : 'Unverified')}
            </StatusBadge>
          </div>
        </div>
        {profile.verificationConfidencePercent !== null && (
          <p className="mt-3 text-sm text-concrete-grey">AI confidence score: <span className="font-semibold text-foundation-navy">{profile.verificationConfidencePercent}%</span></p>
        )}
        {profile.verificationReport && (
          <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-foundation-navy">{profile.verificationReport}</pre>
        )}
        {verificationDocuments.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3">
            {verificationDocuments.map((document) => {
              const expired = currentTime > 0 && document.expiryDate !== null && new Date(document.expiryDate).getTime() <= currentTime;
              return (
                <li key={document.documentType} className="flex flex-col gap-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-semibold text-foundation-navy">{VERIFICATION_DOCUMENT_TYPES.find((doc) => doc.type === document.documentType)?.label ?? document.documentType}</span>
                    <a href={`/api/super-user/retailers/${profile.id}/verification-documents/${document.documentType}`} download={document.fileName} className="font-semibold text-steel-blue hover:underline">{document.fileName}</a>
                  </div>
                  <p className="text-xs text-concrete-grey">
                    {document.expiryDate ? `Expires ${new Date(document.expiryDate).toLocaleDateString('en-GB')}${expired ? ' (expired)' : ''} \u00b7 ` : 'Does not expire \u00b7 '}
                    AI confidence {document.aiConfidencePercent ?? 'n/a'}% &middot; Human review required: {document.aiRequiresHumanReview ? 'yes' : 'no'}
                  </p>
                  {document.aiSummary && <p className="text-xs text-concrete-grey">{document.aiSummary}</p>}
                </li>
              );
            })}
          </ul>
        )}
        {verificationStatus === 'PENDING' && <div className="mt-4 border-t border-slate-100 pt-4">
          <Label htmlFor="verification-comment">Review comments</Label>
          <Textarea
            id="verification-comment"
            value={verificationComment}
            onChange={(event) => setVerificationComment(event.target.value)}
            rows={3}
            placeholder="Optional comments recorded with this decision"
            className="mt-2"
          />
          <div className="mt-3 flex gap-3">
            <Button onClick={() => void decideVerification('approve-verification')} loading={decidingVerification}>Approve</Button>
            <Button variant="danger" onClick={() => void decideVerification('reject-verification')} loading={decidingVerification}>Reject</Button>
          </div>
        </div>}
      </Card>}

      {profile.verificationEligible && independentReviewStatus !== null && independentReviewStatus !== 'NOT_PURCHASED' && <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Enhanced H&amp;S review</p>
            <p className="mt-1 text-sm text-concrete-grey">Purchased {profile.independentReviewPurchasedAt ? formatDateTime(profile.independentReviewPurchasedAt) : 'never'}.</p>
          </div>
          <StatusBadge status={independentReviewStatus === 'APPROVED' ? 'approved' : independentReviewStatus === 'PURCHASED' ? 'pending' : 'attention'}>
            {independentReviewStatus === 'APPROVED' ? (independentReviewTier === 'SILVER' ? 'Silver' : independentReviewTier === 'GOLD' ? 'Gold' : 'Bronze') : independentReviewStatus === 'PURCHASED' ? 'Awaiting review' : 'Declined'}
          </StatusBadge>
        </div>
        {profile.independentReviewNote && <p className="mt-3 text-sm text-concrete-grey">Previous note: {profile.independentReviewNote}</p>}
        {independentReviewStatus === 'PURCHASED' && <div className="mt-4 border-t border-slate-100 pt-4">
          <Label htmlFor="independent-review-tier">Safety competency tier</Label>
          <Select id="independent-review-tier" className="mt-2" value={independentReviewTier ?? ''} onChange={(event) => setIndependentReviewTier(event.target.value as 'BRONZE' | 'SILVER' | 'GOLD' | null)}>
            <option value="">Select tier before approval</option>
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
          </Select>
          <Label htmlFor="independent-review-comment">Review comments</Label>
          <Textarea
            id="independent-review-comment"
            value={independentReviewComment}
            onChange={(event) => setIndependentReviewComment(event.target.value)}
            rows={3}
            placeholder="Optional comments recorded with this decision"
            className="mt-2"
          />
          <div className="mt-3 flex gap-3">
            <Button onClick={() => void decideIndependentReview('approve-independent-review')} loading={decidingIndependentReview}>Approve</Button>
            <Button variant="danger" onClick={() => void decideIndependentReview('decline-independent-review')} loading={decidingIndependentReview}>Decline</Button>
          </div>
        </div>}
      </Card>}

      {profile.warnings.length > 0 && <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Tender warnings</p>
        <div className="mt-4 divide-y divide-slate-100">{profile.warnings.map((warning) => <div key={warning.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-foundation-navy">{warning.reason}</p><StatusBadge status={warning.active ? 'attention' : 'neutral'}>{warning.active ? 'Active' : 'Inactive'}</StatusBadge></div><p className="mt-1 text-sm text-concrete-grey">{warning.tender.reference} · Issued by {warning.issuedBy.contactName} · {formatDateTime(warning.createdAt)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-foundation-navy">{warning.note}</p></div>)}</div>
      </Card>}

      {(profile.availableMembershipTiers.length > 0 || profile.availableSubscriptionPlans.length > 0) && <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Provider options</p>
        <p className="mt-1 text-sm text-concrete-grey">Assign active membership or subscription options to this profile. These controls are visible only in Super User account review.</p>
        {profile.availableMembershipTiers.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="membership-start-date">Membership start date</Label><Input id="membership-start-date" className="mt-2" type="date" value={membershipStartDate} onChange={(event) => setMembershipStartDate(event.target.value)} /></div><div><Label htmlFor="membership-expiry-months">Default expiry</Label><Select id="membership-expiry-months" className="mt-2" value={membershipExpiryMonths} onChange={(event) => setMembershipExpiryMonths(event.target.value as '6' | '12')}><option value="6">6 months</option><option value="12">12 months</option></Select></div></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {profile.availableMembershipTiers.map((tier) => { const membership = memberships.find((item) => item.tierId === tier.id); return <div key={tier.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-foundation-navy">{tier.name}</p><StatusBadge status={tier.active ? 'approved' : 'neutral'}>{tier.active ? 'Active tier' : 'Inactive tier'}</StatusBadge></div><p className="mt-1 text-xs text-concrete-grey">£{tier.monthlyPriceGbp}/month · {tier.freeTenderOpportunitiesPerMonth} included credits · {tier.additionalCreditDiscountPercentage}% additional-credit discount</p><Button className="mt-3" variant={membership ? 'danger' : 'secondary'} disabled={!tier.active && !membership} onClick={() => void toggleEntitlement('membership', tier.id, !membership)}>{membership ? `Remove ${tier.name}` : tier.active ? `Assign ${tier.name}` : 'Activate tier in Settings first'}</Button>{membership && <p className="mt-2 text-xs text-concrete-grey">Starts {formatDateTime(membership.assignedAt)} · Expires {formatDateTime(membership.expiresAt)}</p>}</div>; })}
          {profile.availableSubscriptionPlans.map((plan) => { const active = subscriptions.some((subscription) => subscription.planId === plan.id); return <Button key={plan.id} variant={active ? 'danger' : 'secondary'} onClick={() => void toggleEntitlement('subscription', plan.id, !active)}>{active ? `Remove ${plan.name}` : `Assign ${plan.name}`}</Button>; })}
        </div>
      </Card>}

      {(profile.launchCreditsLeft !== null || profile.releaseCreditsLeft !== null) && <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Individual credit allocation</p>
        <p className="mt-1 text-sm text-concrete-grey">Assign credits to this individual account. List-level editing is disabled.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {profile.launchCreditsLeft !== null && <div><Label htmlFor="profile-launch-credits">Tender release credits</Label><div className="mt-2 flex gap-3"><Input id="profile-launch-credits" type="number" min="0" step="1" value={launchCredits} onChange={(event) => setLaunchCredits(event.target.value)} /><Button onClick={() => void saveCredits('set-launch-credits', launchCredits)}>Save</Button></div></div>}
          {profile.releaseCreditsLeft !== null && <div><Label htmlFor="profile-release-credits">Quote acceptance release credits</Label><div className="mt-2 flex gap-3"><Input id="profile-release-credits" type="number" min="0" step="1" value={releaseCredits} onChange={(event) => setReleaseCredits(event.target.value)} /><Button onClick={() => void saveCredits('set-release-credits', releaseCredits)}>Save</Button></div></div>}
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

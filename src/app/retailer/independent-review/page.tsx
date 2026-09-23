'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { INDEPENDENT_REVIEW_TIER_DESCRIPTIONS, INDEPENDENT_REVIEW_TIER_LABELS, INDEPENDENT_REVIEW_TIERS, type IndependentReviewTier } from '@/lib/independentReviewTiers';
import { allowTestPayments } from '@/lib/runtime';

type Status = 'NOT_PURCHASED' | 'PURCHASED' | 'APPROVED' | 'DECLINED';

type ReviewState = {
  active: boolean;
  fees: Record<IndependentReviewTier, number>;
  purchasableTiers: IndependentReviewTier[];
  expiresAt: string | null;
  expired: boolean;
  eligible: boolean;
  status: Status;
  tier: IndependentReviewTier | null;
  purchasedTier: IndependentReviewTier | null;
  purchasedAt: string | null;
  decidedAt: string | null;
  note: string | null;
};

export default function IndependentReviewPage() {
  const [state, setState] = useState<ReviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<IndependentReviewTier | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ paymentId: string; totalAmountGbp: number; feeGbp: number; vatGbp: number } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch('/api/retailer/independent-review');
    if (response.ok) setState(await response.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handlePurchase(tier: IndependentReviewTier) {
    setPurchasing(tier);
    setMessage(null);
    const response = await fetch('/api/retailer/independent-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
    const data = await response.json().catch(() => null);
    setPurchasing(null);
    if (!response.ok) {
      setMessage(data?.error ?? 'Unable to start payment.');
      return;
    }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (data.devMode) {
      setPendingPayment({ paymentId: data.paymentId, totalAmountGbp: data.totalAmountGbp, feeGbp: data.feeGbp ?? data.amountGbp, vatGbp: data.vatGbp });
      setMessage(allowTestPayments ? 'Payment required. Complete the test payment below.' : 'Payment required. Continue checkout to complete this payment.');
    }
  }

  async function handleSimulatePayment() {
    if (!pendingPayment) return;
    setSimulating(true);
    setMessage(null);
    const response = await fetch('/api/dev/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: pendingPayment.paymentId }),
    });
    const data = await response.json().catch(() => null);
    setSimulating(false);
    if (!response.ok) {
      setMessage(data?.error ?? 'Dev payment simulation failed.');
      return;
    }
    setPendingPayment(null);
    setMessage('Purchase confirmed. HSQE Consult Hub will contact you to complete onboarding.');
    await load();
  }

  if (loading) return <AppShell role="retailer" title="Enhanced H&amp;S Review"><p className="text-sm text-concrete-grey">Loading...</p></AppShell>;

  return (
    <AppShell role="retailer" title="Enhanced H&S Review">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/retailer/profile" className="inline-block text-sm font-semibold text-concrete-grey hover:text-foundation-navy">&larr; Back to profile</Link>

        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}

        <Card>
          <h2 className="font-heading text-xl font-bold text-foundation-navy">Enhanced Health &amp; Safety verification</h2>
          <p className="mt-2 text-sm text-concrete-grey">
            Choose Bronze, Silver, or Gold. After payment, HSQE Consult Hub starts onboarding. The auditor may award the purchased tier or a lower tier based on evidence. This does not replace a client&rsquo;s own due diligence.
          </p>

          {state?.note?.includes('Service scope changed') && (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-foundation-navy">Service scope updated</p>
              <p className="mt-2 text-sm text-concrete-grey">Changing your service scope reset your enhanced verification. Purchase the tier you need for your updated services.</p>
            </div>
          )}

          {!state?.active && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-concrete-grey">Enhanced verification purchases are not currently available.</p>}
          {state?.active && !state.eligible && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-concrete-grey">Enhanced review is only available for Materials, Waste, Plant Hire, Contractor Services, or Professional Services providers.</p>}

          {state?.active && state.eligible && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={state.status === 'APPROVED' ? 'approved' : state.status === 'PURCHASED' ? 'pending' : state.status === 'DECLINED' ? 'attention' : 'neutral'}>
                  {state.status === 'APPROVED' ? `Enhanced Verified · ${state.tier ? INDEPENDENT_REVIEW_TIER_LABELS[state.tier] : 'Bronze'}` : state.status === 'PURCHASED' ? 'Awaiting review' : state.status === 'DECLINED' ? 'Not approved' : 'Not purchased'}
                </StatusBadge>
                {state.expiresAt && <p className="text-sm text-concrete-grey">Expires on {new Date(state.expiresAt).toLocaleDateString('en-GB')}.</p>}
                {state.expired && <p className="text-sm font-semibold text-attention">Your enhanced verification has expired. Purchase a tier to restore it.</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {INDEPENDENT_REVIEW_TIERS.map((tier) => {
                  const available = state.purchasableTiers.includes(tier);
                  return (
                    <div key={tier} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-heading text-lg font-bold text-foundation-navy">{INDEPENDENT_REVIEW_TIER_LABELS[tier]}</p>
                      <p className="mt-1 text-2xl font-heading font-bold text-foundation-navy">£{state.fees[tier]} <span className="text-sm font-semibold text-concrete-grey">excl. VAT</span></p>
                      <p className="mt-2 text-xs text-concrete-grey">{INDEPENDENT_REVIEW_TIER_DESCRIPTIONS[tier]}</p>
                      {available && !pendingPayment && (
                        <Button className="mt-4 w-full" onClick={() => handlePurchase(tier)} loading={purchasing === tier}>
                          {state.status === 'APPROVED' && !state.expired ? `Upgrade to ${INDEPENDENT_REVIEW_TIER_LABELS[tier]}` : `Purchase ${INDEPENDENT_REVIEW_TIER_LABELS[tier]}`}
                        </Button>
                      )}
                      {!available && state.status === 'APPROVED' && state.tier === tier && !state.expired && (
                        <p className="mt-4 text-xs font-semibold text-approved">Current award</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {state?.status === 'PURCHASED' && <p className="mt-4 text-sm text-concrete-grey">Your {state.purchasedTier ? INDEPENDENT_REVIEW_TIER_LABELS[state.purchasedTier] : 'enhanced'} verification has been purchased. HSQE Consult Hub will contact you to complete onboarding.</p>}
          {state?.status === 'DECLINED' && state.note && <p className="mt-4 text-sm text-concrete-grey">Outcome note: {state.note}</p>}
          {state?.status === 'APPROVED' && <p className="mt-4 text-sm text-approved font-semibold">Your business is Enhanced Verified{state.tier ? ` at ${INDEPENDENT_REVIEW_TIER_LABELS[state.tier]}` : ''}.</p>}

          {pendingPayment && allowTestPayments && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-concrete-grey">Total due: £{pendingPayment.totalAmountGbp} incl. VAT (£{pendingPayment.feeGbp} fee plus £{pendingPayment.vatGbp} VAT)</p>
              <Button className="mt-3" onClick={handleSimulatePayment} loading={simulating}>Complete test payment</Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

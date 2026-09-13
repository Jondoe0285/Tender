'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { INDEPENDENT_REVIEW_TIER_DESCRIPTIONS, INDEPENDENT_REVIEW_TIER_LABELS, type IndependentReviewTier } from '@/lib/independentReviewTiers';

type Status = 'NOT_PURCHASED' | 'PURCHASED' | 'APPROVED' | 'DECLINED';

type ReviewState = {
  active: boolean;
  feeGbp: number;
  renewalActive: boolean;
  renewalFeeGbp: number;
  renewalAvailable: boolean;
  renewalOpenAt: string | null;
  reassessmentActive: boolean;
  reassessmentFeeGbp: number;
  reassessmentAvailable: boolean;
  expiresAt: string | null;
  expired: boolean;
  eligible: boolean;
  status: Status;
  tier: IndependentReviewTier | null;
  purchasedAt: string | null;
  decidedAt: string | null;
  note: string | null;
};

export default function IndependentReviewPage() {
  const [state, setState] = useState<ReviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
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

  async function handlePurchase(mode: 'NEW' | 'RENEWAL' | 'REASSESSMENT' = 'NEW') {
    setPurchasing(true);
    setMessage(null);
    const response = await fetch('/api/retailer/independent-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
    const data = await response.json().catch(() => null);
    setPurchasing(false);
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
      setMessage(`Payment required. This environment has no Stripe keys configured — use the dev payment simulation below.`);
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
    setSimulating(false);
    if (!response.ok) {
      setMessage('Dev payment simulation failed.');
      return;
    }
    setPendingPayment(null);
    setMessage('Purchase confirmed. A Health & Safety professional will contact you about the next steps.');
    await load();
  }

  if (loading) return <AppShell role="retailer" title="Enhanced H&amp;S Review"><p className="text-sm text-concrete-grey">Loading...</p></AppShell>;

  return (
    <AppShell role="retailer" title="Enhanced H&S Review">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/retailer/profile" className="inline-block text-sm font-semibold text-concrete-grey hover:text-foundation-navy">&larr; Back to profile</Link>

        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}

        <Card>
          <h2 className="font-heading text-xl font-bold text-foundation-navy">Enhanced Health &amp; Safety review</h2>
          <p className="mt-2 text-sm text-concrete-grey">
            Purchase a professional review of your business by a Health &amp; Safety professional. Once purchased, a
            Health &amp; Safety professional will contact you directly about the next steps. The review considers
            legal-compliance evidence only and does not replace a client&rsquo;s own suitable due diligence before any
            formal agreement. If your business is deemed to meet the review requirements, your account is marked
            Enhanced Verified and every quote you submit shows a green Enhanced Verified indicator.
          </p>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foundation-navy">Enhanced verification tiers</p>
            <dl className="mt-3 grid gap-3 text-sm text-concrete-grey">
              {(Object.keys(INDEPENDENT_REVIEW_TIER_DESCRIPTIONS) as IndependentReviewTier[]).map((tier) => <div key={tier}><dt className="font-semibold text-foundation-navy">{INDEPENDENT_REVIEW_TIER_LABELS[tier]}</dt><dd>{INDEPENDENT_REVIEW_TIER_DESCRIPTIONS[tier]}</dd></div>)}
            </dl>
          </div>

          {!state?.active && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-concrete-grey">Enhanced review purchases are not currently available.</p>}

          {state?.active && !state.eligible && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-concrete-grey">Enhanced review is only available for Materials, Waste, Plant Hire, Contractor Services, or Professional Services providers.</p>}

          {state?.reassessmentAvailable && (
            <div className="mt-4 rounded-lg border-l-4 border-safety-amber bg-amber-50/40 p-4">
              <p className="text-sm font-semibold text-foundation-navy">Service scope updated</p>
              <p className="mt-2 text-sm text-concrete-grey">
                Changing your service scope reset your enhanced verification due to the addition of new legal and compliance requirements for your updated services. A minor re-verification is required to assess your new service scope.
              </p>
            </div>
          )}

          {state?.active && state.eligible && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-heading font-bold text-foundation-navy">
                  £{state.reassessmentAvailable ? state.reassessmentFeeGbp : state.renewalAvailable ? state.renewalFeeGbp : state.feeGbp} excl. VAT
                </p>
                <StatusBadge status={state.status === 'APPROVED' ? 'approved' : state.status === 'PURCHASED' ? 'pending' : state.status === 'DECLINED' ? 'attention' : 'neutral'}>
                    {state.status === 'APPROVED' ? `Enhanced Verified${state.tier ? ` · ${state.tier[0] + state.tier.slice(1).toLowerCase()}` : ''}` : state.status === 'PURCHASED' ? 'Awaiting review' : state.status === 'DECLINED' ? 'Not approved' : (state.reassessmentAvailable ? 'Re-assessment required' : 'Not purchased')}
                </StatusBadge>
                {state.expiresAt && <p className="mt-2 text-sm text-concrete-grey">Enhanced verification expires on {new Date(state.expiresAt).toLocaleDateString('en-GB')}.</p>}
                {state.renewalActive && state.renewalOpenAt && !state.renewalAvailable && state.status === 'APPROVED' && !state.expired && <p className="mt-2 text-sm text-concrete-grey">Renewal opens on {new Date(state.renewalOpenAt).toLocaleDateString('en-GB')}.</p>}
                {state.renewalAvailable && <p className="mt-2 text-sm font-semibold text-steel-blue">Renew now for £{state.renewalFeeGbp} excl. VAT before your current verification expires.</p>}
                {state.reassessmentAvailable && <p className="mt-2 text-sm font-semibold text-steel-blue">Purchase an updated assessment for £{state.reassessmentFeeGbp} excl. VAT to re-verify your updated service scope.</p>}
                {state.expired && <p className="mt-2 text-sm font-semibold text-attention">Your enhanced verification has expired. Purchase a new review to regain enhanced verification.</p>}
              </div>
              {(state.status === 'NOT_PURCHASED' || state.status === 'DECLINED') && !state.reassessmentAvailable && !pendingPayment && (
                <Button onClick={() => handlePurchase()} loading={purchasing}>Pay now</Button>
              )}
              {state.reassessmentAvailable && !pendingPayment && (
                <Button onClick={() => handlePurchase('REASSESSMENT')} loading={purchasing}>Purchase updated assessment</Button>
              )}
              {state.renewalAvailable && !pendingPayment && (
                <Button onClick={() => handlePurchase('RENEWAL')} loading={purchasing}>Renew now</Button>
              )}
              {state.expired && !pendingPayment && (
                <Button onClick={() => handlePurchase()} loading={purchasing}>Purchase new review</Button>
              )}
            </div>
          )}

          {state?.status === 'PURCHASED' && <p className="mt-4 text-sm text-concrete-grey">Your review has been purchased. A Health &amp; Safety professional will contact you about the next steps.</p>}
          {state?.status === 'DECLINED' && state.note && <p className="mt-4 text-sm text-concrete-grey">Outcome note: {state.note}</p>}
          {state?.status === 'APPROVED' && <p className="mt-4 text-sm text-approved font-semibold">Your business is Enhanced Verified.</p>}

          {pendingPayment && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-concrete-grey">Total due: £{pendingPayment.totalAmountGbp} incl. VAT (£{pendingPayment.feeGbp} fee plus £{pendingPayment.vatGbp} VAT)</p>
              <Button className="mt-3" onClick={handleSimulatePayment} loading={simulating}>Pay (dev simulation)</Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

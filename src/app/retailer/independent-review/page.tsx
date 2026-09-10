'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

type Status = 'NOT_PURCHASED' | 'PURCHASED' | 'APPROVED' | 'DECLINED';

type ReviewState = {
  active: boolean;
  feeGbp: number;
  eligible: boolean;
  status: Status;
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

  async function handlePurchase() {
    setPurchasing(true);
    setMessage(null);
    const response = await fetch('/api/retailer/independent-review', { method: 'POST' });
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

  if (loading) return <AppShell role="retailer" title="Independent H&amp;S Review"><p className="text-sm text-concrete-grey">Loading...</p></AppShell>;

  return (
    <AppShell role="retailer" title="Independent H&S Review">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/retailer/profile" className="inline-block text-sm font-semibold text-concrete-grey hover:text-foundation-navy">&larr; Back to profile</Link>

        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}

        <Card>
          <h2 className="font-heading text-xl font-bold text-foundation-navy">Independent Health &amp; Safety review</h2>
          <p className="mt-2 text-sm text-concrete-grey">
            Purchase an independent review of your business by a Health &amp; Safety professional. Once purchased, a
            Health &amp; Safety professional will contact you directly about the next steps. If your business is
            deemed to meet the requirements, your account is marked Independently Verified and every quote you submit
            shows a green independently-verified indicator to Contractors.
          </p>

          {!state?.active && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-concrete-grey">Independent review purchases are not currently available.</p>}

          {state?.active && !state.eligible && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-concrete-grey">Independent review is only available for Waste, Plant Hire, Contractor Services, or Professional Services providers.</p>}

          {state?.active && state.eligible && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-heading font-bold text-foundation-navy">£{state.feeGbp} excl. VAT</p>
                <StatusBadge status={state.status === 'APPROVED' ? 'approved' : state.status === 'PURCHASED' ? 'pending' : state.status === 'DECLINED' ? 'attention' : 'neutral'}>
                  {state.status === 'APPROVED' ? 'Independently Verified' : state.status === 'PURCHASED' ? 'Awaiting review' : state.status === 'DECLINED' ? 'Not approved' : 'Not purchased'}
                </StatusBadge>
              </div>
              {(state.status === 'NOT_PURCHASED' || state.status === 'DECLINED') && !pendingPayment && (
                <Button onClick={handlePurchase} loading={purchasing}>Pay now</Button>
              )}
            </div>
          )}

          {state?.status === 'PURCHASED' && <p className="mt-4 text-sm text-concrete-grey">Your review has been purchased. A Health &amp; Safety professional will contact you about the next steps.</p>}
          {state?.status === 'DECLINED' && state.note && <p className="mt-4 text-sm text-concrete-grey">Outcome note: {state.note}</p>}
          {state?.status === 'APPROVED' && <p className="mt-4 text-sm text-approved font-semibold">Your business is Independently Verified.</p>}

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

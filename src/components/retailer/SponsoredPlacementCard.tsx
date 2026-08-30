'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

type SponsoredPlacementCardProps = {
  enabled: boolean;
  active: boolean;
  feeGbp: number;
};

export function SponsoredPlacementCard({ enabled, active, feeGbp }: SponsoredPlacementCardProps) {
  const [isActive, setIsActive] = useState(active);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function purchase() {
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/retailer/sponsored-placement', { method: 'POST' });
    const data = await response.json().catch(() => null) as { status?: string; paymentId?: string; checkoutUrl?: string | null; devMode?: boolean; error?: string } | null;
    if (!response.ok) {
      setBusy(false);
      setMessage(data?.error ?? 'Unable to start sponsored placement purchase.');
      return;
    }
    if (data?.status === 'ACTIVE') {
      setIsActive(true);
      setBusy(false);
      return;
    }
    if (data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (data?.devMode && data.paymentId) {
      const confirmResponse = await fetch('/api/dev/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: data.paymentId }),
      });
      setBusy(false);
      if (!confirmResponse.ok) {
        setMessage('Dev payment simulation failed.');
        return;
      }
      setIsActive(true);
      setMessage('Sponsored placement is active.');
      return;
    }
    setBusy(false);
  }

  return (
    <Card className="mb-6 border-l-4 border-l-safety-amber">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Sponsored placement</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">Client quote-page visibility</h2>
          <p className="mt-2 max-w-xl text-sm text-concrete-grey">Shown in a clearly labelled sponsored area. Quote ranking and comparison sorting stay unchanged.</p>
        </div>
        <StatusBadge status={isActive ? 'approved' : enabled ? 'pending' : 'neutral'}>{isActive ? 'Active' : enabled ? 'Available' : 'Inactive'}</StatusBadge>
      </div>
      {message && <p className="mt-4 text-sm font-semibold text-steel-blue">{message}</p>}
      {!isActive && enabled && <Button className="mt-5" onClick={purchase} loading={busy}>Purchase sponsored placement · £{feeGbp} excl. VAT</Button>}
      {!enabled && <p className="mt-4 text-sm text-concrete-grey">Sponsored placement is not currently active.</p>}
    </Card>
  );
}

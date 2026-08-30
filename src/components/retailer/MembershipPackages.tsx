'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

type Tier = {
  id: string;
  name: string;
  description: string;
  monthlyPriceGbp: number;
  freeTenderOpportunitiesPerMonth: number;
  purchased: boolean;
};

export function MembershipPackages({ enabled, tiers }: { enabled: boolean; tiers: Tier[] }) {
  const [items, setItems] = useState(tiers);
  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function purchase(tierId: string) {
    setBusyTierId(tierId);
    setMessage(null);
    const response = await fetch('/api/retailer/membership-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierId }),
    });
    const data = await response.json().catch(() => null) as { status?: string; paymentId?: string; checkoutUrl?: string | null; devMode?: boolean; error?: string } | null;
    if (!response.ok) {
      setBusyTierId(null);
      setMessage(data?.error ?? 'Unable to purchase membership package.');
      return;
    }
    if (data?.status === 'ACTIVE') {
      setItems((current) => current.map((tier) => tier.id === tierId ? { ...tier, purchased: true } : tier));
      setBusyTierId(null);
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
      setBusyTierId(null);
      if (!confirmResponse.ok) {
        setMessage('Dev payment simulation failed.');
        return;
      }
      setItems((current) => current.map((tier) => tier.id === tierId ? { ...tier, purchased: true } : tier));
      setMessage('Membership package is active.');
      return;
    }
    setBusyTierId(null);
  }

  return (
    <section className="mb-6">
      <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Membership packages</h2>
      {!enabled ? <Card className="text-sm text-concrete-grey">Membership packages are not currently active.</Card> : items.length === 0 ? <Card className="text-sm text-concrete-grey">No membership packages are available.</Card> : <div className="grid gap-4 sm:grid-cols-2">{items.map((tier) => <Card key={tier.id}><div className="flex items-start justify-between gap-3"><div><p className="font-heading text-xl font-bold text-foundation-navy">{tier.name}</p><p className="mt-1 text-sm text-concrete-grey">{tier.description || 'Retailer membership package'}</p></div><StatusBadge status={tier.purchased ? 'approved' : 'pending'}>{tier.purchased ? 'Active' : 'Available'}</StatusBadge></div><p className="mt-4 text-sm font-semibold text-steel-blue">£{tier.monthlyPriceGbp}/month excl. VAT</p><p className="mt-1 text-sm text-concrete-grey">{tier.freeTenderOpportunitiesPerMonth} free tender opportunities per month</p>{!tier.purchased && <Button className="mt-4" onClick={() => purchase(tier.id)} loading={busyTierId === tier.id}>Purchase package</Button>}</Card>)}</div>}
      {message && <p className="mt-4 text-sm font-semibold text-steel-blue">{message}</p>}
    </section>
  );
}

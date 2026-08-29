'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { Label, Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { TenderMessages } from '@/components/quotes/TenderMessages';

type TenderSummary = {
  id: string;
  reference: string;
  category: string;
  clientTradeTenderId: string | null;
  location: string;
  urgency: string;
  closingDate: string;
  status: string;
  unlockFeeGbp?: number;
  items: { id: string; category: string; subcategory: string; item: string | null; quantity: string }[];
};

type TenderFull = Omit<TenderSummary, 'items'> & {
  subcategory: string;
  quantity: string;
  budget: number | null;
  requirements: string;
  description: string;
  items: { id: string; category: string; subcategory: string; item: string | null; quantity: string; description: string }[];
};

export default function RetailerTenderDetailPage() {
  const params = useParams<{ id: string }>();
  const [tender, setTender] = useState<TenderSummary | TenderFull | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  async function load() {
    const response = await fetch(`/api/tenders/${params.id}`);
    if (!response.ok) {
      setMessage('Unable to load this tender.');
      return;
    }
    const data = await response.json();
    setTender(data.tender);
    setUnlocked(data.unlocked);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleUnlock() {
    setUnlocking(true);
    setMessage(null);
    const response = await fetch(`/api/tenders/${params.id}/unlock`, { method: 'POST' });
    const data = await response.json();
    setUnlocking(false);

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to start unlock.');
      return;
    }
    if (data.status === 'ALREADY_UNLOCKED' || data.status === 'UNLOCKED_WITH_CREDIT') {
      await load();
      return;
    }
    if (data.status === 'PAYMENT_REQUIRED') {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setPendingPaymentId(data.paymentId);
      setMessage('Payment required. This environment has no Stripe keys configured — use the dev payment simulation below.');
    }
  }

  async function handleSimulatePayment() {
    if (!pendingPaymentId) return;
    setSimulating(true);
    setMessage(null);

    const confirmResponse = await fetch('/api/dev/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: pendingPaymentId }),
    });
    if (!confirmResponse.ok) {
      setSimulating(false);
      setMessage('Dev payment simulation failed.');
      return;
    }

    const finalizeResponse = await fetch(`/api/tenders/${params.id}/unlock/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: pendingPaymentId }),
    });
    setSimulating(false);
    if (!finalizeResponse.ok) {
      setMessage('Unable to finalise unlock.');
      return;
    }
    setPendingPaymentId(null);
    setMessage(null);
    await load();
  }

  async function handleSubmitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingQuote(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    const response = await fetch(`/api/tenders/${params.id}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceGbp: form.get('priceGbp'),
        leadTimeDays: form.get('leadTimeDays'),
        deliveryInfo: form.get('deliveryInfo'),
        accreditations: form.get('accreditations'),
        supportingDocumentName: form.get('supportingDocumentName') || undefined,
        validityDays: form.get('validityDays'),
        notes: form.get('notes'),
      }),
    });
    setSubmittingQuote(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string; reasons?: string[] } | null;
      setMessage(data?.reasons?.join(' ') ?? data?.error ?? 'Unable to submit quote.');
      return;
    }
    setQuoteSubmitted(true);
  }

  if (!tender) {
    return (
      <AppShell role="retailer" title="Tender">
        <p className="text-sm text-concrete-grey">{message ?? 'Loading…'}</p>
      </AppShell>
    );
  }

  const full = unlocked ? (tender as TenderFull) : null;

  return (
    <AppShell role="retailer" title={tender.reference}>
      <section className="mx-auto max-w-2xl">
        <Link href="/retailer/opportunities" className="mb-6 inline-block text-sm font-semibold text-concrete-grey hover:text-foundation-navy">
          &larr; Back to opportunities
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foundation-navy">{tender.category}</h2>
          <StatusBadge status={unlocked ? 'approved' : 'pending'}>{unlocked ? 'Unlocked' : 'Locked'}</StatusBadge>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-2xl">
          <Card className="mb-6">
            {tender.clientTradeTenderId && <p className="text-sm font-semibold text-steel-blue">Client Trade Tender ID: {tender.clientTradeTenderId}</p>}
            <p className="text-sm text-concrete-grey">Location: {tender.location}</p>
            <p className="mt-1 text-sm text-concrete-grey">Urgency: {tender.urgency}</p>
            <p className="mt-1 text-sm text-concrete-grey">
              Closes: {new Date(tender.closingDate).toLocaleDateString('en-GB')}
            </p>
          </Card>

          {!unlocked && (
            <Card>
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Commercial fit assessment</h2>
              <p className="mt-2 text-sm leading-relaxed text-concrete-grey">
                Unlock to see the full specification, quantity, requirements, and site details needed to prepare a quote.
                Client contact details remain private until a quote is accepted and the release fee is paid.
              </p>
              <p className="mt-3 text-sm font-semibold text-steel-blue">
                Cost: £{tender.unlockFeeGbp ?? 0}, unless you have a launch credit available.
              </p>
              {tender.items.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-foundation-navy">Items requested</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {tender.items.map((item) => (
                      <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-concrete-grey">
                        <span className="font-semibold text-foundation-navy">{item.item ?? item.subcategory}</span>
                        {item.item && <span className="ml-1 text-xs text-concrete-grey">({item.subcategory})</span>}
                        <span className="block">Quantity: {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {message && <p className="mb-4 mt-4 text-sm font-semibold text-attention">{message}</p>}
              {pendingPaymentId ? (
                <Button onClick={handleSimulatePayment} loading={simulating} size="lg">
                  Simulate payment (dev)
                </Button>
              ) : (
                <Button onClick={handleUnlock} loading={unlocking} size="lg">
                  {`Unlock full details — £${tender.unlockFeeGbp ?? 0}`}
                </Button>
              )}
            </Card>
          )}

          {full && (
            <>
              <Card className="mb-6">
                <h2 className="font-heading text-lg font-bold text-foundation-navy">Tender requirements</h2>
                <div className="mt-4 flex flex-col gap-4">
                  <TenderItemDetail subcategory={full.subcategory} item={null} quantity={full.quantity} description={full.description} />
                  {full.items.slice(1).map((item) => (
                    <TenderItemDetail key={item.id} subcategory={item.subcategory} item={item.item} quantity={item.quantity} description={item.description} />
                  ))}
                </div>
                {full.budget != null && <p className="mt-1 text-sm text-concrete-grey">Budget: £{full.budget}</p>}
                {full.requirements && (
                  <p className="mt-1 text-sm text-concrete-grey">Requirements: {full.requirements}</p>
                )}
              </Card>

              {quoteSubmitted ? (
                <Card>
                  <p className="text-sm font-semibold text-approved">Quote submitted. The Client can now review it.</p>
                </Card>
              ) : (
                <Card>
                  <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Submit a quote</h2>
                  <form onSubmit={handleSubmitQuote} className="flex flex-col gap-4">
                    <FieldGroup>
                      <Label htmlFor="priceGbp">Price (GBP)</Label>
                      <Input id="priceGbp" name="priceGbp" type="number" min="1" required />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="leadTimeDays">Lead time (days)</Label>
                      <Input id="leadTimeDays" name="leadTimeDays" type="number" min="0" required />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="deliveryInfo">Delivery information</Label>
                      <Textarea id="deliveryInfo" name="deliveryInfo" rows={3} placeholder="Delivery window, charges, and access requirements" required />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="accreditations">Accreditations</Label>
                      <Input id="accreditations" name="accreditations" placeholder="e.g. CHAS, Constructionline Gold" required />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="validityDays">Quote valid for (days)</Label>
                      <Input id="validityDays" name="validityDays" type="number" min="1" required defaultValue={30} />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="notes">Notes and assumptions</Label>
                      <Textarea id="notes" name="notes" rows={4} required />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="supportingDocument">Supporting document name (optional)</Label>
                      <Input id="supportingDocument" name="supportingDocumentName" placeholder="PDF or document filename" />
                      <p className="text-xs text-concrete-grey">Secure document upload will be enabled when file storage is connected.</p>
                    </FieldGroup>
                    {message && <p className="text-sm font-semibold text-attention">{message}</p>}
                    <Button type="submit" loading={submittingQuote} className="self-start">
                      Submit quote
                    </Button>
                  </form>
                </Card>
              )}
            </>
          )}
          {unlocked && <TenderMessages tenderId={params.id} role="retailer" />}
      </section>
    </AppShell>
  );
}

function TenderItemDetail({ subcategory, item, quantity, description }: { subcategory: string; item: string | null; quantity: string; description: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-heading text-base font-bold text-foundation-navy">{item ?? subcategory}</h3>
      {item && <p className="text-xs text-concrete-grey">{subcategory}</p>}
      <p className="mt-1 text-sm text-concrete-grey">Quantity: {quantity}</p>
      <p className="mt-3 whitespace-pre-line text-sm text-foundation-navy">{description}</p>
    </div>
  );
}

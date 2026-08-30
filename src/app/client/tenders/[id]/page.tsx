'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { QuoteComparison } from '@/components/quotes/QuoteComparison';
import { TenderMessages } from '@/components/quotes/TenderMessages';

type Tender = {
  id: string;
  reference: string;
  category: string;
  subcategory: string;
  location: string;
  closingDate: string;
  supplyDate: string | null;
  description: string;
  items: { id: string; category: string; subcategory: string; quantity: string; description: string }[];
};

type Quote = {
  id: string;
  reference: string;
  priceGbp: number;
  leadTimeDays: number;
  deliveryDateConfirmed: boolean;
  deliveryInfo: string;
  validityDays: number;
  lines: { tenderItemId: string; priceGbp: number | null; available: boolean; tenderItem: { category: string; subcategory: string; item: string | null; quantity: string } }[];
  charges: { id: string; description: string; priceGbp: number }[];
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  submittedAt: string;
  sponsoredPlacementActive?: boolean;
  releaseFeeGbp: number;
};

type Contact = { contactName: string; contactPhone: string | null; email: string };

export default function ClientTenderDetailPage() {
  const params = useParams<{ id: string }>();
  const [tender, setTender] = useState<Tender | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [busyQuoteId, setBusyQuoteId] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ quoteId: string; paymentId: string; checkoutUrl: string | null } | null>(null);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    const [tenderResponse, quotesResponse] = await Promise.all([
      fetch(`/api/tenders/${params.id}`),
      fetch(`/api/tenders/${params.id}/quotes`),
    ]);
    if (tenderResponse.ok) {
      setTender((await tenderResponse.json()).tender);
      setLoadError(null);
    } else if (!tender) {
      const data = await tenderResponse.json().catch(() => null);
      setLoadError(data?.error ?? 'Unable to load this tender.');
    }
    if (quotesResponse.ok) {
      const nextQuotes: Quote[] = (await quotesResponse.json()).quotes;
      setQuotes(nextQuotes);
      const acceptedQuote = nextQuotes.find((quote) => quote.status === 'ACCEPTED');
      if (acceptedQuote) {
        const releaseResponse = await fetch(`/api/quotes/${acceptedQuote.id}/release/status`);
        if (releaseResponse.ok) {
          const release = await releaseResponse.json();
          if (release.status === 'PENDING') {
            setPendingPayment({ quoteId: acceptedQuote.id, paymentId: release.paymentId, checkoutUrl: release.checkoutUrl });
            setMessage(`Your quote is accepted. Pay £${release.totalAmountGbp} including VAT (£${release.amountGbp} fee plus £${release.vatGbp} VAT) to share contact details.`);
          } else if (release.status === 'CONFIRMED') {
            await loadContact(acceptedQuote.id);
          }
        }
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadContact(quoteId: string) {
    const response = await fetch(`/api/quotes/${quoteId}/contact`);
    if (response.ok) {
      const data = await response.json();
      setContacts((prev) => ({ ...prev, [quoteId]: data.contact }));
    }
  }

  async function handleAccept(quoteId: string) {
    setBusyQuoteId(quoteId);
    setMessage(null);
    const response = await fetch(`/api/quotes/${quoteId}/accept`, { method: 'POST' });
    const data = await response.json();
    setBusyQuoteId(null);

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to accept this quote.');
      return;
    }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (data.devMode) {
      setPendingPayment({ quoteId, paymentId: data.paymentId, checkoutUrl: data.checkoutUrl });
      setMessage(
        `Quote accepted. Pay £${data.totalAmountGbp} including VAT (£${data.feeGbp} fee plus £${data.vatGbp} VAT) — this environment has no Stripe keys configured, use the dev payment simulation below.`
      );
      await load();
    }
  }

  async function handleSimulateReleasePayment() {
    if (!pendingPayment) return;
    setBusyQuoteId(pendingPayment.quoteId);
    setMessage(null);

    const confirmResponse = await fetch('/api/dev/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: pendingPayment.paymentId }),
    });
    if (!confirmResponse.ok) {
      setBusyQuoteId(null);
      setMessage('Dev payment simulation failed.');
      return;
    }

    const releaseResponse = await fetch(`/api/quotes/${pendingPayment.quoteId}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: pendingPayment.paymentId }),
    });
    setBusyQuoteId(null);
    if (!releaseResponse.ok) {
      setMessage('Unable to finalise contact release.');
      return;
    }
    await loadContact(pendingPayment.quoteId);
    setPendingPayment(null);
    setMessage(null);
  }

  if (!tender) {
    return (
      <AppShell role="client" title="Tender">
        <p className="text-sm text-concrete-grey">{loadError ?? 'Loading\u2026'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" title={tender.reference}>
      <section className="mx-auto max-w-2xl">
        <Link href="/client/tenders" className="mb-6 inline-block text-sm font-semibold text-concrete-grey hover:text-foundation-navy">
          &larr; Back to My Tenders
        </Link>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foundation-navy">{tender.subcategory}</h2>
        <p className="mt-2 max-w-xl text-sm text-concrete-grey">
          {tender.category} &middot; {tender.location} &middot; Closes{' '}
          {new Date(tender.closingDate).toLocaleDateString('en-GB')}
        </p>
        {tender.supplyDate && <p className="mt-1 text-sm text-concrete-grey">Requested supply date: {new Date(tender.supplyDate).toLocaleDateString('en-GB')}</p>}
        {tender.items.length > 0 && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Additional items</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-foundation-navy">
              {tender.items.map((item) => <li key={item.id}>{item.subcategory} &middot; {item.quantity}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Quotes</p>
          {quotes.length > 0 && (
            <a
              href={`/api/tenders/${params.id}/quotes/pdf`}
              className="inline-flex min-h-11 items-center rounded-lg border border-steel-blue/40 bg-white px-4 text-sm font-semibold text-steel-blue shadow-soft hover:border-steel-blue hover:bg-steel-blue/5"
            >
              Download PDF
            </a>
          )}
        </div>
        {message && <p className="mb-4 text-sm font-semibold text-attention">{message}</p>}
        {quotes.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">
            No quotes have been submitted. Matched Retailers will appear here once they respond.
          </Card>
        ) : (
          <>
            <p className="mb-4 text-sm text-concrete-grey">
              Compare the commercial details first. Accepting a quote starts the contact-release payment shown against
              that quote; contact details remain hidden until payment is confirmed.
            </p>
            <QuoteComparison
              quotes={quotes}
              contacts={contacts}
              pendingPayment={pendingPayment}
              pendingCheckoutUrl={pendingPayment?.checkoutUrl}
              busyQuoteId={busyQuoteId}
              onAccept={handleAccept}
              onSimulateReleasePayment={handleSimulateReleasePayment}
              onLoadContact={loadContact}
            />
          </>
        )}
        {quotes.map((quote) => (
          <div key={quote.id} className="mt-6">
            <TenderMessages tenderId={params.id} quoteId={quote.id} role="client" />
          </div>
        ))}
      </section>
    </AppShell>
  );
}

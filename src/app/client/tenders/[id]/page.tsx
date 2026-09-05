'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuoteComparison } from '@/components/quotes/QuoteComparison';
import { TenderMessages } from '@/components/quotes/TenderMessages';
import { REQUIREMENT_OPTIONS } from '@/lib/categories';

type Tender = {
  id: string;
  reference: string;
  category: string;
  subcategory: string;
  location: string;
  urgency: string;
  closingDate: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  supplyDate: string | null;
  requirements: string;
  description: string;
  items: { id: string; category: string; subcategory: string; item: string | null; quantity: string; description: string }[];
  attachments: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
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
  const [professionalInterests, setProfessionalInterests] = useState<Array<{ id: string; contact: Contact }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const interestResponse = await fetch(`/api/tenders/${params.id}/professional-interest`);
    if (interestResponse.ok) {
      const interestData = await interestResponse.json() as { interests?: Array<{ id: string; contact: Contact }> };
      setProfessionalInterests(interestData.interests ?? []);
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

  async function handleTenderUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tender) return;
    setSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/tenders/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: formData.get('location'),
        urgency: formData.get('urgency'),
        closingDate: formData.get('closingDate'),
        supplyDate: formData.get('supplyDate') || undefined,
        requirements: formData.getAll('requirements'),
        description: formData.get('description'),
        items: tender.items.map((item) => ({
          id: item.id,
          quantity: formData.get(`quantity-${item.id}`),
          description: formData.get(`description-${item.id}`),
        })),
      }),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      const fieldErrors = data?.issues?.fieldErrors ?? {};
      setMessage(Object.values(fieldErrors).flat()[0] as string | undefined ?? data?.error ?? 'Unable to update this tender.');
      return;
    }
    setEditing(false);
    setMessage('Tender updated. Matched Providers have been notified; existing Provider access remains available.');
    await load();
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
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
            {editing ? 'Cancel edit' : 'Edit tender'}
          </Button>
          {(tender.status === 'CLOSED' || new Date(tender.closingDate).getTime() <= Date.now()) && (
            <Link href={`/user/tenders/new?copyFrom=${encodeURIComponent(tender.id)}`} className="inline-flex h-11 items-center justify-center rounded-lg bg-safety-amber px-5 text-sm font-semibold text-foundation-navy shadow-soft hover:bg-hi-viz-tint hover:shadow-soft-md">
              Re-tender
            </Link>
          )}
        </div>
        {editing ? (
          <Card className="mt-5">
            <form onSubmit={handleTenderUpdate} className="flex flex-col gap-5">
              <h3 className="font-heading text-lg font-bold text-foundation-navy">Edit tender</h3>
              <p className="text-sm text-concrete-grey">The tender reference stays the same. Existing Provider access remains active after this update.</p>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                Jobsite or delivery postcode
                <input name="location" required defaultValue={tender.location} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                  Project urgency
                  <select name="urgency" defaultValue={tender.urgency} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal">
                    <option value="standard">Standard</option>
                    <option value="urgent">Urgent</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                  Quote deadline
                  <input name="closingDate" type="date" required defaultValue={tender.closingDate.slice(0, 10)} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                Planned works start date (optional)
                <input name="supplyDate" type="date" defaultValue={tender.supplyDate?.slice(0, 10) ?? ''} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-foundation-navy">Site, delivery and supporting requirements</legend>
                {REQUIREMENT_OPTIONS.map((requirement) => (
                  <label key={requirement} className="flex items-center gap-3 text-sm text-concrete-grey">
                    <input name="requirements" type="checkbox" value={requirement} defaultChecked={tender.requirements.split(',').includes(requirement)} className="h-4 w-4 accent-safety-amber" />
                    {requirement}
                  </label>
                ))}
              </fieldset>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                Additional information
                <textarea name="description" rows={4} defaultValue={tender.description} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              {tender.items.map((item, index) => (
                <div key={item.id} className="flex flex-col gap-4 border-t border-slate-200 pt-4">
                  <h4 className="font-heading text-base font-bold text-foundation-navy">Package {index + 1}: {item.item ?? item.subcategory}</h4>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                    Quantity
                    <input name={`quantity-${item.id}`} required defaultValue={item.quantity} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-normal" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-foundation-navy">
                    Package specification
                    <textarea name={`description-${item.id}`} rows={3} defaultValue={item.description} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                </div>
              ))}
              <Button type="submit" loading={saving} className="self-start">Save changes</Button>
            </form>
          </Card>
        ) : (
          <Card className="mt-5 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Tender details</p>
              <p className="mt-2 whitespace-pre-line text-sm text-foundation-navy">{tender.description || 'No additional information provided.'}</p>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-concrete-grey">Urgency</dt><dd className="mt-1 text-foundation-navy">{tender.urgency}</dd></div>
              <div><dt className="font-semibold text-concrete-grey">Planned works start</dt><dd className="mt-1 text-foundation-navy">{tender.supplyDate ? new Date(tender.supplyDate).toLocaleDateString('en-GB') : 'Not specified'}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-concrete-grey">Requirements</dt><dd className="mt-1 text-foundation-navy">{tender.requirements || 'None'}</dd></div>
            </dl>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Tender packages</p>
              <div className="mt-3 flex flex-col gap-3">
                {tender.items.map((item) => (
                  <div key={item.id} className="border-l-4 border-steel-blue/40 pl-4">
                    <p className="font-semibold text-foundation-navy">{item.item ?? item.subcategory}</p>
                    <p className="text-sm text-concrete-grey">{item.category} &middot; {item.quantity}</p>
                    <p className="mt-2 whitespace-pre-line text-sm text-foundation-navy">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            {tender.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Attachments</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {tender.attachments.map((attachment) => <li key={attachment.id}><a href={`/api/tenders/${params.id}/attachments/${attachment.id}`} download={attachment.fileName} className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">{attachment.fileName}</a></li>)}
                </ul>
              </div>
            )}
          </Card>
        )}
        {professionalInterests.length > 0 && (
          <Card className="mt-5">
            <h3 className="font-heading text-lg font-bold text-foundation-navy">Professional interests</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {professionalInterests.map((interest) => (
                <li key={interest.id} className="border-l-4 border-steel-blue/40 pl-4 text-sm text-concrete-grey">
                  <p className="font-semibold text-foundation-navy">{interest.contact.contactName}</p>
                  <p>{interest.contact.email}</p>
                  {interest.contact.contactPhone && <p>{interest.contact.contactPhone}</p>}
                </li>
              ))}
            </ul>
          </Card>
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

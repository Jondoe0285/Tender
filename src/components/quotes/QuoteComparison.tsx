'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { independentReviewTierDescription } from '@/lib/independentReviewTiers';
import { allowTestPayments } from '@/lib/runtime';

type QuoteCommon = {
  id: string;
  reference: string;
  validityDays: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  submittedAt: string;
  expiresAt: string;
  providerIsSoleTrader: boolean;
  providerVerificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verifiedDocumentLabels: string[];
  independentlyVerified: boolean;
  independentReviewTier: 'BRONZE' | 'SILVER' | 'GOLD' | null;
  award?: { id: string; awardedAt: string; packageSpecHash: string } | null;
};

type ActiveQuote = QuoteCommon & {
  expired: false;
  priceGbp: number;
  leadTimeDays: number;
  deliveryDateConfirmed: boolean;
  deliveryInfo: string;
  lines: { tenderItemId: string; priceGbp: number | null; available: boolean; unitRateGbp?: number | null; quantityValue?: number | null; unit?: string | null; pricingKind?: string | null; tenderItem: { category: string; subcategory: string; item: string | null; quantity: string } }[];
  charges: { id: string; description: string; priceGbp: number }[];
  releaseFeeGbp: number;
  releaseFeeMode?: string;
  requiresSecondApprover?: boolean;
};

type ExpiredQuote = QuoteCommon & {
  expired: true;
  expiryMessage: string;
};

type Quote = ActiveQuote | ExpiredQuote;

function ProviderVerificationBadge({ status, verifiedDocumentLabels, independentlyVerified, independentReviewTier, soleTrader }: { status: Quote['providerVerificationStatus']; verifiedDocumentLabels: string[]; independentlyVerified: boolean; independentReviewTier: Quote['independentReviewTier']; soleTrader: boolean }) {
  if (independentlyVerified) {
    const tier = independentReviewTier;
    const bannerLabel = tier === 'BRONZE' ? 'Bronze' : tier === 'SILVER' ? 'Silver' : tier === 'GOLD' ? 'Gold' : 'Bronze';
    const docLabel = tier === 'BRONZE' ? 'Enhanced Bronze Verification' : tier === 'SILVER' ? 'Enhanced Silver Verification' : 'Enhanced Gold Verification';
    return <span title={`${docLabel} — ${independentReviewTierDescription(tier)} Sinclair Safety Solutions Ltd completed this professional review through the HSQE Consult Hub platform. This does not replace your own due diligence before any formal agreement.`}><StatusBadge status="approved">{bannerLabel}</StatusBadge></span>;
  }
  if (status === 'VERIFIED') {
    const docLabel = soleTrader ? 'Sole trader automated assessment' : 'Incorporated automated assessment';
    const evidenceLabel = soleTrader ? 'self-employment' : 'legal-compliance & incorporation';
    const title = verifiedDocumentLabels.length > 0 ? `${docLabel} — Automated ${evidenceLabel} evidence reviewed: ${verifiedDocumentLabels.join(', ')}. Complete your own due diligence.` : `${docLabel} — Automated ${evidenceLabel} assessment passed. Complete your own due diligence.`;
    return <span title={title}><StatusBadge status="approved">Verified</StatusBadge></span>;
  }
  if (soleTrader) {
    return <span title="Sole Trader (Unverified) — This Provider declared sole-trader status and has not yet completed automated assessment. Complete your own identity, insurance, competence, and commercial checks before appointing them."><StatusBadge status="neutral">Sole Trader</StatusBadge></span>;
  }
  if (status === 'PENDING') return <StatusBadge status="pending">Verification pending</StatusBadge>;
  if (status === 'EXPIRED') return <span title="This Provider's verification lapsed because a document expired."><StatusBadge status="attention">Verification expired</StatusBadge></span>;
  return <StatusBadge status="neutral">Unverified</StatusBadge>;
}

type SortKey = 'priceGbp' | 'leadTimeDays' | 'validityDays' | 'submittedAt';

type QuoteComparisonProps = {
  quotes: Quote[];
  contacts: Record<string, { contactName: string; contactPhone: string | null; email: string }>;
  pendingPayment: { quoteId: string; paymentId: string } | null;
  pendingCheckoutUrl?: string | null;
  busyQuoteId: string | null;
  canAward?: boolean;
  onAccept: (quoteId: string, declarationAccepted?: boolean, secondApproverEmail?: string, purchaseOrderNumber?: string) => void;
  onSimulateReleasePayment: () => void;
  onLoadContact: (quoteId: string) => void;
};

export function QuoteComparison({
  quotes,
  contacts,
  pendingPayment,
  pendingCheckoutUrl,
  busyQuoteId,
  canAward = true,
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
}: QuoteComparisonProps) {
  const [sortKey, setSortKey] = useState<SortKey>('priceGbp');
  const [sortAscending, setSortAscending] = useState(true);

  const activeQuotes = quotes.filter((quote): quote is ActiveQuote => !quote.expired);
  const submittedQuotes = activeQuotes.filter((quote) => quote.status === 'SUBMITTED');
  const fullySuppliedQuotes = submittedQuotes.filter((quote) => quote.lines.length > 0 && quote.lines.every((quoteLine) => quoteLine.available));
  const bestPrice = fullySuppliedQuotes.length ? Math.min(...fullySuppliedQuotes.map((quote) => quote.priceGbp)) : null;
  const bestLeadTime = submittedQuotes.length ? Math.min(...submittedQuotes.map((quote) => quote.leadTimeDays)) : null;

  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((first, second) => {
      if (first.expired !== second.expired) return first.expired ? 1 : -1;
      if (first.expired || second.expired) return new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime();
      const firstValue = first[sortKey];
      const secondValue = second[sortKey];
      const comparison = firstValue < secondValue ? -1 : firstValue > secondValue ? 1 : 0;
      return sortAscending ? comparison : -comparison;
    });
  }, [quotes, sortAscending, sortKey]);

  function sortBy(key: SortKey) {
    if (key === sortKey) setSortAscending((ascending) => !ascending);
    else {
      setSortKey(key);
      setSortAscending(true);
    }
  }

  const sortLabels: Record<SortKey, string> = {
    priceGbp: 'Price excl. VAT',
    leadTimeDays: 'Lead time',
    validityDays: 'Validity',
    submittedAt: 'Submitted date',
  };

  const awarded = quotes.find((quote) => quote.award)?.award;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        Sorted by {sortLabels[sortKey]} ({sortAscending ? 'ascending' : 'descending'})
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-concrete-grey">Compare {quotes.length === 1 ? '1 formal quote' : `${quotes.length} formal quotes`} side by side.</p>
        <p className="text-xs text-concrete-grey">Select a column heading to sort</p>
      </div>
      {awarded && (
        <div className="mb-5 rounded-lg border border-approved/40 bg-approved/5 px-4 py-3">
          <p className="text-sm font-semibold text-foundation-navy">Award recorded</p>
          <p className="mt-1 text-xs text-concrete-grey">This package was awarded on {new Date(awarded.awardedAt).toLocaleDateString('en-GB')} against the issued specification hash.</p>
        </div>
      )}

      <details className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-foundation-navy">Verification key</summary>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3 lg:grid-cols-6">
          <div><StatusBadge status="neutral">Unverified</StatusBadge><p className="mt-2 text-xs font-semibold text-foundation-navy">Unverified</p><p className="mt-1 text-xs text-concrete-grey">No approved verification evidence recorded on the platform.</p></div>
          <div><StatusBadge status="neutral">Sole Trader</StatusBadge><p className="mt-2 text-xs font-semibold text-foundation-navy">Sole Trader (Unverified)</p><p className="mt-1 text-xs text-concrete-grey">Declared sole trader status; complete suitable due diligence before appointment.</p></div>
          <div><StatusBadge status="approved">Verified</StatusBadge><p className="mt-2 text-xs font-semibold text-foundation-navy">Sole trader automated assessment / Incorporated automated assessment</p><p className="mt-1 text-xs text-concrete-grey">Passed automated self-employment or incorporation &amp; legal-compliance checks.</p></div>
          <div><StatusBadge status="approved">Bronze</StatusBadge><p className="mt-2 text-xs font-semibold text-foundation-navy">Enhanced Bronze Verification</p><p className="mt-1 text-xs text-concrete-grey">Health &amp; Safety legal requirements, permits, insurances, and competent advice reviewed.</p></div>
          <div><StatusBadge status="approved">Silver</StatusBadge><p className="mt-2 text-xs font-semibold text-foundation-navy">Enhanced Silver Verification</p><p className="mt-1 text-xs text-concrete-grey">Bronze criteria plus employee &amp; managerial safety training evidence reviewed.</p></div>
          <div><StatusBadge status="approved">Gold</StatusBadge><p className="mt-2 text-xs font-semibold text-foundation-navy">Enhanced Gold Verification</p><p className="mt-1 text-xs text-concrete-grey">Bronze &amp; Silver criteria plus comprehensive management system or SSIP membership reviewed.</p></div>
        </div>
        <p className="mt-3 text-xs text-concrete-grey">These statuses do not replace your own suitable due diligence before entering a formal agreement.</p>
        <Link href="/policies/verification-policy" className="mt-2 inline-block text-xs font-semibold text-steel-blue hover:text-foundation-navy">Read the detailed verification policy</Link>
      </details>

      <div className="hidden overflow-x-auto rounded-md border border-slate-200 bg-white lg:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-concrete-grey">
            <tr>
              <th className="w-40 px-5 py-4 font-semibold">Quote</th>
              <SortableHeader label="Price excl. VAT" sortKey="priceGbp" activeKey={sortKey} ascending={sortAscending} onSort={sortBy} />
              <SortableHeader label="Lead time" sortKey="leadTimeDays" activeKey={sortKey} ascending={sortAscending} onSort={sortBy} />
              <th className="px-5 py-4 font-semibold">Supply date</th>
              <th className="px-5 py-4 font-semibold">Quote breakdown</th>
              <th className="px-5 py-4 font-semibold">Delivery</th>
              <th className="px-5 py-4 font-semibold">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedQuotes.map((quote) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                bestPrice={bestPrice}
                bestLeadTime={bestLeadTime}
                contact={contacts[quote.id]}
                isPendingPayment={pendingPayment?.quoteId === quote.id}
                busy={busyQuoteId === quote.id}
                canAward={canAward}
                onAccept={onAccept}
                onSimulateReleasePayment={onSimulateReleasePayment}
                pendingCheckoutUrl={pendingCheckoutUrl}
                onLoadContact={onLoadContact}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 lg:hidden">
        {sortedQuotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            bestPrice={bestPrice}
            bestLeadTime={bestLeadTime}
            contact={contacts[quote.id]}
            isPendingPayment={pendingPayment?.quoteId === quote.id}
            busy={busyQuoteId === quote.id}
            canAward={canAward}
            onAccept={onAccept}
            onSimulateReleasePayment={onSimulateReleasePayment}
            pendingCheckoutUrl={pendingCheckoutUrl}
            onLoadContact={onLoadContact}
          />
        ))}
      </div>
    </>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  ascending,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  ascending: boolean;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className="px-5 py-4 font-semibold" aria-sort={active ? (ascending ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}${active ? `, currently ${ascending ? 'ascending' : 'descending'}` : ''}`}
        className="rounded px-1 py-1 text-left hover:text-foundation-navy"
      >
        {label} {active ? (ascending ? '↑' : '↓') : '↕'}
      </button>
    </th>
  );
}

function QuoteRow({
  quote,
  bestPrice,
  bestLeadTime,
  contact,
  isPendingPayment,
  busy,
  canAward,
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
  pendingCheckoutUrl,
}: QuoteRowProps) {
  if (quote.expired) return <ExpiredQuoteRow quote={quote} />;

  return (
    <tr className={`align-top ${quote.independentlyVerified ? 'bg-approved/5' : ''}`}>
      <td className="px-5 py-5">
        <p className="font-semibold text-foundation-navy">{quote.reference}</p>
        <StatusBadge status={quote.status === 'ACCEPTED' ? 'approved' : 'neutral'}>{quote.status}</StatusBadge>
        <div className="mt-2"><ProviderVerificationBadge status={quote.providerVerificationStatus} verifiedDocumentLabels={quote.verifiedDocumentLabels} independentlyVerified={quote.independentlyVerified} independentReviewTier={quote.independentReviewTier} soleTrader={quote.providerIsSoleTrader} /></div>
      </td>
      <td className="px-5 py-5">
        <p className="text-lg font-semibold tabular-nums tracking-tight text-foundation-navy">£{quote.priceGbp} excl. VAT</p>
        {quote.status === 'SUBMITTED' && quote.priceGbp === bestPrice && <StatusBadge status="approved">Best price</StatusBadge>}
      </td>
      <td className="px-5 py-5">
        <p className="font-semibold text-foundation-navy">{quote.leadTimeDays} days</p>
        {quote.status === 'SUBMITTED' && quote.leadTimeDays === bestLeadTime && <StatusBadge status="approved">Fastest</StatusBadge>}
      </td>
      <td className={`px-5 py-5 text-sm font-semibold ${quote.deliveryDateConfirmed ? 'text-approved' : 'text-concrete-grey'}`}>
        {quote.deliveryDateConfirmed ? 'Confirmed' : 'No supply date requested'}
      </td>
      <td className="max-w-[260px] px-5 py-5"><QuoteBreakdown quote={quote} /></td>
      <td className="max-w-[180px] whitespace-pre-line px-5 py-5 text-concrete-grey">{quote.deliveryInfo}</td>
      <td className="min-w-[170px] px-5 py-5">
        <DecisionActions
          quote={quote}
          contact={contact}
          isPendingPayment={isPendingPayment}
          busy={busy}
          canAward={canAward}
          onAccept={onAccept}
          onSimulateReleasePayment={onSimulateReleasePayment}
          onLoadContact={onLoadContact}
          pendingCheckoutUrl={pendingCheckoutUrl}
        />
      </td>
    </tr>
  );
}

function QuoteCard({
  quote,
  bestPrice,
  bestLeadTime,
  contact,
  isPendingPayment,
  busy,
  canAward,
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
  pendingCheckoutUrl,
}: QuoteRowProps) {
  if (quote.expired) return <ExpiredQuoteCard quote={quote} />;

  return (
    <Card interactive className={quote.independentlyVerified ? 'border-approved/40 bg-approved/5' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{quote.reference}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foundation-navy">£{quote.priceGbp} excl. VAT</p>
          <div className="mt-2"><ProviderVerificationBadge status={quote.providerVerificationStatus} verifiedDocumentLabels={quote.verifiedDocumentLabels} independentlyVerified={quote.independentlyVerified} independentReviewTier={quote.independentReviewTier} soleTrader={quote.providerIsSoleTrader} /></div>
        </div>
        <StatusBadge status={quote.status === 'ACCEPTED' ? 'approved' : 'neutral'}>{quote.status}</StatusBadge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm">
        <Detail label="Lead time" value={`${quote.leadTimeDays} days`} highlight={quote.status === 'SUBMITTED' && quote.leadTimeDays === bestLeadTime} />
        <Detail label="Supply date" value={quote.deliveryDateConfirmed ? 'Confirmed' : 'No supply date requested'} highlight={quote.deliveryDateConfirmed} />
        <Detail label="Validity" value={`${quote.validityDays} days`} />
        <Detail label="Delivery" value={quote.deliveryInfo} />
      </div>
      <div className="mt-4"><QuoteBreakdown quote={quote} /></div>
      {quote.status === 'SUBMITTED' && quote.priceGbp === bestPrice && <div className="mt-3"><StatusBadge status="approved">Best price</StatusBadge></div>}
      <div className="mt-5">
        <DecisionActions
          quote={quote}
          contact={contact}
          isPendingPayment={isPendingPayment}
          busy={busy}
          canAward={canAward}
          onAccept={onAccept}
          onSimulateReleasePayment={onSimulateReleasePayment}
          onLoadContact={onLoadContact}
          pendingCheckoutUrl={pendingCheckoutUrl}
        />
      </div>
    </Card>
  );
}

type QuoteRowProps = {
  quote: Quote;
  bestPrice: number | null;
  bestLeadTime: number | null;
  contact?: Contact;
  isPendingPayment: boolean;
  busy: boolean;
  canAward: boolean;
  onAccept: (quoteId: string, declarationAccepted?: boolean, secondApproverEmail?: string, purchaseOrderNumber?: string) => void;
  onSimulateReleasePayment: () => void;
  onLoadContact: (quoteId: string) => void;
  pendingCheckoutUrl?: string | null;
};

type Contact = { contactName: string; contactPhone: string | null; email: string };

function QuoteBreakdown({ quote }: { quote: ActiveQuote }) {
  if (quote.lines.length === 0 && quote.charges.length === 0) return <p className="text-sm text-concrete-grey">Not itemized</p>;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Quote breakdown</p>
      <ul className="mt-2 flex flex-col gap-2 text-sm text-foundation-navy">
        {quote.lines.map((quoteLine) => (
          <li key={quoteLine.tenderItemId} className="flex items-start justify-between gap-3">
            <span>{quoteLine.tenderItem.item ?? quoteLine.tenderItem.subcategory} ({quoteLine.tenderItem.quantity})</span>
            <span className={`shrink-0 font-semibold ${quoteLine.available ? '' : 'text-attention'}`}>
              {quoteLine.available
                ? quoteLine.unitRateGbp != null
                  ? `£${quoteLine.unitRateGbp}/${quoteLine.unit ?? 'unit'} · £${quoteLine.priceGbp}`
                  : `£${quoteLine.priceGbp}`
                : 'Cannot supply'}
            </span>
          </li>
        ))}
        {quote.charges.map((charge) => (
          <li key={charge.id} className="flex items-start justify-between gap-3">
            <span>{charge.description}</span>
            <span className="shrink-0 font-semibold">£{charge.priceGbp}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-slate-200 pt-2 text-sm font-semibold text-foundation-navy">Full submitted quote value: £{quote.priceGbp} excl. VAT</p>
    </div>
  );
}

function Detail({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{label}</p>
      <p className={`mt-1 text-sm ${highlight ? 'font-semibold text-approved' : 'text-foundation-navy'}`}>{value}</p>
    </div>
  );
}

function ExpiredQuoteRow({ quote }: { quote: ExpiredQuote }) {
  return (
    <tr className="align-top bg-slate-50">
      <td className="px-5 py-5">
        <p className="font-semibold text-foundation-navy">{quote.reference}</p>
        <StatusBadge status="attention">Expired</StatusBadge>
      </td>
      <td colSpan={6} className="px-5 py-5 text-sm text-concrete-grey">
        <p className="font-semibold text-foundation-navy">{quote.expiryMessage}</p>
        <p className="mt-1">Provider validity period: {quote.validityDays} days. Expired on {new Date(quote.expiresAt).toLocaleDateString('en-GB')}.</p>
      </td>
    </tr>
  );
}

function ExpiredQuoteCard({ quote }: { quote: ExpiredQuote }) {
  return (
    <Card className="border-attention/30 bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{quote.reference}</p>
          <p className="mt-2 text-sm font-semibold text-foundation-navy">{quote.expiryMessage}</p>
          <p className="mt-1 text-sm text-concrete-grey">Provider validity period: {quote.validityDays} days. Expired on {new Date(quote.expiresAt).toLocaleDateString('en-GB')}.</p>
        </div>
        <StatusBadge status="attention">Expired</StatusBadge>
      </div>
    </Card>
  );
}

function DecisionActions({
  quote,
  contact,
  isPendingPayment,
  busy,
  canAward,
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
  pendingCheckoutUrl,
}: {
  quote: ActiveQuote;
  contact?: Contact;
  isPendingPayment: boolean;
  busy: boolean;
  canAward: boolean;
  onAccept: (quoteId: string, declarationAccepted?: boolean, secondApproverEmail?: string, purchaseOrderNumber?: string) => void;
  onSimulateReleasePayment: () => void;
  onLoadContact: (quoteId: string) => void;
  pendingCheckoutUrl?: string | null;
}) {
  const [showDeclaration, setShowDeclaration] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [secondApproverEmail, setSecondApproverEmail] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');

  if (quote.status === 'SUBMITTED') {
    if (!canAward) {
      return <p className="text-sm text-foundation-navy">A Buyer on this organisation must accept this quote.</p>;
    }
    const requiresDeclaration = quote.providerVerificationStatus === 'VERIFIED' || quote.independentlyVerified;
    const feeLabel = quote.releaseFeeMode === 'PERCENTAGE'
      ? `Calculated platform charge: £${quote.releaseFeeGbp} excl. VAT (${quote.releaseFeeMode.toLowerCase()} of quote)`
      : `Calculated platform charge: £${quote.releaseFeeGbp} excl. VAT (fixed)`;
    const accept = (declarationAccepted?: boolean) => onAccept(quote.id, declarationAccepted, quote.requiresSecondApprover ? secondApproverEmail : undefined, purchaseOrderNumber);
    return (
      <>
        <p className="mb-2 text-xs font-semibold text-foundation-navy">{feeLabel}</p>
        <label className="mb-2 block text-xs font-semibold text-foundation-navy">
          Purchase order number
          <input
            type="text"
            value={purchaseOrderNumber}
            onChange={(event) => setPurchaseOrderNumber(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="PO-2026-00412"
            maxLength={40}
            required
          />
        </label>
        {quote.requiresSecondApprover && (
          <label className="mb-2 block text-xs font-semibold text-foundation-navy">
            Second Approver email
            <input
              type="email"
              value={secondApproverEmail}
              onChange={(event) => setSecondApproverEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="approver@company.example"
            />
          </label>
        )}
        <Button onClick={() => requiresDeclaration ? setShowDeclaration(true) : accept()} loading={busy} disabled={Boolean(!purchaseOrderNumber.trim() || (quote.requiresSecondApprover && !secondApproverEmail.trim()))}>Accept full quote · £{quote.releaseFeeGbp} excl. VAT</Button>
        {showDeclaration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foundation-navy/50 p-4">
            <Card className="max-w-lg">
              <h3 className="text-base font-semibold tracking-tight text-foundation-navy">Before you proceed</h3>
            <p className="mt-3 text-sm text-concrete-grey">Trade Tender&rsquo;s automated review assesses legal-compliance evidence only and may make mistakes. You retain full responsibility for suitable independent due diligence before entering any formal agreement, and Trade Tender accepts no liability for the Provider&rsquo;s work, conduct, or the outcome of your engagement with them.</p>
              <label className="mt-4 flex items-start gap-3 text-sm text-foundation-navy">
                <input type="checkbox" checked={declarationChecked} onChange={(event) => setDeclarationChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-trade-blue" />
                I have read and accept this declaration.
              </label>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeclaration(false); setDeclarationChecked(false); }}>Cancel</Button>
                <Button disabled={!declarationChecked} loading={busy} onClick={() => { setShowDeclaration(false); accept(true); }}>Accept &amp; proceed</Button>
              </div>
            </Card>
          </div>
        )}
      </>
    );
  }
  if (quote.status === 'ACCEPTED' && isPendingPayment) {
    if (!canAward) {
      return <p className="text-sm text-foundation-navy">Waiting for a Buyer to complete the release payment.</p>;
    }
    if (pendingCheckoutUrl) {
      return <a href={pendingCheckoutUrl} className="inline-flex min-h-11 items-center justify-center rounded-md bg-trade-blue px-5 text-sm font-semibold text-site-white hover:bg-trade-blue/90">Continue payment</a>;
    }
    if (allowTestPayments) {
      return <Button onClick={onSimulateReleasePayment} loading={busy}>Complete test payment</Button>;
    }
    return <p className="text-sm font-semibold text-concrete-grey">Waiting for payment confirmation.</p>;
  }
  if (quote.status === 'ACCEPTED' && !contact) {
    return <Button variant="secondary" onClick={() => onLoadContact(quote.id)}>View released contact</Button>;
  }
  if (contact) {
    return <div className="text-sm text-concrete-grey"><p className="font-semibold text-foundation-navy">{contact.contactName}</p><p>{contact.email}</p>{contact.contactPhone && <p>{contact.contactPhone}</p>}</div>;
  }
  return null;
}

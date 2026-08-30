'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

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

type SortKey = 'priceGbp' | 'leadTimeDays' | 'validityDays' | 'submittedAt';

type QuoteComparisonProps = {
  quotes: Quote[];
  contacts: Record<string, { contactName: string; contactPhone: string | null; email: string }>;
  pendingPayment: { quoteId: string; paymentId: string } | null;
  pendingCheckoutUrl?: string | null;
  busyQuoteId: string | null;
  onAccept: (quoteId: string) => void;
  onSimulateReleasePayment: () => void;
  onLoadContact: (quoteId: string) => void;
};

export function QuoteComparison({
  quotes,
  contacts,
  pendingPayment,
  pendingCheckoutUrl,
  busyQuoteId,
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
}: QuoteComparisonProps) {
  const [sortKey, setSortKey] = useState<SortKey>('priceGbp');
  const [sortAscending, setSortAscending] = useState(true);

  const submittedQuotes = quotes.filter((quote) => quote.status === 'SUBMITTED');
  const fullySuppliedQuotes = submittedQuotes.filter((quote) => quote.lines.length > 0 && quote.lines.every((quoteLine) => quoteLine.available));
  const bestPrice = fullySuppliedQuotes.length ? Math.min(...fullySuppliedQuotes.map((quote) => quote.priceGbp)) : null;
  const bestLeadTime = submittedQuotes.length ? Math.min(...submittedQuotes.map((quote) => quote.leadTimeDays)) : null;
  const sponsoredQuotes = quotes.filter((quote) => quote.sponsoredPlacementActive);

  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((first, second) => {
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

  return (
    <>
      {sponsoredQuotes.length > 0 && (
        <section className="mb-5 rounded-lg border border-safety-amber/50 bg-amber-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Sponsored Retailer placement</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {sponsoredQuotes.map((quote) => (
              <div key={quote.id} className="rounded-lg bg-white px-4 py-3 shadow-soft">
                <p className="font-semibold text-foundation-navy">{quote.reference}</p>
                <p className="mt-1 text-sm text-concrete-grey">£{quote.priceGbp} excl. VAT · {quote.leadTimeDays} days</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-concrete-grey">Compare {quotes.length} formal quote{quotes.length === 1 ? '' : 's'} side by side.</p>
        <p className="text-xs text-concrete-grey">Select a column heading to sort</p>
      </div>

      <div className="hidden overflow-x-auto rounded-card border border-slate-200 bg-white shadow-soft md:block">
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
                onAccept={onAccept}
                onSimulateReleasePayment={onSimulateReleasePayment}
                pendingCheckoutUrl={pendingCheckoutUrl}
                onLoadContact={onLoadContact}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {sortedQuotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            bestPrice={bestPrice}
            bestLeadTime={bestLeadTime}
            contact={contacts[quote.id]}
            isPendingPayment={pendingPayment?.quoteId === quote.id}
            busy={busyQuoteId === quote.id}
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
    <th className="px-5 py-4 font-semibold">
      <button type="button" onClick={() => onSort(sortKey)} className="rounded px-1 py-1 text-left hover:text-foundation-navy">
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
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
  pendingCheckoutUrl,
}: QuoteRowProps) {
  return (
    <tr className="align-top">
      <td className="px-5 py-5">
        <p className="font-semibold text-foundation-navy">{quote.reference}</p>
        <StatusBadge status={quote.status === 'ACCEPTED' ? 'approved' : 'neutral'}>{quote.status}</StatusBadge>
      </td>
      <td className="px-5 py-5">
        <p className="font-heading text-xl font-bold text-foundation-navy">£{quote.priceGbp} excl. VAT</p>
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
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
  pendingCheckoutUrl,
}: QuoteRowProps) {
  return (
    <Card interactive>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{quote.reference}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foundation-navy">£{quote.priceGbp} excl. VAT</p>
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
  onAccept: (quoteId: string) => void;
  onSimulateReleasePayment: () => void;
  onLoadContact: (quoteId: string) => void;
  pendingCheckoutUrl?: string | null;
};

type Contact = { contactName: string; contactPhone: string | null; email: string };

function QuoteBreakdown({ quote }: { quote: Quote }) {
  if (quote.lines.length === 0 && quote.charges.length === 0) return <p className="text-sm text-concrete-grey">Not itemized</p>;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Quote breakdown</p>
      <ul className="mt-2 flex flex-col gap-2 text-sm text-foundation-navy">
        {quote.lines.map((quoteLine) => (
          <li key={quoteLine.tenderItemId} className="flex items-start justify-between gap-3">
            <span>{quoteLine.tenderItem.item ?? quoteLine.tenderItem.subcategory} ({quoteLine.tenderItem.quantity})</span>
            <span className={`shrink-0 font-semibold ${quoteLine.available ? '' : 'text-attention'}`}>
              {quoteLine.available ? `£${quoteLine.priceGbp}` : 'Cannot supply'}
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
      <p className="mt-2 border-t border-slate-200 pt-2 text-sm font-semibold text-foundation-navy">Total: £{quote.priceGbp} excl. VAT</p>
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

function DecisionActions({
  quote,
  contact,
  isPendingPayment,
  busy,
  onAccept,
  onSimulateReleasePayment,
  onLoadContact,
  pendingCheckoutUrl,
}: {
  quote: Quote;
  contact?: Contact;
  isPendingPayment: boolean;
  busy: boolean;
  onAccept: (quoteId: string) => void;
  onSimulateReleasePayment: () => void;
  onLoadContact: (quoteId: string) => void;
  pendingCheckoutUrl?: string | null;
}) {
  if (quote.status === 'SUBMITTED') {
    return <Button onClick={() => onAccept(quote.id)} loading={busy}>Accept quote · £{quote.releaseFeeGbp} excl. VAT release fee</Button>;
  }
  if (quote.status === 'ACCEPTED' && isPendingPayment) {
    if (pendingCheckoutUrl) {
      return <a href={pendingCheckoutUrl} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-safety-amber px-5 text-sm font-semibold text-foundation-navy shadow-soft hover:bg-hi-viz-tint">Continue payment</a>;
    }
    return <Button onClick={onSimulateReleasePayment} loading={busy}>Pay release fee (dev)</Button>;
  }
  if (quote.status === 'ACCEPTED' && !contact) {
    return <Button variant="secondary" onClick={() => onLoadContact(quote.id)}>View released contact</Button>;
  }
  if (contact) {
    return <div className="text-sm text-concrete-grey"><p className="font-semibold text-foundation-navy">{contact.contactName}</p><p>{contact.email}</p>{contact.contactPhone && <p>{contact.contactPhone}</p>}</div>;
  }
  return null;
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { supplyingTenderPath } from '@/lib/workspace-paths';

export default async function SubmittedQuotesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const quotes = await prisma.quote.findMany({
    where: { retailerId: user.id },
    orderBy: { submittedAt: 'desc' },
    include: { tender: { select: { id: true, reference: true, subcategory: true } } },
  });

  return (
    <AppShell role="retailer" title="Submitted quotes">
      <div className="mx-auto max-w-6xl">
        <PageHeader description="Every quote you have submitted, bound to the issued package, with current status." />
        {quotes.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-concrete-grey">
            No quotes have been submitted for this account.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
                <tr>
                  <th className="px-4 py-2.5">Quote</th>
                  <th className="px-4 py-2.5">Tender</th>
                  <th className="px-4 py-2.5">Package</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Validity</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">{quote.reference}</td>
                    <td className="px-4 py-2.5">
                      <Link href={supplyingTenderPath(quote.tender.id)} className="font-semibold text-foundation-navy hover:text-trade-blue">
                        {quote.tender.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-concrete-grey">{quote.tender.subcategory}</td>
                    <td className="px-4 py-2.5 tabular-nums text-foundation-navy">&pound;{quote.priceGbp} excl. VAT</td>
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{quote.validityDays} days</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={quote.status === 'ACCEPTED' ? 'approved' : 'neutral'}>{quote.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

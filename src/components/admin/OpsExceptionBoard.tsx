import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

type OpsExceptions = Awaited<ReturnType<typeof import('@/server/domain/opsExceptions').getOpsExceptions>>;

export function OpsExceptionBoard({ data }: { data: OpsExceptions }) {
  const empty = data.failedPayments.length === 0 && data.pendingVerification.length === 0 && data.closingTenders.length === 0 && data.harvestFlags.length === 0;

  return (
    <div className="mb-10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-steel-blue">Exceptions</p>
      <p className="mb-5 max-w-2xl text-sm text-concrete-grey">Failed payments, harvest flags, verification backlog, and SLA. Analytics stay below this row.</p>
      {empty ? (
        <Card>
          <p className="text-sm font-semibold text-foundation-navy">No open exceptions</p>
          <p className="mt-1 text-sm text-concrete-grey">Failed payments, harvest caps, pending verification, and closing tenders appear here first.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Failed payments</p>
            {data.failedPayments.length === 0 ? <p className="mt-2 text-sm text-concrete-grey">None</p> : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {data.failedPayments.map((payment) => (
                  <li key={payment.id} className="flex items-start justify-between gap-3">
                    <span>{payment.user.email} · {payment.type.replace(/_/g, ' ')}</span>
                    <StatusBadge status="attention">{`£${payment.amountGbp}`}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/super-user/payments" className="mt-3 inline-block text-xs font-semibold text-trade-blue">Open payments</Link>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Harvest flags</p>
            {data.harvestFlags.length === 0 ? <p className="mt-2 text-sm text-concrete-grey">None</p> : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {data.harvestFlags.map((flag) => (
                  <li key={flag.retailerId}>{flag.email} · {flag.harvestCount} unlocks without quote</li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Pending verification</p>
            {data.pendingVerification.length === 0 ? <p className="mt-2 text-sm text-concrete-grey">None</p> : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {data.pendingVerification.map((row) => (
                  <li key={row.userId}>{row.companyName}</li>
                ))}
              </ul>
            )}
            <Link href="/super-user/retailers" className="mt-3 inline-block text-xs font-semibold text-trade-blue">Open users</Link>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Closing soon</p>
            {data.closingTenders.length === 0 ? <p className="mt-2 text-sm text-concrete-grey">None</p> : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {data.closingTenders.map((tender) => (
                  <li key={tender.id}>{tender.reference} · {new Date(tender.closingDate).toLocaleDateString('en-GB')}</li>
                ))}
              </ul>
            )}
            <Link href="/super-user/tenders" className="mt-3 inline-block text-xs font-semibold text-trade-blue">Open tenders</Link>
          </Card>
        </div>
      )}
    </div>
  );
}

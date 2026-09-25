import { Card } from '@/components/ui/Card';
import type { RegisteredCompanyCounts } from '@/server/domain/registeredCompanyCounts';

export function RegisteredCompanyCounts({ data }: { data: RegisteredCompanyCounts }) {
  return (
    <Card className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Registered companies</p>
      <h2 className="mt-1 font-heading text-lg font-bold text-foundation-navy">Supplying companies by type</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-concrete-grey">
        Counts unique companies, not extra users on a company account. A company that offers more than one service is included in each of those types.
      </p>
      <p className="mt-4 text-sm font-semibold text-foundation-navy">
        {data.uniqueCompanies} supplying {data.uniqueCompanies === 1 ? 'company' : 'companies'}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {data.types.map((row) => (
          <div key={row.key} className="rounded-md border border-slate-200 bg-light-grey px-4 py-4">
            <p className="font-heading text-2xl font-bold tabular-nums text-foundation-navy">{row.companies}</p>
            <p className="mt-1 text-sm font-semibold text-foundation-navy">{row.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

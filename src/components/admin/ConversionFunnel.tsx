import { Card } from '@/components/ui/Card';

export type ConversionFunnelData = {
  windowDays: number;
  matches: number;
  unlocks: number;
  quotes: number;
  awards: number;
  releases: number;
};

function rate(numerator: number, denominator: number) {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function ConversionFunnel({ data }: { data: ConversionFunnelData }) {
  const stages = [
    { label: 'Match', value: data.matches, of: data.matches },
    { label: 'Unlock', value: data.unlocks, of: data.matches },
    { label: 'Quote', value: data.quotes, of: data.unlocks },
    { label: 'Award', value: data.awards, of: data.quotes },
    { label: 'Release', value: data.releases, of: data.awards },
  ];

  return (
    <Card className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Conversion</p>
      <h2 className="mt-1 font-heading text-lg font-bold text-foundation-navy">Match to contact release</h2>
      <p className="mt-1 text-sm text-concrete-grey">Last {data.windowDays} days. Counts are platform-wide, not a unique-user funnel.</p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-concrete-grey">
            <tr>
              <th className="pb-3">Stage</th>
              <th className="pb-3">Count</th>
              <th className="pb-3">Of previous</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stages.map((stage) => (
              <tr key={stage.label}>
                <td className="py-2.5 font-semibold text-foundation-navy">{stage.label}</td>
                <td className="py-2.5 tabular-nums text-foundation-navy">{stage.value}</td>
                <td className="py-2.5 tabular-nums text-concrete-grey">{stage.label === 'Match' ? '—' : rate(stage.value, stage.of)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

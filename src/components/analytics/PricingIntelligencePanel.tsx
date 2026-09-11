'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';

type PricingRow = Awaited<ReturnType<typeof import('@/server/domain/quoteEstimateService').getPricingIntelligenceByCategory>>[number];

type Props = {
  rows: PricingRow[];
  masterReductionPercent: number;
  isOwner: boolean;
};

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

export function PricingIntelligencePanel({ rows: initialRows, masterReductionPercent, isOwner }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(initialRows.map((row) => [row.id, String(row.manualOffsetPercent ?? row.automaticOffsetPercent)])));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const averageVariancePercent = rows.length ? rows.reduce((sum, row) => sum + row.variancePercent, 0) / rows.length : 0;
  const chartData = [...rows]
    .sort((first, second) => Math.abs(second.variancePercent) - Math.abs(first.variancePercent))
    .slice(0, 12)
    .map((row) => ({
      label: row.item ?? row.category,
      variance: Math.abs(row.variancePercent),
    }));

  async function saveOffset(row: PricingRow, mode: 'AUTOMATIC' | 'MANUAL') {
    setSavingId(row.id);
    setMessage(null);
    const payload = mode === 'AUTOMATIC'
      ? { mode }
      : { mode, manualOffsetPercent: Number(drafts[row.id]) };
    const response = await fetch(`/api/super-user/pricing-intelligence/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSavingId(null);
    const data = await response.json().catch(() => null) as { row?: PricingRow; error?: string } | null;
    if (!response.ok || !data?.row) {
      setMessage(data?.error ?? 'Unable to update pricing offset.');
      return;
    }
    setRows((current) => current.map((item) => item.id === row.id ? data.row! : item));
    setDrafts((current) => ({ ...current, [row.id]: String(data.row!.manualOffsetPercent ?? data.row!.automaticOffsetPercent) }));
    setMessage(mode === 'AUTOMATIC' ? 'Automatic offset restored.' : 'Manual offset saved.');
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-steel-blue">Pricing intelligence</p>
          <h1 className="font-heading text-3xl font-bold text-foundation-navy">Product-category estimate accuracy</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-concrete-grey">Baseline estimates refresh weekly from live quotation data already available in the platform. Automatic item offsets are recalculated from quote-line history, while Owners can apply a manual offset where erroneous or unusual results need correction.</p>
        </div>
        <StatusBadge status={Math.abs(averageVariancePercent) <= 10 ? 'approved' : 'pending'}>{Math.abs(averageVariancePercent) <= 10 ? 'Accurate' : 'Review offsets'}</StatusBadge>
      </div>

      {message && <p role="status" className="mb-5 rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}

      <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="font-heading text-lg font-bold text-foundation-navy">Highest variance categories</h2>
          <div className="mt-5 h-72">
            {chartData.length === 0 ? <p className="text-sm text-concrete-grey">No live quotation data has been reviewed yet.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="variance" fill="#1D3D5C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="font-heading text-lg font-bold text-foundation-navy">Fee basis control</h2>
          <p className="mt-3 text-sm text-concrete-grey">Master reduction is configured in Owner settings and applies after item offsets when calculating the dynamic tender release fee basis.</p>
          <p className="mt-5 font-heading text-3xl font-bold text-foundation-navy">{masterReductionPercent.toFixed(2)}%</p>
          <p className="mt-2 text-sm text-concrete-grey">A £100,000 estimate would use a {money.format(100000 * (1 - masterReductionPercent / 100))} fee basis.</p>
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Category and item offsets</h2>
            <p className="mt-1 text-sm text-concrete-grey">Rows are grouped by service, product category, and item rather than by tender.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{rows.length} tracked row{rows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-concrete-grey">
              <tr>
                <th className="pb-3">Product category</th>
                <th className="pb-3">Baseline</th>
                <th className="pb-3">Automatic offset</th>
                <th className="pb-3">Effective estimate</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-4 pr-4"><p className="font-semibold text-foundation-navy">{row.service} / {row.category}</p><p className="text-xs text-concrete-grey">{row.item ?? 'Category baseline'} · {row.sampleSize} live sample{row.sampleSize === 1 ? '' : 's'}</p></td>
                  <td className="py-4 pr-4 text-concrete-grey">{money.format(row.baselineGbp)}</td>
                  <td className="py-4 pr-4 text-concrete-grey">{row.automaticOffsetPercent.toFixed(2)}%</td>
                  <td className="py-4 pr-4 text-concrete-grey">{money.format(row.adjustedEstimateGbp)}</td>
                  <td className="py-4 pr-4"><StatusBadge status={Math.abs(row.variancePercent) <= 10 ? 'approved' : 'pending'}>{`${row.variancePercent > 0 ? '+' : ''}${row.variancePercent.toFixed(2)}%`}</StatusBadge></td>
                  <td className="py-4 pr-4">
                    {isOwner ? <div className="flex min-w-72 flex-wrap items-end gap-2"><div><Label htmlFor={`offset-${row.id}`}>Offset (%)</Label><Input id={`offset-${row.id}`} type="number" min="-100" max="100" step="0.01" value={drafts[row.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))} /></div><Button size="md" onClick={() => saveOffset(row, 'MANUAL')} loading={savingId === row.id}>Save</Button><Button size="md" variant="secondary" onClick={() => saveOffset(row, 'AUTOMATIC')} loading={savingId === row.id}>Auto</Button></div> : <span className="text-sm text-concrete-grey">{row.offsetMode === 'MANUAL' ? 'Manual override' : 'Automatic'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

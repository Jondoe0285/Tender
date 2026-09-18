'use client';

import { Card } from '@/components/ui/Card';

type SummaryRow = {
  id: string;
  contactName: string;
  email: string;
  sessionsStarted: number;
  sessionsCompleted: number;
  timeOnlineSeconds: number;
  completedActivity: number;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return 'Less than a minute';
  return [hours > 0 ? `${hours}h` : null, `${minutes}m`].filter(Boolean).join(' ');
}

export function SuperUserActivitySummary({ rows }: { rows: SummaryRow[] }) {
  return (
    <Card className="mb-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Owner view</p>
        <h2 className="mt-1 font-heading text-lg font-bold text-foundation-navy">Super User online time and activity</h2>
        <p className="mt-1 text-sm text-concrete-grey">Time and completed activity are calculated from the activity-log filters currently applied below.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-concrete-grey">
            <tr>
              <th className="pb-3">Super User</th>
              <th className="pb-3">Sessions</th>
              <th className="pb-3">Time online</th>
              <th className="pb-3">Completed activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3">
                  <p className="font-semibold text-foundation-navy">{row.contactName}</p>
                  <p className="text-xs text-concrete-grey">{row.email}</p>
                </td>
                <td className="py-3 text-concrete-grey">{row.sessionsCompleted} completed / {row.sessionsStarted} started</td>
                <td className="py-3 font-semibold text-foundation-navy">{formatDuration(row.timeOnlineSeconds)}</td>
                <td className="py-3 text-concrete-grey">{row.completedActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

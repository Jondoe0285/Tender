import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

function formatRequirementSummary(requirements: string[]): string {
  if (requirements.length === 0) return 'No specific requirements listed';
  const shown = requirements.slice(0, 2).join(', ');
  const remaining = requirements.length - 2;
  return remaining > 0 ? `${shown} +${remaining} more` : shown;
}

function formatDeadline(closingDate: string | Date): { label: string; urgent: boolean } {
  const date = new Date(closingDate);
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (daysLeft <= 0) return { label: `Closed ${dateLabel}`, urgent: true };
  if (daysLeft <= 3) return { label: `Closes in ${daysLeft}d (${dateLabel})`, urgent: true };
  return { label: `Closes in ${daysLeft}d (${dateLabel})`, urgent: false };
}

export type OpportunityCardData = {
  tenderId: string;
  reference: string;
  category: string;
  urgency: string;
  location: string;
  distanceMiles: number | null;
  requirements: string[];
  closingDate: string | Date;
  valueBand: string;
  unlockFeeLabel: string;
  unlocked: boolean;
  isNew: boolean;
};

export function TenderOpportunityCard({ data, href }: { data: OpportunityCardData; href: string }) {
  const deadline = formatDeadline(data.closingDate);

  return (
    <Link href={href} className="block">
      <Card interactive className="relative">
        {data.isNew && (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 text-xs font-semibold text-safety-amber">
            <span className="h-2 w-2 rounded-full bg-safety-amber" aria-hidden="true" />
            New
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{data.reference}</p>
          <StatusBadge status="neutral">{data.category}</StatusBadge>
        </div>

        <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Fact
            label="Location"
            value={data.distanceMiles != null ? `${data.location} · ${data.distanceMiles.toFixed(0)} mi away` : data.location}
          />
          <Fact label="Deadline" value={deadline.label} attention={deadline.urgent} />
          <Fact label="Estimated value" value={data.valueBand} />
          <Fact label="Unlock fee" value={data.unlockFeeLabel} />
          <div className="sm:col-span-2">
            <Fact label="Requirements" value={formatRequirementSummary(data.requirements)} />
          </div>
        </div>

        <div className="mt-4">
          <StatusBadge status={data.unlocked ? 'approved' : 'pending'}>
            {data.unlocked ? 'Unlocked' : 'New tender'}
          </StatusBadge>
        </div>
      </Card>
    </Link>
  );
}

function Fact({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${attention ? 'text-attention' : 'text-foundation-navy'}`}>{value}</p>
    </div>
  );
}

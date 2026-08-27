type Status = 'pending' | 'approved' | 'attention' | 'neutral';

const statusClasses: Record<Status, string> = {
  pending: 'bg-pending/10 text-pending',
  approved: 'bg-approved/10 text-approved',
  attention: 'bg-attention/10 text-attention',
  neutral: 'bg-concrete-grey/10 text-concrete-grey',
};

const dotClasses: Record<Status, string> = {
  pending: 'bg-pending',
  approved: 'bg-approved',
  attention: 'bg-attention',
  neutral: 'bg-concrete-grey',
};

export function StatusBadge({ status = 'neutral', children }: { status?: Status; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[status]}`} aria-hidden="true" />
      {children}
    </span>
  );
}

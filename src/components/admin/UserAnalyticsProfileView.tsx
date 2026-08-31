import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { UserAnalyticsProfile } from '@/server/domain/userProfileService';

function formatDateTime(value: Date | null) {
  if (!value) return 'Never';
  return value.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return 'Less than a minute';
  return [hours > 0 ? `${hours}h` : null, `${minutes}m`].filter(Boolean).join(' ');
}

function formatActionLabel(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function UserAnalyticsProfileView({ profile }: { profile: UserAnalyticsProfile }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">{profile.role.replace('_', ' ')}</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">{profile.company ?? profile.contactName}</h2>
            <p className="mt-1 text-sm text-concrete-grey">{profile.contactName}</p>
          </div>
          <StatusBadge status={profile.suspended ? 'attention' : 'approved'}>{profile.suspended ? 'Suspended' : 'Active'}</StatusBadge>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Email</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Phone</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.contactPhone ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Company</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.company ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Address</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{profile.address ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Registered</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDateTime(profile.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Session analytics</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Last login</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDateTime(profile.lastLoginAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Last logout</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDateTime(profile.lastLogoutAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Total time online</dt>
            <dd className="mt-1 text-sm text-foundation-navy">{formatDuration(profile.totalTimeOnlineSeconds)}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Recent pages visited</p>
          </div>
          {profile.pageViews.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-concrete-grey">No recorded page visits yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.pageViews.map((view) => (
                <li key={view.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="font-medium text-foundation-navy">{view.path}</span>
                  <span className="text-xs text-concrete-grey">{formatDateTime(view.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-0">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Recent actions</p>
          </div>
          {profile.auditLogs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-concrete-grey">No recorded actions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.auditLogs.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="font-medium text-foundation-navy">{formatActionLabel(entry.action)}</span>
                  <span className="text-xs text-concrete-grey">{formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

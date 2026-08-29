'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ActivityLogFilters } from '@/server/domain/activityLogService';

type AuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string | null;
  createdAt: Date;
  actor?: {
    contactName: string | null;
    email: string | null;
    role: 'SUPER_USER' | 'CLIENT' | 'RETAILER' | null;
  } | null;
};

function formatMetadata(value: string | null) {
  if (!value) return '—';

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }
    return String(parsed);
  } catch {
    return value;
  }
}

function formatActorName(actor: AuditEntry['actor']) {
  if (!actor) return 'System';
  return actor.contactName || actor.email || 'Unknown actor';
}

function formatActionLabel(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ActivityLogTable({ entries, filters }: { entries: AuditEntry[]; filters: ActivityLogFilters }) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [action, setAction] = useState(filters.action ?? '');
  const [targetType, setTargetType] = useState(filters.targetType ?? '');
  const [actorRole, setActorRole] = useState(filters.actorRole ?? '');
  const [from, setFrom] = useState(filters.from ? filters.from.toISOString().slice(0, 10) : '');
  const [to, setTo] = useState(filters.to ? filters.to.toISOString().slice(0, 10) : '');

  const actionOptions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.action))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const targetTypeOptions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.targetType))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSearch =
        term.length === 0 ||
        [
          entry.action,
          entry.targetType,
          entry.targetId,
          formatMetadata(entry.metadata),
          formatActorName(entry.actor),
          entry.actor?.email ?? '',
          entry.actor?.role ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesAction = !action || entry.action === action;
      const matchesTargetType = !targetType || entry.targetType === targetType;
      const matchesActorRole = !actorRole || entry.actor?.role === actorRole;
      const matchesFrom = !from || entry.createdAt >= new Date(`${from}T00:00:00.000Z`);
      const matchesTo = !to || entry.createdAt <= new Date(`${to}T23:59:59.999Z`);

      return matchesSearch && matchesAction && matchesTargetType && matchesActorRole && matchesFrom && matchesTo;
    });
  }, [action, actorRole, entries, from, search, targetType, to]);

  const buildQueryString = (values: Partial<Record<'search' | 'action' | 'targetType' | 'actorRole' | 'from' | 'to', string>>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">Platform audit trail</p>
              <p className="mt-1 text-sm text-concrete-grey">Search actions, actors, targets, and metadata for operational review.</p>
            </div>
            <a
              href={`/super-user/activity-log${buildQueryString({ search, action, targetType, actorRole, from, to })}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-foundation-navy hover:border-steel-blue hover:text-steel-blue"
            >
              Apply filters
            </a>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="text-sm text-concrete-grey xl:col-span-2">
              <span className="mb-1 block font-medium text-foundation-navy">Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="unlock, User, quote..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Action</span>
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              >
                <option value="">Any</option>
                {actionOptions.map((item) => (
                  <option key={item} value={item}>{formatActionLabel(item)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Target</span>
              <select
                value={targetType}
                onChange={(event) => setTargetType(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              >
                <option value="">Any</option>
                {targetTypeOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">Actor role</span>
              <select
                value={actorRole}
                onChange={(event) => setActorRole(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              >
                <option value="">Any</option>
                <option value="SUPER_USER">Super User</option>
                <option value="CLIENT">Client</option>
                <option value="RETAILER">Retailer</option>
              </select>
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">From</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>
            <label className="text-sm text-concrete-grey">
              <span className="mb-1 block font-medium text-foundation-navy">To</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
              />
            </label>
          </form>
        </div>

        <div className="px-6 py-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm text-concrete-grey">
            <span>{filteredEntries.length} matching events</span>
            <a href="/super-user/activity-log" className="font-semibold text-steel-blue hover:text-foundation-navy">
              Clear filters
            </a>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-concrete-grey">
              No platform activity matches the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-concrete-grey">
                  <tr>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-concrete-grey">
                        {entry.createdAt.toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foundation-navy">{formatActorName(entry.actor)}</div>
                        <div className="text-xs text-concrete-grey">{entry.actor?.role ?? 'System'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status="neutral">{formatActionLabel(entry.action)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foundation-navy">{entry.targetType}</div>
                        <div className="text-xs text-concrete-grey">{entry.targetId}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <pre className="max-w-md whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-xs text-concrete-grey">
                          {formatMetadata(entry.metadata)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

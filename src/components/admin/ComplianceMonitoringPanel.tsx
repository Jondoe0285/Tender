'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { ComplianceOverview } from '@/server/domain/complianceMonitoringService';

const severityStatus = { HIGH: 'attention', MEDIUM: 'pending', LOW: 'neutral' } as const;

const categoryLabels = {
  CONFIDENTIALITY: 'Confidentiality',
  TENDER_INTEGRITY: 'Tender integrity',
  PLATFORM_BYPASS: 'Platform bypass',
} as const;

export function ComplianceMonitoringPanel({ overview }: { overview: ComplianceOverview }) {
  const [events, setEvents] = useState(overview.moderationEvents);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(eventId: string) {
    const note = (notes[eventId] ?? '').trim();
    if (note.length < 3) {
      setMessage('Add a short review note before closing an event.');
      return;
    }
    setBusyId(eventId);
    setMessage(null);
    const response = await fetch(`/api/super-user/moderation/${eventId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setBusyId(null);
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ?? 'Unable to record this review.');
      return;
    }
    setEvents((current) => current.map((event) => event.id === eventId ? { ...event, reviewedAt: new Date() } : event));
    setMessage('Review recorded.');
  }

  const awaitingReview = events.filter((event) => event.reviewedAt === null);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-attention">
          <p className="font-heading text-3xl font-bold text-foundation-navy">{overview.counts.high}</p>
          <p className="mt-2 text-sm font-medium text-concrete-grey">High severity flags</p>
        </Card>
        <Card className="border-l-4 border-l-pending">
          <p className="font-heading text-3xl font-bold text-foundation-navy">{overview.counts.medium}</p>
          <p className="mt-2 text-sm font-medium text-concrete-grey">Medium severity flags</p>
        </Card>
        <Card className="border-l-4 border-l-steel-blue">
          <p className="font-heading text-3xl font-bold text-foundation-navy">{awaitingReview.length}</p>
          <p className="mt-2 text-sm font-medium text-concrete-grey">Events awaiting review</p>
        </Card>
        <Card className="border-l-4 border-l-steel-blue">
          <p className="font-heading text-3xl font-bold text-foundation-navy">{overview.windowDays}</p>
          <p className="mt-2 text-sm font-medium text-concrete-grey">Day monitoring window</p>
        </Card>
      </div>

      {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}

      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Flagged activity</h2>
        {overview.flags.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">
            No tender-process or confidentiality risks were detected in the current window.
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {overview.flags.map((flag) => (
              <Card key={flag.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{categoryLabels[flag.category]}</p>
                    <h3 className="mt-1 font-heading text-base font-bold text-foundation-navy">{flag.title}</h3>
                  </div>
                  <StatusBadge status={severityStatus[flag.severity]}>{flag.severity}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-concrete-grey">{flag.detail}</p>
                <p className="mt-3 text-xs text-concrete-grey">
                  {flag.targetType} {flag.targetId} &middot; {new Date(flag.occurredAt).toLocaleString('en-GB')}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Blocked and held content</h2>
        <p className="mb-4 max-w-2xl text-sm text-concrete-grey">
          Content the platform refused to share because it contained contact details, business identifiers, or an
          attempt to move the conversation off Trade Tender. Only the detection reasons are stored, never the content.
        </p>
        {events.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No content has been blocked or held in this window.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{event.contentType.replace(/_/g, ' ')}</p>
                    <h3 className="mt-1 font-heading text-base font-bold text-foundation-navy">{event.actorLabel}</h3>
                    <p className="mt-1 text-sm text-concrete-grey">Risk score {event.riskScore} &middot; {new Date(event.createdAt).toLocaleString('en-GB')}</p>
                  </div>
                  <StatusBadge status={event.reviewedAt ? 'approved' : event.decision === 'BLOCK' ? 'attention' : 'pending'}>
                    {event.reviewedAt ? 'Reviewed' : event.decision}
                  </StatusBadge>
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-concrete-grey">
                  {event.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
                {!event.reviewedAt && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={notes[event.id] ?? ''}
                      onChange={(input) => setNotes((current) => ({ ...current, [event.id]: input.target.value }))}
                      placeholder="Review outcome and action taken"
                      maxLength={500}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-foundation-navy focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
                    />
                    <Button onClick={() => review(event.id)} loading={busyId === event.id} className="shrink-0">
                      Record review
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

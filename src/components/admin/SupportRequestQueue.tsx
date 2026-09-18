'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';

type Request = { id: string; type: string; dataSubjectRight: string | null; status: string; title: string; description: string; dueAt: Date | null; requester: { contactName: string; email: string }; reviewer: { contactName: string } | null; reviewNote: string | null; resolutionEvidence: string | null; triageCategory: string | null; escalationLevel: string | null };

export function SupportRequestQueue({ initialRequests, isOwner }: { initialRequests: Request[]; isOwner: boolean }) {
  const [requests, setRequests] = useState(initialRequests);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [escalations, setEscalations] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function action(id: string, actionName: string) {
    const response = await fetch(`/api/super-user/support-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: actionName, note: notes[id] ?? '', resolutionEvidence: evidence[id] || undefined, triageCategory: categories[id] || undefined, escalationLevel: escalations[id] || undefined }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update request.');
    setRequests((current) => current.map((request) => request.id === id ? { ...request, ...data.request } : request));
    setMessage(actionName === 'request-info' ? 'Information request sent to the requester.' : 'Support request updated.');
  }

  return <div className="mx-auto max-w-5xl space-y-4">
    {message && <p role="alert" className="text-sm font-semibold text-attention">{message}</p>}
    {requests.map((request) => <Card key={request.id}>
      <p className="text-xs font-semibold text-steel-blue">{request.dataSubjectRight ?? request.type} · {request.status}</p>
      <h2 className="mt-1 font-heading text-lg font-bold text-foundation-navy">{request.title}</h2>
      <p className="mt-2 text-sm text-concrete-grey">{request.description}</p>
      <p className="mt-2 text-xs text-concrete-grey">Submitted by {request.requester.contactName}{request.dueAt && ` · Due ${new Date(request.dueAt).toLocaleDateString('en-GB')}`}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Select aria-label={`Triage category for ${request.title}`} value={categories[request.id] ?? request.triageCategory ?? ''} onChange={(event) => setCategories((current) => ({ ...current, [request.id]: event.target.value }))}><option value="">Select category</option><option value="ACCESS">Access</option><option value="ACCOUNT">Account</option><option value="PAYMENT">Payment</option><option value="TECHNICAL">Technical</option><option value="PRIVACY">Privacy</option><option value="COMPLAINT">Complaint</option><option value="CHANGE">Change</option></Select>
        <Select aria-label={`Escalation level for ${request.title}`} value={escalations[request.id] ?? request.escalationLevel ?? ''} onChange={(event) => setEscalations((current) => ({ ...current, [request.id]: event.target.value }))}><option value="">Select escalation</option><option value="NONE">No escalation</option><option value="STANDARD">Standard</option><option value="URGENT">Urgent</option><option value="OWNER">Owner decision</option></Select>
      </div>
      <textarea aria-label={`Review note for ${request.title}`} value={notes[request.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm" placeholder="Triage note or information request (minimum 5 characters)" />
      {isOwner && request.type === 'DATA_PRIVACY' && <textarea aria-label={`Resolution evidence for ${request.title}`} value={evidence[request.id] ?? ''} onChange={(event) => setEvidence((current) => ({ ...current, [request.id]: event.target.value }))} className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm" placeholder="Resolution evidence (required to resolve)" />}
      <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => action(request.id, 'triage')}>Save triage</Button><Button variant="secondary" onClick={() => action(request.id, 'request-info')}>Request information</Button>{(request.type !== 'DATA_PRIVACY' || isOwner) && <Button variant="secondary" onClick={() => action(request.id, 'resolve')}>Resolve</Button>}{isOwner && request.type === 'CHANGE' && <><Button onClick={() => action(request.id, 'approve')}>Approve change</Button><Button variant="danger" onClick={() => action(request.id, 'reject')}>Reject change</Button></>}</div>
    </Card>)}
  </div>;
}

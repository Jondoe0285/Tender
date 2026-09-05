'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';

type TenderMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderRole: string;
  isOwn: boolean;
};

type TenderMessagesProps = {
  tenderId: string;
  quoteId?: string;
  role: 'client' | 'retailer';
};

export function TenderMessages({ tenderId, quoteId, role }: TenderMessagesProps) {
  const [messages, setMessages] = useState<TenderMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadMessages() {
    const query = quoteId ? `?quoteId=${encodeURIComponent(quoteId)}` : '';
    const response = await fetch(`/api/tenders/${tenderId}/messages${query}`);
    if (!response.ok) {
      setMessage('Messages are unavailable for this tender.');
      setLoading(false);
      return;
    }
    const data = await response.json() as { messages: TenderMessage[] };
    setMessages(data.messages);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId, quoteId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setMessage(null);
    const response = await fetch(`/api/tenders/${tenderId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, ...(quoteId ? { quoteId } : {}) }),
    });
    const data = await response.json().catch(() => null) as { error?: string; reasons?: string[] } | null;
    setSending(false);
    if (!response.ok) {
      setMessage(data?.reasons?.join(' ') ?? data?.error ?? 'Unable to send message.');
      return;
    }
    setBody('');
    await loadMessages();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-foundation-navy">Tender questions</h2>
          <p className="mt-1 text-xs text-concrete-grey">Keep questions and replies focused on the specification and quote.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-steel-blue">Internal thread</span>
      </div>
      {loading ? (
        <p className="mt-5 text-sm text-concrete-grey">Loading messages...</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-concrete-grey">
              {role === 'retailer' ? 'Ask a question about the tender specification or quote.' : 'The Provider has not asked a question yet.'}
            </p>
          ) : messages.map((item) => (
            <div key={item.id} className={`rounded-lg border px-4 py-3 ${item.isOwn ? 'border-safety-amber/40 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between gap-3 text-xs text-concrete-grey">
                <span className="font-semibold text-foundation-navy">{item.isOwn ? 'You' : item.senderRole === 'USER' ? 'Contractor' : 'Provider'}</span>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('en-GB')}</time>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-foundation-navy">{item.body}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <label htmlFor={`message-${tenderId}-${quoteId ?? 'retailer'}`} className="text-sm font-semibold text-foundation-navy">Message</label>
        <Textarea
          id={`message-${tenderId}-${quoteId ?? 'retailer'}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Ask about quantities, lead times, delivery, or quote assumptions"
          required
        />
        <p className="text-xs text-concrete-grey">Company, contact, contract, and off-platform details cannot be shared.</p>
        {message && <p className="text-sm font-semibold text-attention">{message}</p>}
        <Button type="submit" loading={sending} className="self-start">Send message</Button>
      </form>
    </Card>
  );
}

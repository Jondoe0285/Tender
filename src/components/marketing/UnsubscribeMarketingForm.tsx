'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function UnsubscribeMarketingForm({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [busy, setBusy] = useState(false);

  async function unsubscribe() {
    setBusy(true);
    try {
      const response = await fetch(`/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'confirm=1',
      });
      setStatus(response.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'done') {
    return <p className="mt-4 text-sm font-semibold text-foundation-navy" role="status">You are unsubscribed from HSEQ ConsultHub marketing emails.</p>;
  }

  return (
    <div className="mt-6">
      {status === 'error' && <p className="mb-3 text-sm font-semibold text-attention" role="alert">Unable to update this preference. Try the link in a later email.</p>}
      <Button type="button" onClick={unsubscribe} loading={busy}>Unsubscribe</Button>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Field';

export function MfaSettings() {
  const { data: session } = useSession();
  const [canDeactivate, setCanDeactivate] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [enrollment, setEnrollment] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.isOwner) setCanDeactivate(true);
  }, [session?.user?.isOwner]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/auth/mfa')
      .then((response) => response.ok ? response.json() : null)
      .then((data: { enabled?: boolean; enrolledCount?: number; canDeactivate?: boolean } | null) => {
        if (!cancelled) {
          setEnabled(Boolean(data?.enabled));
          setEnrolledCount(data?.enrolledCount ?? 0);
          if (typeof data?.canDeactivate === 'boolean') setCanDeactivate(data.canDeactivate);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function request(action: 'begin' | 'verify' | 'disable') {
    setLoading(true);
    setMessage(null);
    const response = await fetch('/api/auth/mfa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(code ? { code } : {}) }) });
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update MFA.');
    if (action === 'begin') setEnrollment({ qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret });
    if (action === 'verify') { setEnabled(true); setEnrollment(null); setRecoveryCodes(data.recoveryCodes ?? []); setCode(''); setEnrolledCount((current) => Math.max(current, 1)); }
    if (action === 'disable') {
      setEnabled(false);
      setCode('');
      setEnrolledCount(0);
      setMessage(`MFA deactivated for ${data.deactivatedCount ?? 0} account${data.deactivatedCount === 1 ? '' : 's'}.`);
      return;
    }
    setMessage(action === 'verify' ? 'MFA enabled. Store your recovery codes securely.' : 'Scan the QR code, then enter the generated code.');
  }

  return (
    <Card>
      <h2 className="font-heading text-lg font-bold text-foundation-navy">Multi-factor authentication</h2>
      <p className="mt-2 text-sm text-concrete-grey">
        When an Owner turns MFA on, every Super User must enrol an authenticator on first sign-in. Marketplace accounts do not use MFA. Only an Owner can deactivate MFA, and that turns it off for every enrolled account.
      </p>
      {message && <p role="status" className="mt-4 text-sm font-semibold text-steel-blue">{message}</p>}
      {!enabled && !enrollment && <Button className="mt-5" onClick={() => void request('begin')} loading={loading}>Set up MFA</Button>}
      {enrollment && (
        <div className="mt-5 space-y-4">
          <Image src={enrollment.qrCodeDataUrl} alt="MFA enrollment QR code" width={192} height={192} unoptimized className="h-48 w-48 border border-slate-200 p-2" />
          <p className="text-sm text-concrete-grey">Manual setup key: <span className="font-mono text-foundation-navy">{enrollment.secret}</span></p>
          <div>
            <Label htmlFor="mfa-enrollment-code">Authenticator code</Label>
            <Input id="mfa-enrollment-code" className="mt-2 max-w-xs" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" />
          </div>
          <Button onClick={() => void request('verify')} loading={loading} disabled={!code}>Verify and enable</Button>
        </div>
      )}
      {enabled && canDeactivate && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-concrete-grey">
            MFA is on for {enrolledCount} account{enrolledCount === 1 ? '' : 's'}. Deactivating it here deactivates it for all of them, including Super Users.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="mfa-disable-code">Current authenticator or recovery code</Label>
              <Input id="mfa-disable-code" className="mt-2 max-w-xs" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <Button variant="danger" onClick={() => void request('disable')} loading={loading} disabled={!code}>Deactivate MFA for all users</Button>
          </div>
        </div>
      )}
      {enabled && !canDeactivate && (
        <p className="mt-5 text-sm text-concrete-grey">MFA is active on this account. Only an Owner can deactivate it for the platform.</p>
      )}
      {recoveryCodes.length > 0 && (
        <div className="mt-5 rounded-lg border border-safety-amber/40 bg-safety-amber/10 p-4">
          <p className="font-semibold text-foundation-navy">Save these recovery codes now</p>
          <p className="mt-1 text-sm text-concrete-grey">Each code can be used once if you lose access to your authenticator.</p>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-foundation-navy">{recoveryCodes.join('\n')}</pre>
        </div>
      )}
    </Card>
  );
}

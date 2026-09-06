'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Field';

export function MfaSettings() {
  const [enabled, setEnabled] = useState(false);
  const [enrollment, setEnrollment] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function request(action: 'begin' | 'verify' | 'disable') {
    setLoading(true);
    setMessage(null);
    const response = await fetch('/api/auth/mfa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(code ? { code } : {}) }) });
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) return setMessage(data?.error ?? 'Unable to update MFA.');
    if (action === 'begin') setEnrollment({ qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret });
    if (action === 'verify') { setEnabled(true); setEnrollment(null); setRecoveryCodes(data.recoveryCodes ?? []); setCode(''); }
    if (action === 'disable') { setEnabled(false); setCode(''); }
    setMessage(action === 'disable' ? 'MFA disabled.' : action === 'verify' ? 'MFA enabled. Store your recovery codes securely.' : 'Scan the QR code, then enter the generated code.');
  }

  return <Card><h2 className="font-heading text-lg font-bold text-foundation-navy">Multi-factor authentication</h2><p className="mt-2 text-sm text-concrete-grey">Protect privileged Super User access with an authenticator app. MFA is required at the next login after activation.</p>{message && <p role="status" className="mt-4 text-sm font-semibold text-steel-blue">{message}</p>}{!enabled && !enrollment && <Button className="mt-5" onClick={() => void request('begin')} loading={loading}>Set up MFA</Button>}{enrollment && <div className="mt-5 space-y-4"><img src={enrollment.qrCodeDataUrl} alt="MFA enrollment QR code" className="h-48 w-48 border border-slate-200 p-2" /><p className="text-sm text-concrete-grey">Manual setup key: <span className="font-mono text-foundation-navy">{enrollment.secret}</span></p><div><Label htmlFor="mfa-enrollment-code">Authenticator code</Label><Input id="mfa-enrollment-code" className="mt-2 max-w-xs" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" /></div><Button onClick={() => void request('verify')} loading={loading} disabled={!code}>Verify and enable</Button></div>}{enabled && <div className="mt-5"><div className="flex flex-wrap items-end gap-3"><div><Label htmlFor="mfa-disable-code">Current authenticator or recovery code</Label><Input id="mfa-disable-code" className="mt-2 max-w-xs" value={code} onChange={(event) => setCode(event.target.value)} /></div><Button variant="danger" onClick={() => void request('disable')} loading={loading} disabled={!code}>Disable MFA</Button></div></div>}{recoveryCodes.length > 0 && <div className="mt-5 rounded-lg border border-safety-amber/40 bg-safety-amber/10 p-4"><p className="font-semibold text-foundation-navy">Save these recovery codes now</p><p className="mt-1 text-sm text-concrete-grey">Each code can be used once if you lose access to your authenticator.</p><pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-foundation-navy">{recoveryCodes.join('\n')}</pre></div>}</Card>;
}
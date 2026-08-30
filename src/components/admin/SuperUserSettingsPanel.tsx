'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Field';

export type AdminSettings = {
  fees: { retailerUnlockGbp: number; clientReleaseGbp: number; clientReleaseMode: string; clientReleasePercentageLow: number; clientReleasePercentageHigh: number; vatPercentage: number; sponsoredPlacementActive: boolean; sponsoredPlacementFeeGbp: number; membershipTiersActive: boolean; adspaceActive: boolean };
  tiers: Array<{ id: string; name: string; description: string; monthlyPriceGbp: number; freeTenderOpportunitiesPerMonth: number; active: boolean }>;
  subscriptions: Array<{ id: string; name: string; description: string; annualPriceGbp: number; active: boolean }>;
  retailers: Array<{ id: string; email: string; retailerProfile: { companyName: string } | null; memberships: Array<{ tier: { name: string } }>; subscriptions: Array<{ plan: { name: string } }> }>;
};

type MembershipTier = AdminSettings['tiers'][number];
type SubscriptionPlan = AdminSettings['subscriptions'][number];

type PlanType = 'tier' | 'subscription';

export function SuperUserSettingsPanel({ initialSettings, isOwner }: { initialSettings: AdminSettings; isOwner: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [fees, setFees] = useState(settings.fees);
  const [form, setForm] = useState({ name: '', description: '', monthlyPriceGbp: '', freeTenderOpportunitiesPerMonth: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = !isOwner;

  async function request(path: string, options: RequestInit) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? 'Unable to save setting');
    return data;
  }

  async function saveFee(key: 'RETAILER_UNLOCK_FEE_GBP' | 'CLIENT_RELEASE_FEE_GBP' | 'CLIENT_RELEASE_FEE_MODE' | 'CLIENT_RELEASE_PERCENTAGE_LOW' | 'CLIENT_RELEASE_PERCENTAGE_HIGH' | 'VAT_PERCENTAGE' | 'SPONSORED_PLACEMENT_ACTIVE' | 'SPONSORED_PLACEMENT_FEE_GBP' | 'MEMBERSHIP_TIERS_ACTIVE' | 'ADSPACE_ACTIVE', value: number | string | boolean) {
    setSaving(true);
    setMessage(null);
    try {
      await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fee', key, value }) });
      setMessage('Fee updated. New payments will use this amount.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save fee'); }
    setSaving(false);
  }

  async function createPlan(action: PlanType) {
    setSaving(true);
    setMessage(null);
    try {
      const payload = action === 'tier'
        ? { action, name: form.name, description: form.description, monthlyPriceGbp: Number(form.monthlyPriceGbp), freeTenderOpportunitiesPerMonth: Number(form.freeTenderOpportunitiesPerMonth), active: false }
        : { action, name: form.name, description: form.description, annualPriceGbp: Number(form.monthlyPriceGbp), active: false };
      const data = await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setSettings((current) => ({ ...current, ...(action === 'tier' ? { tiers: [...current.tiers, data.tier] } : { subscriptions: [...current.subscriptions, data.subscription] }) }));
      setForm({ name: '', description: '', monthlyPriceGbp: '', freeTenderOpportunitiesPerMonth: '' });
      setMessage(`${action === 'tier' ? 'Membership tier' : 'Annual subscription'} created inactive.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save plan'); }
    setSaving(false);
  }

  async function togglePlan(action: PlanType, id: string, active: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      let payload: Record<string, unknown>;
      if (action === 'tier') {
        const selected = settings.tiers.find((item) => item.id === id);
        if (!selected) throw new Error('Plan not found');
        payload = { action, id, name: selected.name, description: selected.description, monthlyPriceGbp: selected.monthlyPriceGbp, freeTenderOpportunitiesPerMonth: selected.freeTenderOpportunitiesPerMonth, active };
      } else {
        const selected = settings.subscriptions.find((item) => item.id === id);
        if (!selected) throw new Error('Plan not found');
        payload = { action, id, name: selected.name, description: selected.description, annualPriceGbp: selected.annualPriceGbp, active };
      }
      await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const key = action === 'tier' ? 'tiers' : 'subscriptions';
      setSettings((current) => ({ ...current, [key]: current[key].map((item) => item.id === id ? { ...item, active } : item) }));
      setMessage(`${action === 'tier' ? 'Membership tier' : 'Annual subscription'} ${active ? 'activated' : 'deactivated'}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update plan'); }
    setSaving(false);
  }

  async function toggleEntitlement(retailerId: string, type: 'membership' | 'subscription', planId: string, active: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      await request(`/api/super-user/retailers/${retailerId}/entitlements`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, planId, active }) });
      const refreshed = await request('/api/super-user/settings', { method: 'GET' }) as AdminSettings;
      setSettings(refreshed);
      setFees(refreshed.fees);
      setMessage(`Retailer ${active ? 'assignment activated' : 'assignment deactivated'}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update retailer assignment'); }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      {locked && <p role="status" className="rounded-lg border border-safety-amber/40 bg-safety-amber/10 px-4 py-3 text-sm font-semibold text-foundation-navy">Fees, adspace, membership tiers, and subscriptions are Owner-controlled. Ask an Owner to make changes here.</p>}
      {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}
      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Fees</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card><FieldEditor label="Retailer tender unlock fee (excl. VAT)" value={fees.retailerUnlockGbp} onChange={(value) => setFees({ ...fees, retailerUnlockGbp: value })} onSave={() => saveFee('RETAILER_UNLOCK_FEE_GBP', fees.retailerUnlockGbp)} saving={saving} disabled={locked} /></Card>
          <Card><FieldEditor label="Client fixed release fee (excl. VAT)" value={fees.clientReleaseGbp} onChange={(value) => setFees({ ...fees, clientReleaseGbp: value })} onSave={() => saveFee('CLIENT_RELEASE_FEE_GBP', fees.clientReleaseGbp)} saving={saving} disabled={locked} /><div className="mt-4"><Label>Client release fee mode</Label><Select className="mt-2" value={fees.clientReleaseMode} disabled={locked} onChange={(event) => { const value = event.target.value; setFees({ ...fees, clientReleaseMode: value }); void saveFee('CLIENT_RELEASE_FEE_MODE', value); }}><option value="FIXED">Fixed fee</option><option value="PERCENTAGE">Percentage of accepted quote</option></Select></div>{fees.clientReleaseMode === 'PERCENTAGE' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><FieldEditor label="Quote up to £10,000 (%)" value={fees.clientReleasePercentageLow} onChange={(value) => setFees({ ...fees, clientReleasePercentageLow: value })} onSave={() => saveFee('CLIENT_RELEASE_PERCENTAGE_LOW', fees.clientReleasePercentageLow)} saving={saving} step="0.01" disabled={locked} /><FieldEditor label="Quote over £10,000 (%)" value={fees.clientReleasePercentageHigh} onChange={(value) => setFees({ ...fees, clientReleasePercentageHigh: value })} onSave={() => saveFee('CLIENT_RELEASE_PERCENTAGE_HIGH', fees.clientReleasePercentageHigh)} saving={saving} step="0.01" disabled={locked} /></div>}</Card>
          <Card><FieldEditor label="VAT percentage" value={fees.vatPercentage} onChange={(value) => setFees({ ...fees, vatPercentage: value })} onSave={() => saveFee('VAT_PERCENTAGE', fees.vatPercentage)} saving={saving} step="0.01" disabled={locked} /><p className="mt-3 text-sm text-concrete-grey">Applied to new Trade Tender payments. Existing payment VAT remains unchanged.</p></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Sponsored placement</Label><p className="mt-1 text-sm text-concrete-grey">Displayed separately from quote ranking.</p></div><Button variant={fees.sponsoredPlacementActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.sponsoredPlacementActive; setFees({ ...fees, sponsoredPlacementActive: active }); void saveFee('SPONSORED_PLACEMENT_ACTIVE', active); }} loading={saving}>{fees.sponsoredPlacementActive ? 'Deactivate' : 'Activate'}</Button></div><div className="mt-4"><FieldEditor label="Sponsored placement fee (excl. VAT)" value={fees.sponsoredPlacementFeeGbp} onChange={(value) => setFees({ ...fees, sponsoredPlacementFeeGbp: value })} onSave={() => saveFee('SPONSORED_PLACEMENT_FEE_GBP', fees.sponsoredPlacementFeeGbp)} saving={saving} disabled={locked} /></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Advertising space</Label><p className="mt-1 text-sm text-concrete-grey">Display advertising inventory on the platform with proper governance and cookie warnings.</p></div><Button variant={fees.adspaceActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.adspaceActive; setFees({ ...fees, adspaceActive: active }); void saveFee('ADSPACE_ACTIVE', active); }} loading={saving}>{fees.adspaceActive ? 'Deactivate' : 'Activate'}</Button></div></Card>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-bold text-foundation-navy">Membership tiers</h2><Button variant={fees.membershipTiersActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.membershipTiersActive; setFees({ ...fees, membershipTiersActive: active }); void saveFee('MEMBERSHIP_TIERS_ACTIVE', active); }} loading={saving}>{fees.membershipTiersActive ? 'Deactivate membership feature' : 'Activate membership feature'}</Button></div>
        <PlanList plans={settings.tiers} kind="tier" saving={saving} disabled={locked} onToggle={togglePlan} />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Annual subscriptions</h2>
        <PlanList plans={settings.subscriptions} kind="subscription" saving={saving} disabled={locked} onToggle={togglePlan} />
      </section>

      <Card>
        <h2 className="font-heading text-lg font-bold text-foundation-navy">Add membership or subscription</h2>
        <p className="mt-1 text-sm text-concrete-grey">New options are inactive until an Owner activates them.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><FieldGroup label="Name"><Input value={form.name} disabled={locked} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FieldGroup><FieldGroup label="Monthly price (GBP, excl. VAT)"><Input type="number" min="0" value={form.monthlyPriceGbp} disabled={locked} onChange={(event) => setForm({ ...form, monthlyPriceGbp: event.target.value })} /></FieldGroup><FieldGroup label="Free tender opportunities per month"><Input type="number" min="0" value={form.freeTenderOpportunitiesPerMonth} disabled={locked} onChange={(event) => setForm({ ...form, freeTenderOpportunitiesPerMonth: event.target.value })} /></FieldGroup><FieldGroup label="Description" wide><Textarea rows={3} value={form.description} disabled={locked} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FieldGroup></div>
        <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => createPlan('tier')} loading={saving} disabled={locked}>Add membership tier</Button><Button variant="secondary" onClick={() => createPlan('subscription')} loading={saving} disabled={locked}>Add annual subscription</Button></div>
      </Card>

      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Apply options to Retailers</h2>
        <div className="space-y-4">{settings.retailers.map((retailer) => <Card key={retailer.id}><p className="font-semibold text-foundation-navy">{retailer.retailerProfile?.companyName ?? retailer.email}</p><p className="text-sm text-concrete-grey">{retailer.email}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{settings.tiers.map((tier) => <EntitlementButton key={tier.id} label={tier.name} active={retailer.memberships.some((item) => item.tier.name === tier.name)} disabled={!tier.active || saving} onToggle={(active) => toggleEntitlement(retailer.id, 'membership', tier.id, active)} />)}{settings.subscriptions.map((plan) => <EntitlementButton key={plan.id} label={plan.name} active={retailer.subscriptions.some((item) => item.plan.name === plan.name)} disabled={!plan.active || saving} onToggle={(active) => toggleEntitlement(retailer.id, 'subscription', plan.id, active)} />)}</div></Card>)}</div>
      </section>
    </div>
  );
}

function FieldGroup({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <div className={wide ? 'sm:col-span-2' : ''}><Label>{label}</Label><div className="mt-2">{children}</div></div>; }
function FieldEditor({ label, value, onChange, onSave, saving, step = '1', disabled = false }: { label: string; value: number; onChange: (value: number) => void; onSave: () => void; saving: boolean; step?: string; disabled?: boolean }) { return <div><Label>{label}</Label><div className="mt-2 flex gap-3"><Input type="number" min="0" step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /><Button onClick={onSave} loading={saving} disabled={disabled}>Save</Button></div></div>; }
function PlanList({ plans, kind, saving, disabled = false, onToggle }: { plans: MembershipTier[] | SubscriptionPlan[]; kind: PlanType; saving: boolean; disabled?: boolean; onToggle: (kind: PlanType, id: string, active: boolean) => void }) { return <div className="space-y-3">{plans.length === 0 ? <p className="text-sm text-concrete-grey">No options created yet.</p> : plans.map((plan) => <Card key={plan.id} className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-foundation-navy">{plan.name} · £{'monthlyPriceGbp' in plan ? `${plan.monthlyPriceGbp}/month` : `${plan.annualPriceGbp}/year`} excl. VAT</p><p className="text-sm text-concrete-grey">{plan.description || 'No description'}{'freeTenderOpportunitiesPerMonth' in plan && ` · ${plan.freeTenderOpportunitiesPerMonth} free opportunities/month`}</p></div><Button variant={plan.active ? 'danger' : 'secondary'} disabled={disabled} onClick={() => onToggle(kind, plan.id, !plan.active)} loading={saving}>{plan.active ? 'Deactivate' : 'Activate'}</Button></Card>)}</div>; }
function EntitlementButton({ label, active, disabled, onToggle }: { label: string; active: boolean; disabled: boolean; onToggle: (active: boolean) => void }) { return <Button variant={active ? 'danger' : 'secondary'} disabled={disabled} onClick={() => onToggle(!active)}>{active ? `Deactivate ${label}` : `Assign ${label}`}</Button>; }

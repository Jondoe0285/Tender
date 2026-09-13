'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Field';
import { SERVICE_NAMES } from '@/lib/categories';
import { VERIFICATION_DOCUMENT_TYPES } from '@/lib/verification-documents';

export type AdminSettings = {
  fees: { retailerUnlockGbp: number; retailerUnlockMode: string; retailerUnlockPercentageLow: number; retailerUnlockPercentageHigh: number; retailerUnlockPercentageTop: number; contractorServiceUnlockGbp: number; professionalServiceUnlockGbp: number; clientReleaseGbp: number; clientReleaseMode: string; clientReleasePercentageLow: number; clientReleasePercentageHigh: number; clientReleasePercentageTop: number; quoteEstimateOffsetPercentage: number; quoteEstimateMasterReductionPercentage: number; vatPercentage: number; sponsoredPlacementActive: boolean; sponsoredPlacementFeeGbp: number; membershipTiersActive: boolean; retailerLaunchCreditsDefault: number; adspaceActive: boolean; independentReviewActive: boolean; independentReviewFeeGbp: number; independentReviewRenewalActive: boolean; independentReviewRenewalFeeGbp: number; independentReviewReassessmentActive: boolean; independentReviewReassessmentFeeGbp: number; independentReviewPartnerUrl: string; independentReviewSharedSecret: string; directContactActive: boolean; directContactFeeGbp: number; humanReviewActive: boolean; verificationDocumentRequirements: Array<[string, boolean]> };
  supportRecipientEmail?: string | null;
  tiers: Array<{ id: string; name: string; description: string; monthlyPriceGbp: number; freeTenderOpportunitiesPerMonth: number; additionalCreditDiscountPercentage: number; active: boolean }>;
  subscriptions: Array<{ id: string; name: string; description: string; annualPriceGbp: number; active: boolean }>;
};

type MembershipTier = AdminSettings['tiers'][number];
type SubscriptionPlan = AdminSettings['subscriptions'][number];

type PlanType = 'tier' | 'subscription';

export function SuperUserSettingsPanel({ initialSettings, isOwner }: { initialSettings: AdminSettings; isOwner: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [fees, setFees] = useState(settings.fees);
  const [verificationRequirements, setVerificationRequirements] = useState<Record<string, boolean>>(Object.fromEntries(settings.fees.verificationDocumentRequirements));
  const [supportRecipientEmail, setSupportRecipientEmail] = useState(settings.supportRecipientEmail ?? '');
  const [form, setForm] = useState({ name: '', description: '', monthlyPriceGbp: '', freeTenderOpportunitiesPerMonth: '', additionalCreditDiscountPercentage: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = !isOwner;

  async function request(path: string, options: RequestInit) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? 'Unable to save setting');
    return data;
  }

  async function saveFee(key: 'RETAILER_UNLOCK_FEE_GBP' | 'RETAILER_UNLOCK_FEE_MODE' | 'RETAILER_UNLOCK_PERCENTAGE_LOW' | 'RETAILER_UNLOCK_PERCENTAGE_HIGH' | 'RETAILER_UNLOCK_PERCENTAGE_TOP' | 'CONTRACTOR_SERVICE_UNLOCK_FEE_GBP' | 'PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP' | 'CLIENT_RELEASE_FEE_GBP' | 'CLIENT_RELEASE_FEE_MODE' | 'CLIENT_RELEASE_PERCENTAGE_LOW' | 'CLIENT_RELEASE_PERCENTAGE_HIGH' | 'CLIENT_RELEASE_PERCENTAGE_TOP' | 'QUOTE_ESTIMATE_OFFSET_PERCENTAGE' | 'QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE' | 'VAT_PERCENTAGE' | 'SPONSORED_PLACEMENT_ACTIVE' | 'SPONSORED_PLACEMENT_FEE_GBP' | 'MEMBERSHIP_TIERS_ACTIVE' | 'RETAILER_LAUNCH_CREDITS_DEFAULT' | 'ADSPACE_ACTIVE' | 'INDEPENDENT_REVIEW_ACTIVE' | 'INDEPENDENT_REVIEW_FEE_GBP' | 'INDEPENDENT_REVIEW_RENEWAL_ACTIVE' | 'INDEPENDENT_REVIEW_RENEWAL_FEE_GBP' | 'INDEPENDENT_REVIEW_REASSESSMENT_ACTIVE' | 'INDEPENDENT_REVIEW_REASSESSMENT_FEE_GBP' | 'INDEPENDENT_REVIEW_PARTNER_URL' | 'INDEPENDENT_REVIEW_SHARED_SECRET' | 'DIRECT_CONTACT_ACTIVE' | 'DIRECT_CONTACT_FEE_GBP' | 'HUMAN_REVIEW_ACTIVE', value: number | string | boolean) {
    setSaving(true);
    setMessage(null);
    try {
      await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fee', key, value }) });
      setMessage('Fee updated. New payments will use this amount.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save fee'); }
    setSaving(false);
  }

  async function saveSupportRecipient() {
    setSaving(true);
    setMessage(null);
    try {
      await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'support-recipient', supportRecipientEmail: supportRecipientEmail.trim() || null }) });
      setMessage(supportRecipientEmail.trim() ? 'Support recipient updated.' : 'Support recipient cleared. New requests will not send email notifications.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save support recipient'); }
    setSaving(false);
  }

  async function saveVerificationRequirements(next: Record<string, boolean>) {
    setSaving(true);
    setMessage(null);
    try {
      await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verification-document', requirements: next }) });
      setVerificationRequirements(next);
      setMessage('Verification document requirements updated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save verification requirements'); }
    setSaving(false);
  }

  async function createPlan(action: PlanType) {
    setSaving(true);
    setMessage(null);
    try {
      const payload = action === 'tier'
        ? { action, name: form.name, description: form.description, monthlyPriceGbp: Number(form.monthlyPriceGbp), freeTenderOpportunitiesPerMonth: Number(form.freeTenderOpportunitiesPerMonth), additionalCreditDiscountPercentage: Number(form.additionalCreditDiscountPercentage), active: false }
        : { action, name: form.name, description: form.description, annualPriceGbp: Number(form.monthlyPriceGbp), active: false };
      const data = await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setSettings((current) => ({ ...current, ...(action === 'tier' ? { tiers: [...current.tiers, data.tier] } : { subscriptions: [...current.subscriptions, data.subscription] }) }));
      setForm({ name: '', description: '', monthlyPriceGbp: '', freeTenderOpportunitiesPerMonth: '', additionalCreditDiscountPercentage: '' });
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
        payload = { action, id, name: selected.name, description: selected.description, monthlyPriceGbp: selected.monthlyPriceGbp, freeTenderOpportunitiesPerMonth: selected.freeTenderOpportunitiesPerMonth, additionalCreditDiscountPercentage: selected.additionalCreditDiscountPercentage, active };
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

  async function saveTier(tier: MembershipTier) {
    setSaving(true);
    setMessage(null);
    try {
      const data = await request('/api/super-user/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tier', ...tier }) });
      setSettings((current) => ({ ...current, tiers: current.tiers.map((item) => item.id === tier.id ? data.tier : item) }));
      setMessage('Membership tier updated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update membership tier'); }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      {locked && <p role="status" className="rounded-lg border border-safety-amber/40 bg-safety-amber/10 px-4 py-3 text-sm font-semibold text-foundation-navy">Fees, affiliated partner links, membership tiers, and subscriptions are Owner-controlled. Ask an Owner to make changes here.</p>}
      {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}
      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Fees</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card><FieldEditor label="Provider fixed tender unlock fee (excl. VAT)" value={fees.retailerUnlockGbp} onChange={(value) => setFees({ ...fees, retailerUnlockGbp: value })} onSave={() => saveFee('RETAILER_UNLOCK_FEE_GBP', fees.retailerUnlockGbp)} saving={saving} disabled={locked} /><div className="mt-4"><Label>Tender unlock pricing mode</Label><Select className="mt-2" value={fees.retailerUnlockMode} disabled={locked} onChange={(event) => { const value = event.target.value; setFees({ ...fees, retailerUnlockMode: value }); void saveFee('RETAILER_UNLOCK_FEE_MODE', value); }}><option value="FIXED">Fixed fee</option><option value="PERCENTAGE">Dynamic staged percentage of internal estimate</option></Select></div>{fees.retailerUnlockMode === 'PERCENTAGE' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><FieldEditor label="First £10,000 (%)" value={fees.retailerUnlockPercentageLow} onChange={(value) => setFees({ ...fees, retailerUnlockPercentageLow: value })} onSave={() => saveFee('RETAILER_UNLOCK_PERCENTAGE_LOW', fees.retailerUnlockPercentageLow)} saving={saving} step="0.01" disabled={locked} /><FieldEditor label="£10,000.01 to £100,000 (%)" value={fees.retailerUnlockPercentageHigh} onChange={(value) => setFees({ ...fees, retailerUnlockPercentageHigh: value })} onSave={() => saveFee('RETAILER_UNLOCK_PERCENTAGE_HIGH', fees.retailerUnlockPercentageHigh)} saving={saving} step="0.01" disabled={locked} /><FieldEditor label="Over £100,000 (%)" value={fees.retailerUnlockPercentageTop} onChange={(value) => setFees({ ...fees, retailerUnlockPercentageTop: value })} onSave={() => saveFee('RETAILER_UNLOCK_PERCENTAGE_TOP', fees.retailerUnlockPercentageTop)} saving={saving} step="0.01" disabled={locked} /></div>}<p className="mt-3 text-sm text-concrete-grey">Dynamic tender unlock pricing uses the internal estimate and the same staged bands as accepted quote release pricing.</p></Card>
          <Card><FieldEditor label="Contractor Services fixed tender release fee (excl. VAT)" value={fees.contractorServiceUnlockGbp} onChange={(value) => setFees({ ...fees, contractorServiceUnlockGbp: value })} onSave={() => saveFee('CONTRACTOR_SERVICE_UNLOCK_FEE_GBP', fees.contractorServiceUnlockGbp)} saving={saving} disabled={locked} /><p className="mt-3 text-sm text-concrete-grey">Always used for Contractor Services tender releases, independent of estimated tender value and dynamic pricing mode.</p></Card>
          <Card><FieldEditor label="Professional Services fixed tender release fee (excl. VAT)" value={fees.professionalServiceUnlockGbp} onChange={(value) => setFees({ ...fees, professionalServiceUnlockGbp: value })} onSave={() => saveFee('PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP', fees.professionalServiceUnlockGbp)} saving={saving} disabled={locked} /><p className="mt-3 text-sm text-concrete-grey">Always used for Professional Services tender releases, independent of estimated tender value and dynamic pricing mode.</p></Card>
          <Card><FieldEditor label="Contractor fixed release fee (excl. VAT)" value={fees.clientReleaseGbp} onChange={(value) => setFees({ ...fees, clientReleaseGbp: value })} onSave={() => saveFee('CLIENT_RELEASE_FEE_GBP', fees.clientReleaseGbp)} saving={saving} disabled={locked} /><div className="mt-4"><Label>Contractor release fee mode</Label><Select className="mt-2" value={fees.clientReleaseMode} disabled={locked} onChange={(event) => { const value = event.target.value; setFees({ ...fees, clientReleaseMode: value }); void saveFee('CLIENT_RELEASE_FEE_MODE', value); }}><option value="FIXED">Fixed fee</option><option value="PERCENTAGE">Percentage of accepted quote</option></Select></div>{fees.clientReleaseMode === 'PERCENTAGE' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><FieldEditor label="First £10,000 (%)" value={fees.clientReleasePercentageLow} onChange={(value) => setFees({ ...fees, clientReleasePercentageLow: value })} onSave={() => saveFee('CLIENT_RELEASE_PERCENTAGE_LOW', fees.clientReleasePercentageLow)} saving={saving} step="0.01" disabled={locked} /><FieldEditor label="£10,000.01 to £100,000 (%)" value={fees.clientReleasePercentageHigh} onChange={(value) => setFees({ ...fees, clientReleasePercentageHigh: value })} onSave={() => saveFee('CLIENT_RELEASE_PERCENTAGE_HIGH', fees.clientReleasePercentageHigh)} saving={saving} step="0.01" disabled={locked} /><FieldEditor label="Over £100,000 (%)" value={fees.clientReleasePercentageTop} onChange={(value) => setFees({ ...fees, clientReleasePercentageTop: value })} onSave={() => saveFee('CLIENT_RELEASE_PERCENTAGE_TOP', fees.clientReleasePercentageTop)} saving={saving} step="0.01" disabled={locked} /></div>}</Card>
          <Card><FieldEditor label="Master estimate reduction (%)" value={fees.quoteEstimateMasterReductionPercentage} onChange={(value) => setFees({ ...fees, quoteEstimateMasterReductionPercentage: value })} onSave={() => saveFee('QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE', fees.quoteEstimateMasterReductionPercentage)} saving={saving} step="0.01" disabled={locked} /><p className="mt-3 text-sm text-concrete-grey">Applied only to the tender release fee basis after item-level estimate offsets. A 5% reduction means a £100,000 estimated tender is charged as if the fee basis were £95,000.</p></Card>
          <Card><FieldEditor label="VAT percentage" value={fees.vatPercentage} onChange={(value) => setFees({ ...fees, vatPercentage: value })} onSave={() => saveFee('VAT_PERCENTAGE', fees.vatPercentage)} saving={saving} step="0.01" disabled={locked} /><p className="mt-3 text-sm text-concrete-grey">Applied to new Trade Tender payments. Existing payment VAT remains unchanged.</p></Card>
          <Card><FieldEditor label="Default launch credits for new Providers" value={fees.retailerLaunchCreditsDefault} onChange={(value) => setFees({ ...fees, retailerLaunchCreditsDefault: value })} onSave={() => saveFee('RETAILER_LAUNCH_CREDITS_DEFAULT', fees.retailerLaunchCreditsDefault)} saving={saving} disabled={locked} /><p className="mt-3 text-sm text-concrete-grey">Applied when a new Provider profile is created. Existing balances are unchanged.</p></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Sponsored placement</Label><p className="mt-1 text-sm text-concrete-grey">Displayed separately from quote ranking.</p></div><Button variant={fees.sponsoredPlacementActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.sponsoredPlacementActive; setFees({ ...fees, sponsoredPlacementActive: active }); void saveFee('SPONSORED_PLACEMENT_ACTIVE', active); }} loading={saving}>{fees.sponsoredPlacementActive ? 'Deactivate' : 'Activate'}</Button></div><div className="mt-4"><FieldEditor label="Sponsored placement fee (excl. VAT)" value={fees.sponsoredPlacementFeeGbp} onChange={(value) => setFees({ ...fees, sponsoredPlacementFeeGbp: value })} onSave={() => saveFee('SPONSORED_PLACEMENT_FEE_GBP', fees.sponsoredPlacementFeeGbp)} saving={saving} disabled={locked} /></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Affiliated partner links</Label><p className="mt-1 text-sm text-concrete-grey">Display approved affiliated partner information on the platform with proper governance and separation from tender decisions.</p></div><Button variant={fees.adspaceActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.adspaceActive; setFees({ ...fees, adspaceActive: active }); void saveFee('ADSPACE_ACTIVE', active); }} loading={saving}>{fees.adspaceActive ? 'Deactivate' : 'Activate'}</Button></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Enhanced H&amp;S review</Label><p className="mt-1 text-sm text-concrete-grey">Lets a Provider purchase a professional review by a Health &amp; Safety professional.</p></div><Button variant={fees.independentReviewActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.independentReviewActive; setFees({ ...fees, independentReviewActive: active }); void saveFee('INDEPENDENT_REVIEW_ACTIVE', active); }} loading={saving}>{fees.independentReviewActive ? 'Deactivate' : 'Activate'}</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><FieldEditor label="Enhanced review price (excl. VAT)" value={fees.independentReviewFeeGbp} onChange={(value) => setFees({ ...fees, independentReviewFeeGbp: value })} onSave={() => saveFee('INDEPENDENT_REVIEW_FEE_GBP', fees.independentReviewFeeGbp)} saving={saving} disabled={locked} /><StringFieldEditor label="Third-party portal URL" value={fees.independentReviewPartnerUrl} onChange={(value) => setFees({ ...fees, independentReviewPartnerUrl: value })} onSave={() => saveFee('INDEPENDENT_REVIEW_PARTNER_URL', fees.independentReviewPartnerUrl)} saving={saving} disabled={locked} /><StringFieldEditor label="Verification shared secret" value={fees.independentReviewSharedSecret} onChange={(value) => setFees({ ...fees, independentReviewSharedSecret: value })} onSave={() => saveFee('INDEPENDENT_REVIEW_SHARED_SECRET', fees.independentReviewSharedSecret)} saving={saving} disabled={locked} /></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Enhanced review renewal</Label><p className="mt-1 text-sm text-concrete-grey">Allows approved Providers to renew from month 11 at the lower renewal price before their enhanced verification expires.</p></div><Button variant={fees.independentReviewRenewalActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.independentReviewRenewalActive; setFees({ ...fees, independentReviewRenewalActive: active }); void saveFee('INDEPENDENT_REVIEW_RENEWAL_ACTIVE', active); }} loading={saving}>{fees.independentReviewRenewalActive ? 'Deactivate' : 'Activate'}</Button></div><div className="mt-4"><FieldEditor label="Enhanced review renewal price (excl. VAT)" value={fees.independentReviewRenewalFeeGbp} onChange={(value) => setFees({ ...fees, independentReviewRenewalFeeGbp: value })} onSave={() => saveFee('INDEPENDENT_REVIEW_RENEWAL_FEE_GBP', fees.independentReviewRenewalFeeGbp)} saving={saving} disabled={locked} /></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Enhanced review updated assessment</Label><p className="mt-1 text-sm text-concrete-grey">Allows Providers whose service scope changed to purchase a minor re-verification / updated assessment at a lower price.</p></div><Button variant={fees.independentReviewReassessmentActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.independentReviewReassessmentActive; setFees({ ...fees, independentReviewReassessmentActive: active }); void saveFee('INDEPENDENT_REVIEW_REASSESSMENT_ACTIVE', active); }} loading={saving}>{fees.independentReviewReassessmentActive ? 'Deactivate' : 'Activate'}</Button></div><div className="mt-4"><FieldEditor label="Updated assessment price (excl. VAT)" value={fees.independentReviewReassessmentFeeGbp} onChange={(value) => setFees({ ...fees, independentReviewReassessmentFeeGbp: value })} onSave={() => saveFee('INDEPENDENT_REVIEW_REASSESSMENT_FEE_GBP', fees.independentReviewReassessmentFeeGbp)} saving={saving} disabled={locked} /></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Direct contact requests</Label><p className="mt-1 text-sm text-concrete-grey">Allows Contractor Services and Professional Services Providers to pay a defined fee to share their contact details with the purchasing Client before the standard quote route.</p></div><Button variant={fees.directContactActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.directContactActive; setFees({ ...fees, directContactActive: active }); void saveFee('DIRECT_CONTACT_ACTIVE', active); }} loading={saving}>{fees.directContactActive ? 'Deactivate' : 'Activate'}</Button></div><div className="mt-4"><FieldEditor label="Direct contact request fee (excl. VAT)" value={fees.directContactFeeGbp} onChange={(value) => setFees({ ...fees, directContactFeeGbp: value })} onSave={() => saveFee('DIRECT_CONTACT_FEE_GBP', fees.directContactFeeGbp)} saving={saving} disabled={locked} /></div></Card>
          <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Provider verification human review</Label><p className="mt-1 text-sm text-concrete-grey">When active, an AI verification request that cannot be auto-approved queues for Super User review. When deactivated, it is automatically declined instead of queuing.</p></div><Button variant={fees.humanReviewActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.humanReviewActive; setFees({ ...fees, humanReviewActive: active }); void saveFee('HUMAN_REVIEW_ACTIVE', active); }} loading={saving}>{fees.humanReviewActive ? 'Deactivate' : 'Activate'}</Button></div></Card>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Verification document requirements</h2>
        <p className="mb-4 max-w-3xl text-sm text-concrete-grey">Activate or deactivate mandatory document requirements for each service. Applicability remains service-specific; optional documents can still be uploaded voluntarily.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {SERVICE_NAMES.map((service) => {
            const documents = VERIFICATION_DOCUMENT_TYPES.filter((document) => document.appliesTo === 'all' || document.appliesTo.includes(service));
            return <Card key={service}><h3 className="font-heading text-base font-bold text-foundation-navy">{service}</h3><div className="mt-3 space-y-3">{documents.map((document) => { const key = `${service}:${document.type}`; const required = verificationRequirements[key] === true; return <label key={key} className="flex items-start gap-3 text-sm text-concrete-grey"><input type="checkbox" checked={required} disabled={locked || saving} onChange={(event) => { const next = { ...verificationRequirements, [key]: event.target.checked }; void saveVerificationRequirements(next); }} className="mt-1 h-4 w-4 accent-safety-amber" /><span><span className="font-semibold text-foundation-navy">{document.label}</span><span className="block text-xs">{required ? 'Required for this service' : 'Optional for this service'}</span></span></label>; })}</div></Card>;
          })}
        </div>
      </section>

      {isOwner && <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Support notifications</h2>
        <Card>
          <Label>Support recipient email</Label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row"><Input type="email" value={supportRecipientEmail} onChange={(event) => setSupportRecipientEmail(event.target.value)} placeholder="support@example.com" /><Button onClick={saveSupportRecipient} loading={saving}>Save</Button></div>
          <p className="mt-3 text-sm text-concrete-grey">New support requests send a minimal notification to this address. Leave blank and save to disable notifications.</p>
        </Card>
      </section>}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-bold text-foundation-navy">Membership tiers</h2><Button variant={fees.membershipTiersActive ? 'danger' : 'secondary'} disabled={locked} onClick={() => { const active = !fees.membershipTiersActive; setFees({ ...fees, membershipTiersActive: active }); void saveFee('MEMBERSHIP_TIERS_ACTIVE', active); }} loading={saving}>{fees.membershipTiersActive ? 'Deactivate membership feature' : 'Activate membership feature'}</Button></div>
        <PlanList plans={settings.tiers} kind="tier" saving={saving} disabled={locked} onToggle={togglePlan} onSaveTier={saveTier} />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Annual subscriptions</h2>
        <PlanList plans={settings.subscriptions} kind="subscription" saving={saving} disabled={locked} onToggle={togglePlan} />
      </section>

      <Card>
        <h2 className="font-heading text-lg font-bold text-foundation-navy">Add membership or subscription</h2>
        <p className="mt-1 text-sm text-concrete-grey">New options are inactive until an Owner activates them.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><FieldGroup label="Name"><Input value={form.name} disabled={locked} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FieldGroup><FieldGroup label="Monthly price (GBP, excl. VAT)"><Input type="number" min="0" value={form.monthlyPriceGbp} disabled={locked} onChange={(event) => setForm({ ...form, monthlyPriceGbp: event.target.value })} /></FieldGroup><FieldGroup label="Inclusive monthly credits"><Input type="number" min="0" value={form.freeTenderOpportunitiesPerMonth} disabled={locked} onChange={(event) => setForm({ ...form, freeTenderOpportunitiesPerMonth: event.target.value })} /></FieldGroup><FieldGroup label="Discount on additional credits (%)"><Input type="number" min="0" max="100" step="0.01" value={form.additionalCreditDiscountPercentage} disabled={locked} onChange={(event) => setForm({ ...form, additionalCreditDiscountPercentage: event.target.value })} /></FieldGroup><FieldGroup label="Description" wide><Textarea rows={3} value={form.description} disabled={locked} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FieldGroup></div>
        <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => createPlan('tier')} loading={saving} disabled={locked}>Add membership tier</Button><Button variant="secondary" onClick={() => createPlan('subscription')} loading={saving} disabled={locked}>Add annual subscription</Button></div>
      </Card>

    </div>
  );
}

function FieldGroup({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <div className={wide ? 'sm:col-span-2' : ''}><Label>{label}</Label><div className="mt-2">{children}</div></div>; }
function FieldEditor({ label, value, onChange, onSave, saving, step = '1', disabled = false }: { label: string; value: number; onChange: (value: number) => void; onSave: () => void; saving: boolean; step?: string; disabled?: boolean }) { return <div><Label>{label}</Label><div className="mt-2 flex gap-3"><Input type="number" min="0" step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /><Button onClick={onSave} loading={saving} disabled={disabled}>Save</Button></div></div>; }
function StringFieldEditor({ label, value, onChange, onSave, saving, disabled = false }: { label: string; value: string; onChange: (value: string) => void; onSave: () => void; saving: boolean; disabled?: boolean }) { return <div><Label>{label}</Label><div className="mt-2 flex gap-3"><Input type="text" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder="https://..." /><Button onClick={onSave} loading={saving} disabled={disabled}>Save</Button></div></div>; }
function PlanList({ plans, kind, saving, disabled = false, onToggle, onSaveTier }: { plans: MembershipTier[] | SubscriptionPlan[]; kind: PlanType; saving: boolean; disabled?: boolean; onToggle: (kind: PlanType, id: string, active: boolean) => void; onSaveTier?: (tier: MembershipTier) => Promise<void> }) { return <div className="space-y-3">{plans.length === 0 ? <p className="text-sm text-concrete-grey">No options created yet.</p> : plans.map((plan) => <Card key={plan.id}>{'freeTenderOpportunitiesPerMonth' in plan && onSaveTier ? <EditableTier plan={plan} saving={saving} disabled={disabled} onSave={onSaveTier} /> : <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-foundation-navy">{plan.name} · £{'annualPriceGbp' in plan ? `${plan.annualPriceGbp}/year` : `${plan.monthlyPriceGbp}/month`} excl. VAT</p><p className="text-sm text-concrete-grey">{plan.description || 'No description'}</p></div><Button variant={plan.active ? 'danger' : 'secondary'} disabled={disabled} onClick={() => onToggle(kind, plan.id, !plan.active)} loading={saving}>{plan.active ? 'Deactivate' : 'Activate'}</Button></div>}</Card>)}</div>; }

function EditableTier({ plan, saving, disabled, onSave }: { plan: MembershipTier; saving: boolean; disabled: boolean; onSave: (tier: MembershipTier) => Promise<void> }) { const [draft, setDraft] = useState(plan); return <><div className="grid gap-3 sm:grid-cols-3"><FieldGroup label="Tier"><Input value={draft.name} disabled={disabled} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></FieldGroup><FieldGroup label="Monthly price (GBP)"><Input type="number" min="0" value={draft.monthlyPriceGbp} disabled={disabled} onChange={(event) => setDraft({ ...draft, monthlyPriceGbp: Number(event.target.value) })} /></FieldGroup><FieldGroup label="Inclusive monthly credits"><Input type="number" min="0" value={draft.freeTenderOpportunitiesPerMonth} disabled={disabled} onChange={(event) => setDraft({ ...draft, freeTenderOpportunitiesPerMonth: Number(event.target.value) })} /></FieldGroup><FieldGroup label="Additional credit discount (%)"><Input type="number" min="0" max="100" step="0.01" value={draft.additionalCreditDiscountPercentage} disabled={disabled} onChange={(event) => setDraft({ ...draft, additionalCreditDiscountPercentage: Number(event.target.value) })} /></FieldGroup><FieldGroup label="Description" wide><Textarea rows={2} value={draft.description} disabled={disabled} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FieldGroup></div><div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => void onSave(draft)} loading={saving} disabled={disabled}>Save tier</Button><Button variant={draft.active ? 'danger' : 'secondary'} disabled={disabled} onClick={() => void onSave({ ...draft, active: !draft.active })} loading={saving}>{draft.active ? 'Deactivate' : 'Activate'}</Button></div></>; }

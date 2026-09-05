'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldGroup, Input, Label, Select } from '@/components/ui/Field';
import { partnerDisplayLocations } from '@/lib/schemas/partners';

type DisplayLocation = typeof partnerDisplayLocations[number];
type Partner = { id: string; name: string; logoPath: string; destinationUrl: string | null; displayLocation: DisplayLocation; campaignSource: string | null; sortOrder: number; active: boolean };
type PartnerFields = Omit<Partner, 'id' | 'sortOrder' | 'campaignSource' | 'destinationUrl'> & { campaignSource: string; destinationUrl: string };

const locationLabels: Record<DisplayLocation, string> = {
  FOOTER: 'Site footer',
  DASHBOARD: 'Portal dashboard',
  ONBOARDING: 'Account onboarding',
  CATEGORY_PAGE: 'Category pages',
  EMAIL_FOOTER: 'Email footer',
};

const emptyPartner: PartnerFields = { name: '', logoPath: '/images/', destinationUrl: 'https://', displayLocation: 'FOOTER', campaignSource: '', active: false };

export function PartnerManagementPanel() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PartnerFields>>({});
  const [newPartner, setNewPartner] = useState<PartnerFields>(emptyPartner);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch('/api/super-user/partners');
    if (!response.ok) { setMessage('Unable to load partners.'); setLoading(false); return; }
    const data = await response.json() as { partners: Partner[] };
    setPartners(data.partners);
    setDrafts(Object.fromEntries(data.partners.map((partner) => [partner.id, fieldsFor(partner)])));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function send(body: unknown, successMessage: string, key: string) {
    setSaving(key);
    setMessage(null);
    const response = await fetch('/api/super-user/partners', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(null);
    if (!response.ok) { setMessage((await response.json().catch(() => null))?.error ?? 'Unable to save partner changes.'); return false; }
    setMessage(successMessage);
    await load();
    return true;
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await send({ action: 'create', partner: normalise(newPartner) }, 'Partner created.', 'create')) setNewPartner(emptyPartner);
  }

  async function reorder(partner: Partner, direction: -1 | 1) {
    const group = partners.filter((item) => item.displayLocation === partner.displayLocation);
    const index = group.findIndex((item) => item.id === partner.id);
    const reordered = [...group];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    await send({ action: 'reorder', displayLocation: partner.displayLocation, orderedIds: reordered.map((item) => item.id) }, 'Partner order updated.', `order-${partner.id}`);
  }

  if (loading) return <p className="text-sm text-concrete-grey">Loading partners...</p>;

  return <div className="space-y-6">
    {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm font-semibold text-steel-blue">{message}</p>}
    <Card>
      <h2 className="font-heading text-lg font-bold text-foundation-navy">Add partner</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={create}>
        <PartnerFieldsForm value={newPartner} onChange={setNewPartner} prefix="new" />
        <div className="sm:col-span-2"><Button type="submit" loading={saving === 'create'}>Create partner</Button></div>
      </form>
    </Card>
    {partners.length === 0 && <p className="text-sm text-concrete-grey">No partners have been added.</p>}
    {partners.map((partner) => {
      const group = partners.filter((item) => item.displayLocation === partner.displayLocation);
      const index = group.findIndex((item) => item.id === partner.id);
      const draft = drafts[partner.id] ?? fieldsFor(partner);
      return <Card key={partner.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">{locationLabels[partner.displayLocation]}</p><h2 className="font-heading text-lg font-bold text-foundation-navy">{partner.name}</h2></div><Button variant={partner.active ? 'danger' : 'secondary'} onClick={() => void send({ action: 'toggle', id: partner.id, active: !partner.active }, `${partner.name} ${partner.active ? 'deactivated' : 'activated'}.`, `toggle-${partner.id}`)} loading={saving === `toggle-${partner.id}`}>{partner.active ? 'Deactivate' : 'Activate'}</Button></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><PartnerFieldsForm value={draft} onChange={(value) => setDrafts((current) => ({ ...current, [partner.id]: value }))} prefix={partner.id} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><Button onClick={() => void send({ action: 'update', id: partner.id, partner: normalise(draft) }, `${draft.name} saved.`, `save-${partner.id}`)} loading={saving === `save-${partner.id}`}>Save changes</Button><button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-foundation-navy disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void reorder(partner, -1)} disabled={index === 0 || saving !== null} aria-label={`Move ${partner.name} up`} title="Move up"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button><button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-foundation-navy disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void reorder(partner, 1)} disabled={index === group.length - 1 || saving !== null} aria-label={`Move ${partner.name} down`} title="Move down"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button></div>
      </Card>;
    })}
  </div>;
}

function PartnerFieldsForm({ value, onChange, prefix }: { value: PartnerFields; onChange: (value: PartnerFields) => void; prefix: string }) {
  function update<K extends keyof PartnerFields>(key: K, fieldValue: PartnerFields[K]) { onChange({ ...value, [key]: fieldValue }); }
  return <><FieldGroup><Label htmlFor={`${prefix}-name`}>Partner name</Label><Input id={`${prefix}-name`} value={value.name} onChange={(event) => update('name', event.target.value)} required minLength={2} maxLength={160} /></FieldGroup><FieldGroup><Label htmlFor={`${prefix}-location`}>Display location</Label><Select id={`${prefix}-location`} value={value.displayLocation} onChange={(event) => update('displayLocation', event.target.value as DisplayLocation)}>{partnerDisplayLocations.map((location) => <option key={location} value={location}>{locationLabels[location]}</option>)}</Select></FieldGroup><FieldGroup><Label htmlFor={`${prefix}-logo`}>Logo image path</Label><Input id={`${prefix}-logo`} value={value.logoPath} onChange={(event) => update('logoPath', event.target.value)} required maxLength={500} /></FieldGroup><FieldGroup><Label htmlFor={`${prefix}-url`}>Destination URL</Label><Input id={`${prefix}-url`} type="url" value={value.destinationUrl} onChange={(event) => update('destinationUrl', event.target.value)} required maxLength={2048} /></FieldGroup><FieldGroup><Label htmlFor={`${prefix}-campaign`}>Campaign source</Label><Input id={`${prefix}-campaign`} value={value.campaignSource ?? ''} onChange={(event) => update('campaignSource', event.target.value)} maxLength={160} /></FieldGroup><FieldGroup><Label className="flex h-11 items-center gap-3" htmlFor={`${prefix}-active`}><Input id={`${prefix}-active`} type="checkbox" checked={value.active} onChange={(event) => update('active', event.target.checked)} className="h-4 w-4" />Active</Label></FieldGroup></>;
}

function fieldsFor(partner: Partner): PartnerFields { const { id: _id, sortOrder: _sortOrder, campaignSource, destinationUrl, ...fields } = partner; return { ...fields, destinationUrl: destinationUrl ?? '', campaignSource: campaignSource ?? '' }; }
function normalise(partner: PartnerFields): Omit<PartnerFields, 'campaignSource' | 'destinationUrl'> & { campaignSource?: string; destinationUrl?: string } { const campaignSource = partner.campaignSource.trim(); const destinationUrl = partner.destinationUrl.trim(); return { ...partner, ...(campaignSource ? { campaignSource } : {}), ...(destinationUrl ? { destinationUrl } : {}) }; }
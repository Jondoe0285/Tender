'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Textarea, FieldGroup } from '@/components/ui/Field';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { CATEGORIES } from '@/lib/categories';
import { UK_COUNTIES, UK_REGIONS } from '@/lib/geography';

type TeamMember = {
  id: string;
  userId: string;
  permissions: string;
  user: { email: string; contactName: string };
};

type Profile = {
  id: string;
  companyName: string;
  companyNumber: string | null;
  address: string | null;
  coverageScope: 'COUNTY' | 'REGION' | 'UK';
  counties: string;
  regions: string;
  categories: string;
  masterUserId: string | null;
};

const permissions = [
  { label: 'View', value: 'VIEW' },
  { label: 'Edit', value: 'EDIT' },
  { label: 'Super User', value: 'SUPER_USER' },
  { label: 'Make payments', value: 'PAYMENTS' },
];

function splitValues(value: string | null | undefined): string[] {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

export default function RetailerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState({ companyName: '', companyNumber: '', address: '', coverageScope: 'COUNTY' as 'COUNTY' | 'REGION' | 'UK', counties: [] as string[], regions: [] as string[], categories: [] as string[], masterUserId: '' });
  const [email, setEmail] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>(['VIEW']);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [profileResponse, teamResponse] = await Promise.all([fetch('/api/retailer/profile'), fetch('/api/retailer/team')]);
    if (profileResponse.ok) {
      const data: Profile = await profileResponse.json();
      setProfile(data);
      setForm({ companyName: data.companyName, companyNumber: data.companyNumber ?? '', address: data.address ?? '', coverageScope: data.coverageScope, counties: splitValues(data.counties), regions: splitValues(data.regions), categories: splitValues(data.categories), masterUserId: data.masterUserId ?? '' });
    }
    if (teamResponse.ok) setTeamMembers(await teamResponse.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/retailer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, companyNumber: form.companyNumber || null, address: form.address || null, counties: form.counties.join(','), regions: form.regions.join(','), categories: form.categories.join(','), masterUserId: form.masterUserId || null }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? 'Unable to save profile.');
      return;
    }
    setProfile(await response.json());
    setEditing(false);
    setMessage('Profile saved.');
    // Categories/coverage settings affect tender matching elsewhere in the app — refresh the
    // Router Cache so the dashboard and opportunities list reflect the change immediately.
    router.refresh();
  }

  async function addTeamMember() {
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/retailer/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, permissions: newPermissions.join(',') }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? 'Unable to add team member.');
      return;
    }
    const newMember: TeamMember = await response.json();
    setTeamMembers((current) => [...current, newMember]);
    setEmail('');
    setNewPermissions(['VIEW']);
    setAdding(false);
    setMessage('Team member added.');
  }

  async function updatePermissions(member: TeamMember, value: string) {
    const next = member.permissions.split(',').filter(Boolean).includes(value)
      ? member.permissions.split(',').filter((permission) => permission !== value)
      : [...member.permissions.split(',').filter(Boolean), value];
    const response = await fetch(`/api/retailer/team/${member.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: next.join(',') }) });
    if (response.ok) setTeamMembers((current) => current.map((item) => item.id === member.id ? { ...item, permissions: next.join(',') } : item));
  }

  async function removeTeamMember(member: TeamMember) {
    if (!window.confirm(`Remove ${member.user.contactName} from this provider space?`)) return;
    const response = await fetch(`/api/retailer/team/${member.id}`, { method: 'DELETE' });
    if (response.ok) setTeamMembers((current) => current.filter((item) => item.id !== member.id));
  }

  if (loading) return <AppShell role="retailer" title="Profile"><p className="text-sm text-concrete-grey">Loading profile...</p></AppShell>;
  if (!profile) return <AppShell role="retailer" title="Profile"><p className="text-sm text-attention">Provider profile not found.</p></AppShell>;

  return (
    <AppShell role="retailer" title="Profile">
      <div className="mx-auto max-w-4xl space-y-6">
        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div><h2 className="font-heading text-xl font-bold text-foundation-navy">Company profile</h2><p className="mt-1 text-sm text-concrete-grey">Keep the details used for matching and commercial correspondence current.</p></div>
            {!editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit profile</Button>}
          </div>
          {editing ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <FieldGroup><Label htmlFor="companyName">Company name</Label><Input id="companyName" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></FieldGroup>
              <FieldGroup><Label htmlFor="companyNumber">Company number</Label><Input id="companyNumber" value={form.companyNumber} onChange={(event) => setForm({ ...form, companyNumber: event.target.value })} placeholder="Companies House number" /></FieldGroup>
              <FieldGroup wide><Label htmlFor="address">Registered or trading address</Label><Textarea id="address" rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></FieldGroup>
              <FieldGroup wide>
                <Label htmlFor="coverageScope">Operating area</Label>
                <div className="flex flex-wrap gap-4">
                  {(['COUNTY', 'REGION', 'UK'] as const).map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm text-concrete-grey">
                      <input type="radio" name="coverageScope" checked={form.coverageScope === scope} onChange={() => setForm({ ...form, coverageScope: scope })} className="h-4 w-4 accent-safety-amber" />
                      {scope === 'COUNTY' ? 'Select counties' : scope === 'REGION' ? 'Select regions' : 'UK-wide (all regions)'}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-concrete-grey">A tender is matched to you only when its postcode falls inside the area you select here.</p>
              </FieldGroup>
              {form.coverageScope === 'COUNTY' && (
                <FieldGroup><Label htmlFor="counties">Operational counties</Label><MultiSelectDropdown options={UK_COUNTIES.map((county) => ({ label: county, value: county }))} selected={form.counties} onChange={(counties) => setForm({ ...form, counties })} placeholder="Select one or more counties" /></FieldGroup>
              )}
              {form.coverageScope === 'REGION' && (
                <FieldGroup><Label htmlFor="regions">Operational regions</Label><MultiSelectDropdown options={UK_REGIONS.map((region) => ({ label: region, value: region }))} selected={form.regions} onChange={(regions) => setForm({ ...form, regions })} placeholder="Select one or more regions" /></FieldGroup>
              )}
              <FieldGroup><Label htmlFor="categories">Services provided</Label><MultiSelectDropdown options={Object.keys(CATEGORIES).map((category) => ({ label: category, value: category }))} selected={form.categories} onChange={(categories) => setForm({ ...form, categories })} placeholder="Select service categories" /></FieldGroup>
              <FieldGroup><Label htmlFor="masterUserId">Master user</Label><select id="masterUserId" value={form.masterUserId} onChange={(event) => setForm({ ...form, masterUserId: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"><option value="">Select a team member</option>{teamMembers.map((member) => <option key={member.userId} value={member.userId}>{member.user.contactName} ({member.user.email})</option>)}</select></FieldGroup>
              <div className="flex items-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button><Button onClick={saveProfile} loading={saving}>Save profile</Button></div>
            </div>
          ) : (
            <dl className="mt-6 grid gap-5 sm:grid-cols-2"><ProfileValue label="Company name" value={profile.companyName} /><ProfileValue label="Company number" value={profile.companyNumber ?? 'Not provided'} /><ProfileValue label="Address" value={profile.address ?? 'Not provided'} wide /><ProfileValue label="Operating area" value={profile.coverageScope === 'UK' ? 'UK-wide (all regions)' : profile.coverageScope === 'REGION' ? (profile.regions || 'Not configured') : (profile.counties || 'Not configured')} /><ProfileValue label="Services provided" value={profile.categories || 'Not configured'} /><ProfileValue label="Master user" value={teamMembers.find((member) => member.userId === profile.masterUserId)?.user.email ?? 'Not assigned'} /></dl>
          )}
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><h2 className="font-heading text-xl font-bold text-foundation-navy">Team access</h2><p className="mt-1 text-sm text-concrete-grey">Add colleagues and control what they can view, edit, or pay for.</p></div><Button variant="secondary" onClick={() => setAdding((value) => !value)}>{adding ? 'Close' : 'Add team member'}</Button></div>
          {adding && <div className="mt-6 rounded-lg border-l-4 border-safety-amber bg-amber-50/50 p-4"><div className="grid gap-4 sm:grid-cols-2"><FieldGroup><Label htmlFor="teamEmail">Existing user email</Label><Input id="teamEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="The user must register first" /></FieldGroup><fieldset><legend className="text-sm font-semibold text-foundation-navy">Permissions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{permissions.map((permission) => <label key={permission.value} className="flex items-center gap-2 text-sm text-concrete-grey"><input type="checkbox" checked={newPermissions.includes(permission.value)} onChange={() => setNewPermissions((current) => current.includes(permission.value) ? current.filter((item) => item !== permission.value) : [...current, permission.value])} className="h-4 w-4 accent-safety-amber" />{permission.label}</label>)}</div></fieldset></div><Button className="mt-4" onClick={addTeamMember} loading={saving} disabled={!email}>Add member</Button></div>}
          <div className="mt-6 divide-y divide-slate-100">{teamMembers.length === 0 ? <p className="py-8 text-sm text-concrete-grey">No additional users have access to this provider space.</p> : teamMembers.map((member) => { const isMaster = profile.masterUserId === member.userId; return <div key={member.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-foundation-navy">{member.user.contactName}{isMaster && <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-steel-blue">Master user</span>}</p><p className="text-sm text-concrete-grey">{member.user.email}</p></div>{!isMaster && <Button variant="danger" size="md" onClick={() => removeTeamMember(member)}>Remove</Button>}</div>{!isMaster && <div className="mt-3 flex flex-wrap gap-3">{permissions.map((permission) => <label key={permission.value} className="flex items-center gap-2 text-sm text-concrete-grey"><input type="checkbox" checked={member.permissions.split(',').includes(permission.value)} onChange={() => updatePermissions(member, permission.value)} className="h-4 w-4 accent-safety-amber" />{permission.label}</label>)}</div>}</div> })}</div>
        </Card>
      </div>
    </AppShell>
  );
}

function ProfileValue({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{label}</dt><dd className="mt-1 whitespace-pre-line font-semibold text-foundation-navy">{value}</dd></div>;
}

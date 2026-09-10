'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FieldGroup, Input, Label, PasswordInput } from '@/components/ui/Field';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { SERVICE_CATALOG, SERVICE_NAMES, isVerificationEligible } from '@/lib/categories';
import { UK_COUNTIES, UK_REGIONS } from '@/lib/geography';

const PROFILE_SERVICE_LABELS: Record<string, string> = {
  Materials: 'Materials Supplier',
  Waste: 'Waste Disposal',
};

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string | null;
  branchIdentifier: string | null;
  services: string[];
  serviceProvisions: string[];
  operatingLocations: string[];
  tradeTenderId: string | null;
  isPrimaryUser: boolean;
  additionalUsers: Array<{ id: string; user: { firstName: string | null; lastName: string | null; contactName: string; email: string } }>;
  warnings: Array<{ id: string; reason: string; note: string; createdAt: string; tenderReference: string }>;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | null;
};

const emptyProfile: Profile = {
  firstName: '', lastName: '', email: '', phoneNumber: '', companyName: null, branchIdentifier: null, services: [], serviceProvisions: [], operatingLocations: [], tradeTenderId: null, isPrimaryUser: false, additionalUsers: [], warnings: [], verificationStatus: null,
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [additionalUser, setAdditionalUser] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' });
  const [showAdditionalUser, setShowAdditionalUser] = useState(false);

  async function loadProfile() {
    const response = await fetch('/api/client/profile');
    if (response.ok) setProfile(await response.json());
    else setMessage('Unable to load your profile.');
    setLoading(false);
  }

  useEffect(() => { void loadProfile(); }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    const response = await fetch('/api/client/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: profile.firstName, lastName: profile.lastName, email: profile.email,
        phoneNumber: profile.phoneNumber || undefined,
        ...(profile.isPrimaryUser ? { companyName: profile.companyName, branchIdentifier: profile.branchIdentifier, services: profile.services, serviceProvisions: profile.serviceProvisions, operatingLocations: profile.operatingLocations } : {}),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string; issues?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } } | null;
      const nextErrors = Object.fromEntries(Object.entries(data?.issues?.fieldErrors ?? {}).map(([key, messages]) => [key, messages[0] ?? 'Invalid value']));
      setFieldErrors(nextErrors);
      setMessage(data?.error ?? 'Unable to save profile details.');
      return;
    }
    setMessage('Profile details saved.');
  }

  async function changePassword() {
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/client/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwords),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage((await response.json().catch(() => null))?.error ?? 'Unable to change password.');
      return;
    }
    setPasswords({ currentPassword: '', newPassword: '' });
    setMessage('Password changed.');
  }

  async function addAdditionalUser() {
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/client/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(additionalUser),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage((await response.json().catch(() => null))?.error ?? 'Unable to add additional user.');
      return;
    }
    setAdditionalUser({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' });
    setShowAdditionalUser(false);
    setMessage('Additional user added.');
    await loadProfile();
  }

  function toggleAllProvisions(service: string) {
    const values = Object.keys(SERVICE_CATALOG[service as keyof typeof SERVICE_CATALOG]).map((provision) => `${service}::${provision}`);
    setProfile((current) => {
      const allSelected = values.every((value) => current.serviceProvisions.includes(value));
      return {
        ...current,
        serviceProvisions: allSelected
          ? current.serviceProvisions.filter((value) => !values.includes(value))
          : [...new Set([...current.serviceProvisions, ...values])],
      };
    });
  }

  return (
    <AppShell role="client" title="Profile">
      <div className="mx-auto max-w-3xl space-y-6">
        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}
        {loading ? <p className="text-sm text-concrete-grey">Loading profile...</p> : <>
          {profile.verificationStatus && isVerificationEligible(profile.services) && <Card className="border-l-4 border-safety-amber bg-amber-50/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-heading text-lg font-bold text-foundation-navy">Provider verification</p>
                <p className="mt-1 max-w-xl text-sm text-concrete-grey">
                  {profile.verificationStatus === 'VERIFIED' && 'Your business is Verified by Ai. This status is shown to Contractors on every quote you submit.'}
                  {profile.verificationStatus === 'PENDING' && 'Your verification request is under review.'}
                  {profile.verificationStatus === 'REJECTED' && 'Your verification request was not approved. You can submit updated evidence.'}
                  {profile.verificationStatus === 'EXPIRED' && 'A required verification document has expired. Upload a replacement to restart verification.'}
                  {profile.verificationStatus === 'UNVERIFIED' && 'Complete the verification process to show your verified status on quotes submitted to Contractors.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={profile.verificationStatus === 'VERIFIED' ? 'approved' : profile.verificationStatus === 'PENDING' ? 'pending' : profile.verificationStatus === 'REJECTED' || profile.verificationStatus === 'EXPIRED' ? 'attention' : 'neutral'}>
                  {profile.verificationStatus === 'VERIFIED' ? 'Verified by Ai' : profile.verificationStatus === 'PENDING' ? 'Pending review' : profile.verificationStatus === 'REJECTED' ? 'Not approved' : profile.verificationStatus === 'EXPIRED' ? 'Expired' : 'Unverified'}
                </StatusBadge>
                {(profile.verificationStatus === 'UNVERIFIED' || profile.verificationStatus === 'REJECTED' || profile.verificationStatus === 'EXPIRED') && <Link href="/retailer/verification"><Button>Become Verified</Button></Link>}
                {(profile.verificationStatus === 'PENDING' || profile.verificationStatus === 'VERIFIED') && <Link href="/retailer/verification" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">View documents</Link>}
              </div>
            </div>
          </Card>}
          <Card>
            <div className="border-b border-slate-200 pb-5"><h2 className="font-heading text-xl font-bold text-foundation-navy">Personal details</h2><p className="mt-1 text-sm text-concrete-grey">Manage your contact details and account email.</p></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <FieldGroup><Label htmlFor="firstName">First name</Label><Input id="firstName" value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} autoComplete="given-name" /></FieldGroup>
              <FieldGroup><Label htmlFor="lastName">Last name</Label><Input id="lastName" value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} autoComplete="family-name" /></FieldGroup>
              <FieldGroup><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} autoComplete="email" /></FieldGroup>
              <FieldGroup><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" value={profile.phoneNumber} onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })} autoComplete="tel" /></FieldGroup>
              {profile.isPrimaryUser && <FieldGroup wide><Label htmlFor="companyName">Company name</Label><Input id="companyName" value={profile.companyName ?? ''} onChange={(event) => setProfile({ ...profile, companyName: event.target.value })} autoComplete="organization" />{fieldErrors.companyName && <p className="text-sm text-attention">{fieldErrors.companyName}</p>}</FieldGroup>}
              {profile.isPrimaryUser && <FieldGroup wide><Label htmlFor="branchIdentifier">Branch or location</Label><Input id="branchIdentifier" value={profile.branchIdentifier ?? ''} onChange={(event) => setProfile({ ...profile, branchIdentifier: event.target.value })} />{fieldErrors.branchIdentifier && <p className="text-sm text-attention">{fieldErrors.branchIdentifier}</p>}</FieldGroup>}
              {profile.isPrimaryUser && <FieldGroup wide><Label>Services</Label><MultiSelectDropdown options={SERVICE_NAMES.map((service) => ({ label: PROFILE_SERVICE_LABELS[service] ?? service, value: service }))} selected={profile.services} onChange={(services) => setProfile({ ...profile, services, serviceProvisions: profile.serviceProvisions.filter((entry) => services.includes(entry.split('::')[0] ?? '')) })} placeholder="Select services offered" />{fieldErrors.services && <p className="text-sm text-attention">{fieldErrors.services}</p>}</FieldGroup>}
              {profile.isPrimaryUser && profile.services.map((service) => (
                <FieldGroup key={service} wide>
                  <div className="flex items-center justify-between gap-3">
                    <Label>{service} provisions</Label>
                    <button type="button" onClick={() => toggleAllProvisions(service)} className="text-xs font-semibold text-steel-blue hover:text-foundation-navy">
                      {Object.keys(SERVICE_CATALOG[service as keyof typeof SERVICE_CATALOG]).every((provision) => profile.serviceProvisions.includes(`${service}::${provision}`)) ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {Object.keys(SERVICE_CATALOG[service as keyof typeof SERVICE_CATALOG]).map((provision) => {
                      const value = `${service}::${provision}`;
                      const selected = profile.serviceProvisions.includes(value);
                      return (
                        <label key={value} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-concrete-grey">
                          <input type="checkbox" checked={selected} onChange={() => setProfile({ ...profile, serviceProvisions: selected ? profile.serviceProvisions.filter((entry) => entry !== value) : [...profile.serviceProvisions, value] })} className="h-4 w-4 accent-safety-amber" />
                          {provision}
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.serviceProvisions && <p className="text-sm text-attention">{fieldErrors.serviceProvisions}</p>}
                </FieldGroup>
              ))}
              {profile.isPrimaryUser && <FieldGroup wide><Label>Operating locations</Label><MultiSelectDropdown options={['United Kingdom', ...UK_REGIONS, ...UK_COUNTIES].map((location) => ({ label: location, value: location }))} selected={profile.operatingLocations} onChange={(operatingLocations) => setProfile({ ...profile, operatingLocations })} placeholder="Select United Kingdom, regions, or counties" />{fieldErrors.operatingLocations && <p className="text-sm text-attention">{fieldErrors.operatingLocations}</p>}</FieldGroup>}
              <FieldGroup wide><Label htmlFor="tradeTenderId">Trade Tender ID</Label><Input id="tradeTenderId" value={profile.tradeTenderId ?? 'Not assigned'} readOnly /></FieldGroup>
              <div className="sm:col-span-2"><Button onClick={saveProfile} loading={saving}>Save profile</Button></div>
            </div>
          </Card>
          <Card>
            <div className="border-b border-slate-200 pb-5"><h2 className="font-heading text-xl font-bold text-foundation-navy">Change password</h2><p className="mt-1 text-sm text-concrete-grey">Update your own sign-in password.</p></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2"><FieldGroup><Label htmlFor="currentPassword">Current password</Label><PasswordInput id="currentPassword" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} autoComplete="current-password" /></FieldGroup><FieldGroup><Label htmlFor="newPassword">New password</Label><PasswordInput id="newPassword" minLength={10} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} autoComplete="new-password" /><p className="mt-1 text-xs text-concrete-grey">Use 10-200 characters, including a capital letter and a special character.</p></FieldGroup><div className="sm:col-span-2"><Button variant="secondary" onClick={changePassword} loading={saving}>Change password</Button></div></div>
          </Card>
          {profile.warnings.length > 0 && <Card>
            <div className="border-b border-slate-200 pb-5"><h2 className="font-heading text-xl font-bold text-foundation-navy">Active account warnings</h2><p className="mt-1 text-sm text-concrete-grey">Warnings issued to this account following a tender review.</p></div>
            <div className="mt-5 space-y-4">{profile.warnings.map((warning) => <div key={warning.id} className="border-l-4 border-attention bg-slate-50 px-4 py-3"><p className="font-semibold text-foundation-navy">{warning.reason}</p><p className="mt-1 text-sm text-concrete-grey">Tender {warning.tenderReference} · {new Date(warning.createdAt).toLocaleDateString('en-GB')}</p><p className="mt-2 text-sm text-foundation-navy">{warning.note}</p></div>)}</div>
          </Card>}
          {profile.isPrimaryUser && <Card>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><h2 className="font-heading text-xl font-bold text-foundation-navy">Additional users</h2><p className="mt-1 text-sm text-concrete-grey">Additional users can update only their own personal details and password.</p></div><Button variant="secondary" onClick={() => setShowAdditionalUser(!showAdditionalUser)}>{showAdditionalUser ? 'Close' : 'Add user'}</Button></div>
            {showAdditionalUser && <div className="mt-6 grid gap-5 rounded-lg border-l-4 border-safety-amber bg-amber-50/50 p-4 sm:grid-cols-2"><FieldGroup><Label htmlFor="additionalFirstName">First name</Label><Input id="additionalFirstName" value={additionalUser.firstName} onChange={(event) => setAdditionalUser({ ...additionalUser, firstName: event.target.value })} /></FieldGroup><FieldGroup><Label htmlFor="additionalLastName">Last name</Label><Input id="additionalLastName" value={additionalUser.lastName} onChange={(event) => setAdditionalUser({ ...additionalUser, lastName: event.target.value })} /></FieldGroup><FieldGroup><Label htmlFor="additionalEmail">Email address</Label><Input id="additionalEmail" type="email" value={additionalUser.email} onChange={(event) => setAdditionalUser({ ...additionalUser, email: event.target.value })} /></FieldGroup><FieldGroup><Label htmlFor="additionalPhone">Phone number</Label><Input id="additionalPhone" type="tel" value={additionalUser.phoneNumber} onChange={(event) => setAdditionalUser({ ...additionalUser, phoneNumber: event.target.value })} /></FieldGroup><FieldGroup wide><Label htmlFor="additionalPassword">Temporary password</Label><PasswordInput id="additionalPassword" minLength={10} value={additionalUser.password} onChange={(event) => setAdditionalUser({ ...additionalUser, password: event.target.value })} /><p className="mt-1 text-xs text-concrete-grey">Use 10-200 characters, including a capital letter and a special character.</p></FieldGroup><div className="sm:col-span-2"><Button onClick={addAdditionalUser} loading={saving}>Add user</Button></div></div>}
            <div className="mt-6 divide-y divide-slate-100">{profile.additionalUsers.length === 0 ? <p className="py-5 text-sm text-concrete-grey">No additional users.</p> : profile.additionalUsers.map(({ id, user }) => <div key={id} className="py-4"><p className="font-semibold text-foundation-navy">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.contactName}</p><p className="text-sm text-concrete-grey">{user.email}</p></div>)}</div>
          </Card>}
        </>}
      </div>
    </AppShell>
  );
}

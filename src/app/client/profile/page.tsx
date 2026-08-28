'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, Label, PasswordInput } from '@/components/ui/Field';

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string | null;
  tradeTenderId: string | null;
  isPrimaryUser: boolean;
  additionalUsers: Array<{ id: string; user: { firstName: string | null; lastName: string | null; contactName: string; email: string } }>;
};

const emptyProfile: Profile = {
  firstName: '', lastName: '', email: '', phoneNumber: '', companyName: null, tradeTenderId: null, isPrimaryUser: false, additionalUsers: [],
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    const response = await fetch('/api/client/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: profile.firstName, lastName: profile.lastName, email: profile.email,
        phoneNumber: profile.phoneNumber || undefined,
        ...(profile.isPrimaryUser ? { companyName: profile.companyName } : {}),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage((await response.json().catch(() => null))?.error ?? 'Unable to save profile details.');
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

  return (
    <AppShell role="client" title="Profile">
      <div className="mx-auto max-w-3xl space-y-6">
        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}
        {loading ? <p className="text-sm text-concrete-grey">Loading profile...</p> : <>
          <Card>
            <div className="border-b border-slate-200 pb-5"><h2 className="font-heading text-xl font-bold text-foundation-navy">Personal details</h2><p className="mt-1 text-sm text-concrete-grey">Manage your contact details and account email.</p></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <FieldGroup><Label htmlFor="firstName">First name</Label><Input id="firstName" value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} autoComplete="given-name" /></FieldGroup>
              <FieldGroup><Label htmlFor="lastName">Last name</Label><Input id="lastName" value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} autoComplete="family-name" /></FieldGroup>
              <FieldGroup><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} autoComplete="email" /></FieldGroup>
              <FieldGroup><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" value={profile.phoneNumber} onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })} autoComplete="tel" /></FieldGroup>
              {profile.isPrimaryUser && <FieldGroup wide><Label htmlFor="companyName">Company name</Label><Input id="companyName" value={profile.companyName ?? ''} onChange={(event) => setProfile({ ...profile, companyName: event.target.value })} autoComplete="organization" /></FieldGroup>}
              <FieldGroup wide><Label htmlFor="tradeTenderId">Trade Tender ID</Label><Input id="tradeTenderId" value={profile.tradeTenderId ?? 'Not assigned'} readOnly /></FieldGroup>
              <div className="sm:col-span-2"><Button onClick={saveProfile} loading={saving}>Save profile</Button></div>
            </div>
          </Card>
          <Card>
            <div className="border-b border-slate-200 pb-5"><h2 className="font-heading text-xl font-bold text-foundation-navy">Change password</h2><p className="mt-1 text-sm text-concrete-grey">Update your own sign-in password.</p></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2"><FieldGroup><Label htmlFor="currentPassword">Current password</Label><PasswordInput id="currentPassword" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} autoComplete="current-password" /></FieldGroup><FieldGroup><Label htmlFor="newPassword">New password</Label><PasswordInput id="newPassword" minLength={10} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} autoComplete="new-password" /></FieldGroup><div className="sm:col-span-2"><Button variant="secondary" onClick={changePassword} loading={saving}>Change password</Button></div></div>
          </Card>
          {profile.isPrimaryUser && <Card>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><h2 className="font-heading text-xl font-bold text-foundation-navy">Additional users</h2><p className="mt-1 text-sm text-concrete-grey">Additional users can update only their own personal details and password.</p></div><Button variant="secondary" onClick={() => setShowAdditionalUser(!showAdditionalUser)}>{showAdditionalUser ? 'Close' : 'Add user'}</Button></div>
            {showAdditionalUser && <div className="mt-6 grid gap-5 rounded-lg border-l-4 border-safety-amber bg-amber-50/50 p-4 sm:grid-cols-2"><FieldGroup><Label htmlFor="additionalFirstName">First name</Label><Input id="additionalFirstName" value={additionalUser.firstName} onChange={(event) => setAdditionalUser({ ...additionalUser, firstName: event.target.value })} /></FieldGroup><FieldGroup><Label htmlFor="additionalLastName">Last name</Label><Input id="additionalLastName" value={additionalUser.lastName} onChange={(event) => setAdditionalUser({ ...additionalUser, lastName: event.target.value })} /></FieldGroup><FieldGroup><Label htmlFor="additionalEmail">Email address</Label><Input id="additionalEmail" type="email" value={additionalUser.email} onChange={(event) => setAdditionalUser({ ...additionalUser, email: event.target.value })} /></FieldGroup><FieldGroup><Label htmlFor="additionalPhone">Phone number</Label><Input id="additionalPhone" type="tel" value={additionalUser.phoneNumber} onChange={(event) => setAdditionalUser({ ...additionalUser, phoneNumber: event.target.value })} /></FieldGroup><FieldGroup wide><Label htmlFor="additionalPassword">Temporary password</Label><PasswordInput id="additionalPassword" minLength={10} value={additionalUser.password} onChange={(event) => setAdditionalUser({ ...additionalUser, password: event.target.value })} /></FieldGroup><div className="sm:col-span-2"><Button onClick={addAdditionalUser} loading={saving}>Add user</Button></div></div>}
            <div className="mt-6 divide-y divide-slate-100">{profile.additionalUsers.length === 0 ? <p className="py-5 text-sm text-concrete-grey">No additional users.</p> : profile.additionalUsers.map(({ id, user }) => <div key={id} className="py-4"><p className="font-semibold text-foundation-navy">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.contactName}</p><p className="text-sm text-concrete-grey">{user.email}</p></div>)}</div>
          </Card>}
        </>}
      </div>
    </AppShell>
  );
}

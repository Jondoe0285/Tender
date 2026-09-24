import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { addAdditionalUser, changeMobilePassword, loadMobileProfile, updateMobileProfile, type MobileProfile } from '../api/profile';
import { loadPublishedCatalog } from '../api/registration';
import { createSupportRequest, loadPayments, loadSupportRequests, type PaymentsPayload, type SupportRequest } from '../api/workspace';
import { COMPANY_TYPE_LABELS, COMPANY_TYPES, DATA_SUBJECT_RIGHTS, OPERATING_LOCATIONS, PAYMENT_TYPE_LABELS, SUPPORT_TYPES, formatUkDate, type CategoryCatalog, type CompanyType } from '../constants';
import type { Route } from '../navigation/types';
import { Body, Card, ChipSelect, Field, Metric, Notice, OptionList, PrimaryButton, SecondaryButton, Title } from '../ui';

export function ProfileScreen({ email, go, onSignOut }: { email: string; go: (route: Route) => void; onSignOut: () => void }) {
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [catalog, setCatalog] = useState<CategoryCatalog>({});
  const [message, setMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '' });

  useEffect(() => {
    loadMobileProfile().then(setProfile).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Unable to load your profile.'));
    loadPublishedCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  const provisionOptions = useMemo(
    () => (profile?.services ?? []).flatMap((service) => Object.keys(catalog[service] ?? {}).map((provision) => ({ label: `${service} · ${provision}`, value: `${service}::${provision}` }))),
    [catalog, profile?.services],
  );

  if (!profile) return <Notice>{message ?? 'Loading profile…'}</Notice>;

  async function save() {
    if (!profile) return;
    setMessage(null);
    try {
      await updateMobileProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        ...(profile.isPrimaryUser ? {
          companyName: profile.companyName ?? undefined,
          branchIdentifier: profile.branchIdentifier ?? undefined,
          companyType: profile.companyType,
          services: profile.services,
          serviceProvisions: profile.serviceProvisions,
          operatingLocations: profile.operatingLocations,
          releaseSpendCapGbp: profile.releaseSpendCapGbp,
        } : {}),
      });
      setProfile(await loadMobileProfile());
      setMessage('Profile updated.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to update your profile.');
    }
  }

  return (
    <View>
      <Title>Profile</Title>
      <Body>{email}{profile.tradeTenderId ? ` · ${profile.tradeTenderId}` : ''}</Body>
      {profile.verificationStatus ? <Body>Verification: {profile.verificationStatus}</Body> : null}
      <Field label="First name" onChangeText={(firstName) => setProfile({ ...profile, firstName })} value={profile.firstName} />
      <Field label="Last name" onChangeText={(lastName) => setProfile({ ...profile, lastName })} value={profile.lastName} />
      <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={(next) => setProfile({ ...profile, email: next })} value={profile.email} />
      <Field keyboardType="phone-pad" label="Phone" onChangeText={(phoneNumber) => setProfile({ ...profile, phoneNumber })} value={profile.phoneNumber} />
      {profile.isPrimaryUser && (
        <>
          <Field label="Company name" onChangeText={(companyName) => setProfile({ ...profile, companyName })} value={profile.companyName ?? ''} />
          <Field label="Branch" onChangeText={(branchIdentifier) => setProfile({ ...profile, branchIdentifier })} value={profile.branchIdentifier ?? ''} />
          <OptionList label="Company type" onChange={(companyType) => setProfile({ ...profile, companyType })} options={COMPANY_TYPES.map((type) => ({ label: COMPANY_TYPE_LABELS[type], value: type }))} value={profile.companyType as CompanyType} />
          <ChipSelect label="Services" onChange={(services) => setProfile({ ...profile, services })} options={Object.keys(catalog).map((service) => ({ label: service, value: service }))} selected={profile.services} />
          <ChipSelect label="Provisions" onChange={(serviceProvisions) => setProfile({ ...profile, serviceProvisions })} options={provisionOptions} selected={profile.serviceProvisions} />
          <ChipSelect label="Operating locations" onChange={(operatingLocations) => setProfile({ ...profile, operatingLocations })} options={OPERATING_LOCATIONS.map((location) => ({ label: location, value: location }))} selected={profile.operatingLocations} />
          <Field keyboardType="number-pad" label="Release spend cap (GBP)" onChangeText={(value) => setProfile({ ...profile, releaseSpendCapGbp: value ? Number(value) : null })} value={profile.releaseSpendCapGbp == null ? '' : String(profile.releaseSpendCapGbp)} />
        </>
      )}
      <PrimaryButton label="Save profile" onPress={() => { void save(); }} />
      <Card>
        <Title>Password</Title>
        <Field label="Current password" onChangeText={setCurrentPassword} secureTextEntry value={currentPassword} />
        <Field label="New password" onChangeText={setNewPassword} secureTextEntry value={newPassword} />
        <SecondaryButton label="Update password" onPress={() => {
          changeMobilePassword(currentPassword, newPassword).then(() => setMessage('Password updated.')).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Unable to update your password.'));
        }} />
      </Card>
      {profile.isPrimaryUser && (
        <Card>
          <Title>Additional users</Title>
          {profile.additionalUsers.map((member) => <Body key={member.id}>{member.user.contactName} · {member.user.email}</Body>)}
          <Field label="First name" onChangeText={(firstName) => setNewUser((current) => ({ ...current, firstName }))} value={newUser.firstName} />
          <Field label="Last name" onChangeText={(lastName) => setNewUser((current) => ({ ...current, lastName }))} value={newUser.lastName} />
          <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={(next) => setNewUser((current) => ({ ...current, email: next }))} value={newUser.email} />
          <Field label="Password" onChangeText={(password) => setNewUser((current) => ({ ...current, password }))} secureTextEntry value={newUser.password} />
          <SecondaryButton label="Add user" onPress={() => {
            addAdditionalUser(newUser).then(async () => {
              setProfile(await loadMobileProfile());
              setMessage('Additional user created.');
            }).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Unable to add the additional user.'));
          }} />
        </Card>
      )}
      {profile.warnings.map((warning) => <Body key={warning.id}>{warning.tenderReference}: {warning.reason}</Body>)}
      <SecondaryButton label="Verification" onPress={() => go({ name: 'verification' })} />
      <SecondaryButton label="Activity and payments" onPress={() => go({ name: 'billing' })} />
      <SecondaryButton label="Support" onPress={() => go({ name: 'support' })} />
      <Notice>{message}</Notice>
      <PrimaryButton label="Sign out" onPress={onSignOut} />
    </View>
  );
}

export function BillingScreen() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<PaymentsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments(period).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load activity and payments.'));
  }, [period]);

  return (
    <View>
      <Title>Activity and payments</Title>
      <OptionList
        label="Period"
        onChange={setPeriod}
        options={[
          { label: 'Last 7 days', value: '7d' },
          { label: 'Last 30 days', value: '30d' },
          { label: 'Last 90 days', value: '90d' },
          { label: 'All time', value: 'all' },
        ]}
        value={period}
      />
      <Notice>{error}</Notice>
      {data && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
            <Metric label="Tenders unlocked" value={data.metrics.unlocks} />
            <Metric label="Quotes provided" value={data.metrics.quotesProvided} />
            <Metric label="Quotes accepted" value={data.metrics.quotesAccepted} />
          </View>
          {data.payments.length === 0 ? <Body>No payments are recorded for this period.</Body> : data.payments.map((payment) => (
            <Card key={payment.id}>
              <Body>{formatUkDate(payment.createdAt)} · {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}</Body>
              <Body>£{payment.totalAmountGbp} inc. VAT · {payment.status}</Body>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

export function SupportScreen() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [type, setType] = useState<(typeof SUPPORT_TYPES)[number]>('SUPPORT');
  const [dataSubjectRight, setDataSubjectRight] = useState<(typeof DATA_SUBJECT_RIGHTS)[number]>('ACCESS_EXPORT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSupportRequests().then(setRequests).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Unable to load support requests.'));
  }, []);

  return (
    <View>
      <Title>Support</Title>
      <Body>Do not include passwords, card numbers, email addresses, or phone numbers.</Body>
      <OptionList label="Type" onChange={(value) => setType(value as (typeof SUPPORT_TYPES)[number])} options={SUPPORT_TYPES.map((value) => ({ label: value.replace('_', ' '), value }))} value={type} />
      {type === 'DATA_PRIVACY' && <OptionList label="Data protection right" onChange={(value) => setDataSubjectRight(value as (typeof DATA_SUBJECT_RIGHTS)[number])} options={DATA_SUBJECT_RIGHTS.map((value) => ({ label: value, value }))} value={dataSubjectRight} />}
      <Field label="Title" onChangeText={setTitle} value={title} />
      <Field label="Description" multiline onChangeText={setDescription} value={description} />
      <PrimaryButton label="Submit request" onPress={() => {
        createSupportRequest({
          type,
          title,
          description,
          dataSubjectRight: type === 'DATA_PRIVACY' ? dataSubjectRight : undefined,
        }).then(async () => {
          setTitle('');
          setDescription('');
          setRequests(await loadSupportRequests());
          setMessage('Request submitted.');
        }).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Unable to submit the support request.'));
      }} />
      <Notice>{message}</Notice>
      {requests.map((request) => <Body key={request.id}>{request.title} · {request.status}</Body>)}
    </View>
  );
}

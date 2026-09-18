import { Montserrat_600SemiBold, Montserrat_700Bold, useFonts as useMontserratFonts } from '@expo-google-fonts/montserrat';
import { SourceSans3_400Regular, SourceSans3_600SemiBold, useFonts as useSourceSansFonts } from '@expo-google-fonts/source-sans-3';
import { StatusBar } from 'expo-status-bar';
import * as ExpoLinking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { signInWithPassword } from './src/api/auth';
import { loadMobileSession, type MobileSession } from './src/auth/session';
import { loadMobileProfile, updateMobileProfile, type MobileProfile } from './src/api/profile';
import { loadMyTenders, loadTenderDetail, type MobileTenderDetail, type MobileTenderSummary } from './src/api/tenders';
import { loadOpportunities, type MobileOpportunitySummary } from './src/api/opportunities';
import { acceptMobileQuote, loadMobileReleaseStatus, loadReleasedContact, loadTenderQuotes, submitMobileQuote, type MobileQuoteSummary, type MobileReleasedContact } from './src/api/quotes';
import { requestTenderUnlock } from './src/api/unlock';
import { revokeMobileSession } from './src/api/client';
import { createMobileTender } from './src/api/tenderCreation';
import { registerMobileAccount } from './src/api/registration';

export default function App() {
  const [montserratLoaded] = useMontserratFonts({ Montserrat_600SemiBold, Montserrat_700Bold });
  const [sourceSansLoaded] = useSourceSansFonts({ SourceSans3_400Regular, SourceSans3_600SemiBold });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<MobileSession | null>(null);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [tenders, setTenders] = useState<MobileTenderSummary[]>([]);
  const [tenderDetail, setTenderDetail] = useState<MobileTenderDetail | null>(null);
  const [tenderError, setTenderError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<MobileOpportunitySummary[]>([]);
  const [quotes, setQuotes] = useState<MobileQuoteSummary[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [creatingTender, setCreatingTender] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('Materials');
  const [subcategory, setSubcategory] = useState('Aggregates');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [tenderMessage, setTenderMessage] = useState<string | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [quoteDeliveryInfo, setQuoteDeliveryInfo] = useState('');
  const [quoteLeadTime, setQuoteLeadTime] = useState('');
  const [quoteValidityDays, setQuoteValidityDays] = useState('30');
  const [quotePrices, setQuotePrices] = useState<Record<string, string>>({});
  const [releasedContact, setReleasedContact] = useState<MobileReleasedContact | null>(null);
  const [pendingUnlockTenderId, setPendingUnlockTenderId] = useState<string | null>(null);
  const [pendingReleaseQuoteId, setPendingReleaseQuoteId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [registration, setRegistration] = useState({ email: '', password: '', firstName: '', lastName: '', companyName: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    loadMobileSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (!session) return;
    loadMobileProfile().then((loadedProfile) => {
      setProfile(loadedProfile);
      setProfileFirstName(loadedProfile.firstName);
      setProfileLastName(loadedProfile.lastName);
      setProfileEmail(loadedProfile.email);
    }).catch(() => setProfile(null));
    loadMyTenders().then(setTenders).catch(() => setTenders([]));
    loadOpportunities().then(setOpportunities).catch(() => setOpportunities([]));
  }, [session]);

  useEffect(() => {
    async function handlePaymentReturn(url: string) {
      const parsed = ExpoLinking.parse(url);
      if (parsed.scheme !== 'tradetender' || parsed.path !== 'payment/return') return;
      if (pendingUnlockTenderId) {
        const detail = await loadTenderDetail(pendingUnlockTenderId).catch(() => null);
        if (detail) setTenderDetail(detail);
        setUnlockMessage(detail?.unlocked ? 'Payment confirmed. Tender access is available.' : 'Payment return received. Waiting for server confirmation.');
        setPendingUnlockTenderId(null);
      }
      if (pendingReleaseQuoteId) {
        const release = await loadMobileReleaseStatus(pendingReleaseQuoteId).catch(() => null);
        setQuoteMessage(release?.status === 'CONFIRMED' ? 'Payment confirmed. Contact release is available.' : 'Payment return received. Waiting for server confirmation.');
        setPendingReleaseQuoteId(null);
      }
    }
    Linking.getInitialURL().then((url) => { if (url) void handlePaymentReturn(url); }).catch(() => undefined);
    const subscription = Linking.addEventListener('url', (event) => { void handlePaymentReturn(event.url); });
    return () => subscription.remove();
  }, [pendingReleaseQuoteId, pendingUnlockTenderId]);

  if (!montserratLoaded || !sourceSansLoaded) return null;

  async function handleSignIn() {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
      setSession(await signInWithPassword(email.trim(), password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    setRegistrationMessage(null);
    try {
      const status = await registerMobileAccount({
        ...registration,
        contactName: `${registration.firstName} ${registration.lastName}`.trim(),
        termsAccepted,
      });
      setRegistrationMessage(status === 'verification_sent' ? 'Check your email to verify the account before signing in.' : 'Account created. Check your email to verify it before signing in.');
      setRegistering(false);
    } catch (reason) {
      setRegistrationMessage(reason instanceof Error ? reason.message : 'Unable to create account.');
    }
  }

  async function handleProfileSave() {
    setProfileMessage(null);
    try {
      await updateMobileProfile({ firstName: profileFirstName.trim(), lastName: profileLastName.trim(), email: profileEmail.trim() });
      const refreshedProfile = await loadMobileProfile();
      setProfile(refreshedProfile);
      setEditingProfile(false);
      setProfileMessage('Profile updated.');
    } catch (reason) {
      setProfileMessage(reason instanceof Error ? reason.message : 'Unable to update profile.');
    }
  }

  async function handleTenderCreate() {
    setTenderMessage(null);
    try {
      const created = await createMobileTender({ projectName, category, subcategory, location, quantity, urgency: 'standard', closingDate, description: '' });
      setTenderMessage(`Tender ${created.reference} created.`);
      setProjectName(''); setLocation(''); setQuantity(''); setClosingDate('');
      setTenders(await loadMyTenders());
    } catch (reason) {
      setTenderMessage(reason instanceof Error ? reason.message : 'Unable to create tender.');
    }
  }

  async function handleQuoteAccept(quoteId: string) {
    setQuoteMessage(null);
    try {
      const outcome = await acceptMobileQuote(quoteId);
      if (outcome.checkoutUrl) {
        setPendingReleaseQuoteId(quoteId);
        await Linking.openURL(outcome.checkoutUrl);
        setQuoteMessage('Payment is pending. Return to the app after payment to check server confirmation.');
        return;
      }
      const release = await loadMobileReleaseStatus(quoteId);
      setQuoteMessage(release.status === 'CONFIRMED' ? 'Payment confirmed. Contact release is being processed by the server.' : `Quote status: ${release.status}.`);
    } catch (reason) {
      setQuoteMessage(reason instanceof Error ? reason.message : 'Unable to accept quote.');
    }
  }

  async function handleQuoteSubmit() {
    if (!selectedTenderId || !tenderDetail) return;
    const items = Array.isArray(tenderDetail.tender.items) ? tenderDetail.tender.items as { id?: unknown }[] : [];
    const lineItems = items
      .filter((item): item is { id: string } => typeof item.id === 'string')
      .map((item) => {
        const price = Number(quotePrices[item.id]);
        return Number.isSafeInteger(price) && price > 0
          ? { tenderItemId: item.id, available: true as const, priceGbp: price }
          : { tenderItemId: item.id, available: false as const };
      });
    setQuoteMessage(null);
    try {
      const quote = await submitMobileQuote(selectedTenderId, {
        lineItems,
        charges: [],
        leadTimeDays: Number(quoteLeadTime),
        deliveryDateConfirmed: true,
        deliveryInfo: quoteDeliveryInfo,
        validityDays: Number(quoteValidityDays),
      });
      setQuoteMessage(`Quote ${quote.reference} submitted.`);
      setQuotes(await loadTenderQuotes(selectedTenderId));
    } catch (reason) {
      setQuoteMessage(reason instanceof Error ? reason.message : 'Unable to submit quote.');
    }
  }

  async function handleContactLoad(quoteId: string) {
    setQuoteMessage(null);
    try {
      setReleasedContact(await loadReleasedContact(quoteId));
    } catch (reason) {
      setReleasedContact(null);
      setQuoteMessage(reason instanceof Error ? reason.message : 'Contact details are not available.');
    }
  }

  async function handleSignOut() {
    await revokeMobileSession();
    setSession(null);
    setProfile(null);
    setTenders([]);
    setTenderDetail(null);
    setOpportunities([]);
    setQuotes([]);
    setSelectedTenderId(null);
    setPassword('');
  }

  async function handleTenderPress(tenderId: string) {
    setTenderError(null);
    try {
      setSelectedTenderId(tenderId);
      setTenderDetail(await loadTenderDetail(tenderId));
      setQuotes(await loadTenderQuotes(tenderId).catch(() => []));
    } catch (reason) {
      setTenderError(reason instanceof Error ? reason.message : 'Unable to load tender details.');
    }
  }

  async function handleUnlock() {
    if (!selectedTenderId) return;
    setUnlockMessage(null);
    try {
      const outcome = await requestTenderUnlock(selectedTenderId);
      if (outcome.status === 'PAYMENT_REQUIRED') {
        if (outcome.checkoutUrl) {
          setPendingUnlockTenderId(selectedTenderId);
          await Linking.openURL(outcome.checkoutUrl);
          setUnlockMessage('Payment is pending. Return to the app after payment to check server confirmation.');
          return;
        }
        setUnlockMessage('Payment is pending server confirmation.');
        return;
      }
      setUnlockMessage('Tender access has been updated.');
      setTenderDetail(await loadTenderDetail(selectedTenderId));
    } catch (reason) {
      setUnlockMessage(reason instanceof Error ? reason.message : 'Unable to unlock tender.');
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.header}>
        <Image
          accessibilityLabel="Trade Tender"
          alt=""
          source={require('./assets/trade-tender-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Native mobile client</Text>
        <Text style={styles.title}>Trade Tender</Text>
        <Text style={styles.description}>Connect. Compare. Construct.</Text>
        {session ? (
          <View style={styles.form}>
            <Text style={styles.label}>{session.email}</Text>
            {profile && <Text style={styles.description}>{profile.firstName} {profile.lastName}</Text>}
            <Pressable accessibilityLabel="Edit profile" accessibilityRole="button" onPress={() => setEditingProfile((open) => !open)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{editingProfile ? 'Cancel profile edit' : 'Edit profile'}</Text></Pressable>
            {editingProfile && <View style={styles.profileForm}>
              <Text style={styles.label}>First name</Text><TextInput accessibilityLabel="First name" onChangeText={setProfileFirstName} style={styles.input} value={profileFirstName} />
              <Text style={styles.label}>Last name</Text><TextInput accessibilityLabel="Last name" onChangeText={setProfileLastName} style={styles.input} value={profileLastName} />
              <Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Profile email" autoCapitalize="none" keyboardType="email-address" onChangeText={setProfileEmail} style={styles.input} value={profileEmail} />
              <Pressable accessibilityLabel="Save profile" accessibilityRole="button" onPress={handleProfileSave} style={styles.button}><Text style={styles.buttonText}>Save profile</Text></Pressable>
            </View>}
            {profileMessage && <Text accessibilityLiveRegion="polite" style={styles.error}>{profileMessage}</Text>}
            <Pressable accessibilityLabel="Create tender" accessibilityRole="button" onPress={() => setCreatingTender((open) => !open)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{creatingTender ? 'Cancel tender creation' : 'Create tender'}</Text></Pressable>
            {creatingTender && <View style={styles.profileForm}>
              <Text style={styles.label}>Project name</Text><TextInput accessibilityLabel="Project name" onChangeText={setProjectName} style={styles.input} value={projectName} />
              <Text style={styles.label}>Category</Text><TextInput accessibilityLabel="Category" onChangeText={setCategory} style={styles.input} value={category} />
              <Text style={styles.label}>Subcategory</Text><TextInput accessibilityLabel="Subcategory" onChangeText={setSubcategory} style={styles.input} value={subcategory} />
              <Text style={styles.label}>Location</Text><TextInput accessibilityLabel="Tender location" onChangeText={setLocation} style={styles.input} value={location} />
              <Text style={styles.label}>Quantity</Text><TextInput accessibilityLabel="Tender quantity" onChangeText={setQuantity} style={styles.input} value={quantity} />
              <Text style={styles.label}>Quote deadline</Text><TextInput accessibilityLabel="Quote deadline in YYYY-MM-DD format" onChangeText={setClosingDate} placeholder="YYYY-MM-DD" style={styles.input} value={closingDate} />
              <Pressable accessibilityLabel="Submit tender" accessibilityRole="button" onPress={handleTenderCreate} style={styles.button}><Text style={styles.buttonText}>Submit tender</Text></Pressable>
            </View>}
            {tenderMessage && <Text accessibilityLiveRegion="polite" style={styles.error}>{tenderMessage}</Text>}
            <Text style={styles.label}>My tenders</Text>
            {tenders.length === 0 ? <Text style={styles.description}>No tenders available.</Text> : tenders.map((tender) => (
              <Pressable accessibilityLabel={`Open tender ${tender.reference}`} accessibilityRole="button" key={tender.id} onPress={() => handleTenderPress(tender.id)} style={styles.tenderRow}>
                <Text style={styles.tenderReference}>{tender.reference}</Text>
                <Text style={styles.description}>{tender.status}</Text>
              </Pressable>
            ))}
            {tenderError && <Text accessibilityLiveRegion="polite" style={styles.error}>{tenderError}</Text>}
            {tenderDetail && <Text style={styles.description}>{tenderDetail.unlocked ? 'Full tender access confirmed.' : 'Tender summary only. Unlock is required for full details.'}</Text>}
            {tenderDetail && !tenderDetail.unlocked && <Pressable accessibilityLabel="Unlock tender details" accessibilityRole="button" onPress={handleUnlock} style={styles.button}><Text style={styles.buttonText}>Unlock full details</Text></Pressable>}
            {unlockMessage && <Text accessibilityLiveRegion="polite" style={styles.error}>{unlockMessage}</Text>}
            {tenderDetail && <Text style={styles.label}>Quotes</Text>}
            {tenderDetail && (quotes.length === 0 ? <Text style={styles.description}>No quotes available.</Text> : quotes.map((quote) => (
              <View key={quote.id} style={styles.tenderRow}>
                <Text style={styles.description}>{quote.reference} · {quote.status}</Text>
                {quote.status === 'SUBMITTED' && <Pressable accessibilityLabel={`Accept quote ${quote.reference}`} accessibilityRole="button" onPress={() => handleQuoteAccept(quote.id)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Accept quote</Text></Pressable>}
                {quote.status === 'ACCEPTED' && <Pressable accessibilityLabel={`Load released contact for ${quote.reference}`} accessibilityRole="button" onPress={() => handleContactLoad(quote.id)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>View released contact</Text></Pressable>}
              </View>
            )))}
            {quoteMessage && <Text accessibilityLiveRegion="polite" style={styles.error}>{quoteMessage}</Text>}
            {releasedContact && <View style={styles.contactCard}><Text style={styles.tenderReference}>{releasedContact.contactName}</Text><Text style={styles.description}>{releasedContact.email}</Text>{releasedContact.contactPhone && <Text style={styles.description}>{releasedContact.contactPhone}</Text>}</View>}
            {tenderDetail && tenderDetail.unlocked && <View style={styles.profileForm}>
              <Text style={styles.label}>Submit quote</Text>
              {(Array.isArray(tenderDetail.tender.items) ? tenderDetail.tender.items : []).map((item) => {
                const tenderItem = item as { id?: unknown; item?: unknown; category?: unknown };
                if (typeof tenderItem.id !== 'string') return null;
                return <View key={tenderItem.id}><Text style={styles.label}>{typeof tenderItem.item === 'string' ? tenderItem.item : typeof tenderItem.category === 'string' ? tenderItem.category : 'Tender item'}</Text><TextInput accessibilityLabel="Quote price in pounds" keyboardType="number-pad" onChangeText={(value) => setQuotePrices((prices) => ({ ...prices, [tenderItem.id as string]: value }))} placeholder="Price in GBP" style={styles.input} value={quotePrices[tenderItem.id] ?? ''} /></View>;
              })}
              <Text style={styles.label}>Lead time in days</Text><TextInput accessibilityLabel="Lead time in days" keyboardType="number-pad" onChangeText={setQuoteLeadTime} style={styles.input} value={quoteLeadTime} />
              <Text style={styles.label}>Delivery information</Text><TextInput accessibilityLabel="Delivery information" multiline onChangeText={setQuoteDeliveryInfo} style={styles.input} value={quoteDeliveryInfo} />
              <Text style={styles.label}>Quote validity in days</Text><TextInput accessibilityLabel="Quote validity in days" keyboardType="number-pad" onChangeText={setQuoteValidityDays} style={styles.input} value={quoteValidityDays} />
              <Pressable accessibilityLabel="Submit quote" accessibilityRole="button" onPress={handleQuoteSubmit} style={styles.button}><Text style={styles.buttonText}>Submit quote</Text></Pressable>
            </View>}
            <Text style={styles.label}>Matched opportunities</Text>
            {opportunities.length === 0 ? <Text style={styles.description}>No matched opportunities available.</Text> : opportunities.map((opportunity) => (
              <Pressable accessibilityLabel={`Open opportunity ${opportunity.reference}`} accessibilityRole="button" key={opportunity.id} onPress={() => handleTenderPress(opportunity.id)} style={styles.tenderRow}>
                <Text style={styles.tenderReference}>{opportunity.reference}</Text>
                <Text style={styles.description}>{opportunity.category} · {opportunity.location}</Text>
                <Text style={styles.description}>{opportunity.unlockFeeGbp === 0 ? 'Launch credit available' : `Unlock fee: £${opportunity.unlockFeeGbp}`}</Text>
              </Pressable>
            ))}
            <Text style={styles.description}>{session.role === 'SUPER_USER' ? 'Super User workspace' : 'User workspace'}</Text>
            <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.button}><Text style={styles.buttonText}>Sign out</Text></Pressable>
          </View>
        ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} style={styles.input} value={email} />
          <Text style={styles.label}>Password</Text>
          <TextInput accessibilityLabel="Password" autoComplete="current-password" onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />
          {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <Pressable accessibilityLabel="Sign in" accessibilityRole="button" disabled={submitting || !email || !password} onPress={handleSignIn} style={styles.button}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>
          <Pressable accessibilityLabel="Create account" accessibilityRole="button" onPress={() => setRegistering((open) => !open)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{registering ? 'Cancel account creation' : 'Create account'}</Text></Pressable>
          {registering && <View style={styles.profileForm}>
            <Text style={styles.label}>First name</Text><TextInput accessibilityLabel="Registration first name" onChangeText={(value) => setRegistration((current) => ({ ...current, firstName: value }))} style={styles.input} value={registration.firstName} />
            <Text style={styles.label}>Last name</Text><TextInput accessibilityLabel="Registration last name" onChangeText={(value) => setRegistration((current) => ({ ...current, lastName: value }))} style={styles.input} value={registration.lastName} />
            <Text style={styles.label}>Company name</Text><TextInput accessibilityLabel="Company name" onChangeText={(value) => setRegistration((current) => ({ ...current, companyName: value }))} style={styles.input} value={registration.companyName} />
            <Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Registration email" autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setRegistration((current) => ({ ...current, email: value }))} style={styles.input} value={registration.email} />
            <Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Registration password" autoComplete="new-password" onChangeText={(value) => setRegistration((current) => ({ ...current, password: value }))} secureTextEntry style={styles.input} value={registration.password} />
            <Pressable accessibilityRole="checkbox" accessibilityLabel="Accept platform terms and privacy policy" accessibilityState={{ checked: termsAccepted }} onPress={() => setTermsAccepted((accepted) => !accepted)} style={styles.termsRow}><Text style={styles.checkbox}>{termsAccepted ? 'X' : ''}</Text><Text style={styles.description}>I accept the platform terms and privacy policy.</Text></Pressable>
            <Pressable accessibilityLabel="Open platform policies" accessibilityRole="link" onPress={() => Linking.openURL(`${process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')}/policies`).catch(() => undefined)}><Text style={styles.policyLink}>Read policies</Text></Pressable>
            <Pressable accessibilityLabel="Submit account registration" accessibilityRole="button" disabled={!termsAccepted} onPress={handleRegister} style={styles.button}><Text style={styles.buttonText}>Create account</Text></Pressable>
          </View>}
          {registrationMessage && <Text accessibilityLiveRegion="polite" style={styles.error}>{registrationMessage}</Text>}
        </View>
        )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#0D1B2A',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  logo: {
    height: 92,
    width: 220,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  eyebrow: {
    color: '#106FB8',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0D1B2A',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 32,
    marginTop: 12,
  },
  description: {
    color: '#6B7280',
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 18,
    marginTop: 8,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6EB1E4',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 32,
    padding: 20,
  },
  label: {
    color: '#0D1B2A', fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF', borderColor: '#6B7280', borderRadius: 8, borderWidth: 1, fontFamily: 'SourceSans3_400Regular', fontSize: 16, marginBottom: 16, padding: 12,
  },
  error: {
    color: '#B23B3B', fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, marginBottom: 12,
  },
  button: {
    alignItems: 'center', backgroundColor: '#106FB8', borderRadius: 8, minHeight: 48, justifyContent: 'center', paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF', fontFamily: 'Montserrat_600SemiBold', fontSize: 16,
  },
  tenderRow: {
    borderBottomColor: '#D1D5DB', borderBottomWidth: 1, paddingVertical: 12,
  },
  tenderReference: {
    color: '#0D1B2A', fontFamily: 'Montserrat_600SemiBold', fontSize: 16,
  },
  secondaryButton: {
    alignSelf: 'flex-start', borderColor: '#0D1B2A', borderRadius: 8, borderWidth: 1, marginTop: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#0D1B2A', fontFamily: 'Montserrat_600SemiBold', fontSize: 14,
  },
  profileForm: {
    marginTop: 16,
  },
  termsRow: {
    alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 10,
  },
  checkbox: {
    alignItems: 'center', borderColor: '#0D1B2A', borderWidth: 1, color: '#0D1B2A', fontFamily: 'Montserrat_600SemiBold', height: 22, justifyContent: 'center', textAlign: 'center', width: 22,
  },
  policyLink: {
    color: '#1D6FB8', fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#FFFFFF', borderColor: '#6EB1E4', borderRadius: 8, borderWidth: 1, marginTop: 12, padding: 16,
  },
  noticeText: {
    color: '#6B7280',
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
});

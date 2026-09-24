import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import {
  finalizeDirectContact,
  finalizeTenderUnlock,
  loadDirectContact,
  loadProfessionalInterest,
  loadTenderDetail,
  registerProfessionalInterest,
  requestDirectContact,
  requestTenderUnlock,
  type MobileTenderDetail,
} from '../api/tenders';
import {
  acceptMobileQuote,
  finalizeQuoteRelease,
  loadReleasedContact,
  loadTenderMessages,
  loadTenderQuotes,
  sendTenderMessage,
  submitMobileQuote,
  type MobileQuoteSummary,
  type MobileReleasedContact,
  type MobileTenderMessage,
} from '../api/quotes';
import { FULL_QUOTE_ACCEPTANCE_COPY, formatUkDate, isSpecifiedItemService } from '../constants';
import type { BuyerCapabilities } from '../api/workspace';
import { Body, Card, Checkbox, Field, Notice, PrimaryButton, SecondaryButton, Title } from '../ui';

type PendingPayment = { kind: 'unlock' | 'release' | 'direct-contact' | 'professional-interest'; tenderId: string; quoteId?: string; paymentId?: string };

export function TenderScreen({
  tenderId,
  capabilities,
  pendingPayment,
  onPendingPayment,
}: {
  tenderId: string;
  capabilities: BuyerCapabilities | null;
  pendingPayment: PendingPayment | null;
  onPendingPayment: (pending: PendingPayment | null) => void;
}) {
  const [detail, setDetail] = useState<MobileTenderDetail | null>(null);
  const [quotes, setQuotes] = useState<MobileQuoteSummary[]>([]);
  const [messages, setMessages] = useState<MobileTenderMessage[]>([]);
  const [messagesUnavailable, setMessagesUnavailable] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [professional, setProfessional] = useState<Record<string, unknown> | null>(null);
  const [direct, setDirect] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quotePrices, setQuotePrices] = useState<Record<string, string>>({});
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [charges, setCharges] = useState<Array<{ description: string; priceGbp: number }>>([]);
  const [leadTime, setLeadTime] = useState('5');
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, string>>({});
  const [secondApprovers, setSecondApprovers] = useState<Record<string, string>>({});
  const [declarations, setDeclarations] = useState<Record<string, boolean>>({});
  const [releasedContact, setReleasedContact] = useState<MobileReleasedContact | null>(null);

  const reload = useCallback(async () => {
    const loaded = await loadTenderDetail(tenderId);
    setDetail(loaded);
    const isBuyer = Array.isArray(loaded.releasedProviders) || Array.isArray((loaded.tender as { awards?: unknown }).awards);
    if (isBuyer) {
      setQuotes(await loadTenderQuotes(tenderId).catch(() => []));
    } else {
      setQuotes([]);
    }
    const thread = await loadTenderMessages(tenderId).catch(() => ({ messages: [] as MobileTenderMessage[], unavailableReason: 'NO_RELEASE' }));
    setMessages(thread.messages ?? []);
    setMessagesUnavailable(thread.unavailableReason === 'NO_RELEASE' ? 'Questions open after contact details are released.' : thread.unavailableReason === 'CLOSED' ? 'Messaging is closed for this tender.' : null);
    setProfessional(await loadProfessionalInterest(tenderId).catch(() => null));
    setDirect(await loadDirectContact(tenderId).catch(() => null));
  }, [tenderId]);

  useEffect(() => {
    reload().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load tender details.'));
  }, [reload]);

  useEffect(() => {
    if (!pendingPayment || pendingPayment.tenderId !== tenderId || !pendingPayment.paymentId) return;
    const pending = pendingPayment;
    async function settle() {
      try {
        if (pending.kind === 'unlock') await finalizeTenderUnlock(tenderId, pending.paymentId!);
        if (pending.kind === 'release' && pending.quoteId) await finalizeQuoteRelease(pending.quoteId, pending.paymentId!);
        if (pending.kind === 'direct-contact') await finalizeDirectContact(tenderId, pending.paymentId!);
        setNotice('Payment return received. Waiting for server confirmation.');
        await reload();
      } catch {
        setNotice('Payment return received. Waiting for server confirmation.');
      } finally {
        onPendingPayment(null);
      }
    }
    void settle();
  }, [onPendingPayment, pendingPayment, reload, tenderId]);

  if (error) return <Notice>{error}</Notice>;
  if (!detail) return <Body>Loading tender…</Body>;

  const tender = detail.tender;
  const reference = String(tender.reference ?? 'Tender');
  const items = Array.isArray(tender.items) ? tender.items as Array<Record<string, unknown>> : [];
  const isBuyer = Array.isArray(detail.releasedProviders) || Array.isArray((tender as { awards?: unknown }).awards);
  const lockedSupplier = !detail.unlocked && !isBuyer;
  const categories = [String(tender.category ?? ''), ...items.map((item) => String(item.category ?? ''))];

  async function openCheckout(url: string | null | undefined, pending: PendingPayment) {
    onPendingPayment(pending);
    if (url) {
      await Linking.openURL(url);
      setNotice('Payment is pending. Return to the app after payment to check server confirmation.');
      return;
    }
    setNotice('Payment is pending server confirmation.');
  }

  async function handleUnlock() {
    setNotice(null);
    try {
      const outcome = await requestTenderUnlock(tenderId);
      if (outcome.status === 'PAYMENT_REQUIRED') {
        await openCheckout(outcome.checkoutUrl, { kind: 'unlock', tenderId, paymentId: outcome.paymentId });
        return;
      }
      setNotice('Tender access has been updated.');
      await reload();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to unlock tender.');
    }
  }

  async function handleAccept(quote: MobileQuoteSummary) {
    setNotice(null);
    try {
      const outcome = await acceptMobileQuote(quote.id, {
        purchaseOrderNumber: purchaseOrders[quote.id]?.trim() ?? '',
        declarationAccepted: declarations[quote.id] === true,
        secondApproverEmail: secondApprovers[quote.id]?.trim() || undefined,
      });
      if (outcome.status === 'PAYMENT_REQUIRED') {
        await openCheckout(outcome.checkoutUrl, { kind: 'release', tenderId, quoteId: quote.id, paymentId: outcome.paymentId });
        return;
      }
      setNotice('Quote accepted. Contact release is being processed by the server.');
      await reload();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to accept quote.');
    }
  }

  async function handleSubmitQuote() {
    setNotice(null);
    const lineItems = items
      .filter((item): item is { id: string } & Record<string, unknown> => typeof item.id === 'string')
      .map((item) => {
        if (unavailable[item.id]) return { tenderItemId: item.id, available: false as const };
        const price = Number(quotePrices[item.id]);
        return Number.isSafeInteger(price) && price > 0
          ? { tenderItemId: item.id, available: true as const, pricingKind: 'LUMP' as const, priceGbp: price }
          : { tenderItemId: item.id, available: false as const };
      });
    try {
      const quote = await submitMobileQuote(tenderId, {
        lineItems,
        charges,
        leadTimeDays: Number(leadTime),
        deliveryDateConfirmed: deliveryConfirmed,
        deliveryInfo,
      });
      setNotice(`Quote ${quote.reference} submitted.`);
      await reload();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to submit quote.');
    }
  }

  return (
    <View>
      <Title>{reference}</Title>
      <Body>{String(tender.category ?? '')} · {String(tender.location ?? '')}</Body>
      <Body>Closes {formatUkDate(String(tender.closingDate ?? ''))} · {String(tender.status ?? '')}</Body>
      {typeof tender.description === 'string' && tender.description ? <Body>{tender.description}</Body> : null}
      {lockedSupplier && <Body>Tender summary only. Unlock is required for full details.</Body>}
      {lockedSupplier && <Body>Unlock fee: £{String((tender as { unlockFeeGbp?: number }).unlockFeeGbp ?? 10)}</Body>}
      {lockedSupplier && <PrimaryButton label="Unlock full details" onPress={() => { void handleUnlock(); }} />}
      {items.map((item) => (
        <Card key={String(item.id)}>
          <Body>{String(item.item ?? item.subcategory ?? item.category ?? 'Item')}</Body>
          <Body>{String(item.quantity ?? '')}</Body>
        </Card>
      ))}
      {detail.buyerContact && (
        <Card>
          <Title>Buyer contact</Title>
          <Body>{detail.buyerContact.contactName}</Body>
          <Body>{detail.buyerContact.email}</Body>
          {detail.buyerContact.contactPhone ? <Body>{detail.buyerContact.contactPhone}</Body> : null}
        </Card>
      )}
      {detail.releasedProviders && detail.releasedProviders.length > 0 && (
        <Card>
          <Title>Released suppliers</Title>
          {detail.releasedProviders.map((provider) => (
            <Body key={provider.id}>{provider.contact.contactName} · {provider.contact.email}</Body>
          ))}
        </Card>
      )}
      {isBuyer && (
        <>
          <Title>Quotes</Title>
          <Body>{FULL_QUOTE_ACCEPTANCE_COPY}</Body>
          {quotes.length === 0 ? <Body>No quotes available.</Body> : quotes.map((quote) => (
            <Card key={quote.id}>
              <Title>{quote.reference}</Title>
              <Body>{quote.status}{quote.expired ? ' · expired' : ''}{typeof quote.priceGbp === 'number' ? ` · £${quote.priceGbp} excl. VAT` : ''}</Body>
              {quote.providerVerificationStatus ? <Body>Verification: {quote.providerVerificationStatus}</Body> : null}
              {quote.independentlyVerified ? <Body>Independently verified</Body> : null}
              {quote.lines?.map((line) => (
                <Body key={line.tenderItemId}>{line.tenderItem?.item ?? line.tenderItem?.subcategory ?? 'Line'} · {line.available ? `£${line.priceGbp ?? line.unitRateGbp ?? 0}` : 'Unavailable'}</Body>
              ))}
              {quote.charges?.map((charge) => <Body key={charge.id}>{charge.description} · £{charge.priceGbp}</Body>)}
              {quote.status === 'SUBMITTED' && !quote.expired && capabilities?.canAward !== false && (
                <>
                  <Field label="Purchase order number" onChangeText={(value) => setPurchaseOrders((current) => ({ ...current, [quote.id]: value }))} value={purchaseOrders[quote.id] ?? ''} />
                  {quote.requiresSecondApprover && <Field autoCapitalize="none" keyboardType="email-address" label="Second approver email" onChangeText={(value) => setSecondApprovers((current) => ({ ...current, [quote.id]: value }))} value={secondApprovers[quote.id] ?? ''} />}
                  {(quote.providerVerificationStatus === 'VERIFIED' || quote.independentlyVerified) && (
                    <Checkbox checked={declarations[quote.id] === true} label="I accept the verification declaration for this provider." onToggle={() => setDeclarations((current) => ({ ...current, [quote.id]: !current[quote.id] }))} />
                  )}
                  <PrimaryButton label={`Accept full quote · £${quote.releaseFeeGbp ?? 10} excl. VAT`} onPress={() => { void handleAccept(quote); }} />
                </>
              )}
              {quote.status === 'ACCEPTED' && (
                <SecondaryButton label="View released contact" onPress={() => { loadReleasedContact(quote.id).then(setReleasedContact).catch((reason) => setNotice(reason instanceof Error ? reason.message : 'Contact details are not available.')); }} />
              )}
            </Card>
          ))}
          {releasedContact && <Card><Title>{releasedContact.contactName}</Title><Body>{releasedContact.email}</Body>{releasedContact.contactPhone ? <Body>{releasedContact.contactPhone}</Body> : null}</Card>}
        </>
      )}
      {detail.unlocked && !isBuyer && (
        <Card>
          <Title>Submit quote</Title>
          {items.filter((item): item is { id: string } & Record<string, unknown> => typeof item.id === 'string').map((item) => (
            <View key={item.id}>
              <Body>{String(item.item ?? item.subcategory ?? 'Tender item')}</Body>
              <Checkbox checked={unavailable[item.id] === true} label="Not available" onToggle={() => setUnavailable((current) => ({ ...current, [item.id]: !current[item.id] }))} />
              {!unavailable[item.id] && <Field keyboardType="number-pad" label={isSpecifiedItemService(String(item.category)) ? 'Lump price in GBP' : 'Price in GBP'} onChangeText={(value) => setQuotePrices((current) => ({ ...current, [item.id]: value }))} value={quotePrices[item.id] ?? ''} />}
            </View>
          ))}
          <Field keyboardType="number-pad" label="Lead time in days" onChangeText={setLeadTime} value={leadTime} />
          <Field label="Delivery information" multiline onChangeText={setDeliveryInfo} value={deliveryInfo} />
          <Checkbox checked={deliveryConfirmed} label="Delivery date confirmed" onToggle={() => setDeliveryConfirmed((value) => !value)} />
          <Field label="Extra charge description" onChangeText={setChargeDescription} value={chargeDescription} />
          <Field keyboardType="number-pad" label="Extra charge GBP" onChangeText={setChargeAmount} value={chargeAmount} />
          <SecondaryButton label="Add charge" onPress={() => {
            const priceGbp = Number(chargeAmount);
            if (!chargeDescription.trim() || !Number.isSafeInteger(priceGbp) || priceGbp <= 0) return;
            setCharges((current) => [...current, { description: chargeDescription.trim(), priceGbp }]);
            setChargeDescription('');
            setChargeAmount('');
          }} />
          {charges.map((charge) => <Body key={`${charge.description}-${charge.priceGbp}`}>{charge.description} · £{charge.priceGbp}</Body>)}
          <PrimaryButton label="Submit quote" onPress={() => { void handleSubmitQuote(); }} />
        </Card>
      )}
      {professional && (professional.available === true || Array.isArray(professional.interests)) && (
        <Card>
          <Title>Professional interest</Title>
          {Array.isArray(professional.interests)
            ? (professional.interests as Array<{ id: string; contact?: { contactName: string; email: string } }>).map((interest) => <Body key={interest.id}>{interest.contact?.contactName} · {interest.contact?.email}</Body>)
            : (
              <>
                <Body>{professional.registered ? 'Registered.' : `Fee £${String(professional.feeGbp ?? 10)}`}</Body>
                {professional.contact && typeof professional.contact === 'object' ? <Body>{JSON.stringify(professional.contact)}</Body> : null}
                {!professional.registered && <SecondaryButton label="Register professional interest" onPress={() => {
                  registerProfessionalInterest(tenderId).then(async (outcome) => {
                    if (outcome.status === 'PAYMENT_REQUIRED') await openCheckout(outcome.checkoutUrl, { kind: 'professional-interest', tenderId, paymentId: outcome.paymentId });
                    else { setNotice('Professional interest registered.'); await reload(); }
                  }).catch((reason) => setNotice(reason instanceof Error ? reason.message : 'Unable to register professional interest.'));
                }} />}
              </>
            )}
        </Card>
      )}
      {direct && (direct.available === true || Array.isArray(direct.contacts)) && (
        <Card>
          <Title>Direct contact</Title>
          {Array.isArray(direct.contacts)
            ? (direct.contacts as Array<{ id: string; contact?: { contactName: string; email: string } }>).map((entry) => <Body key={entry.id}>{entry.contact?.contactName} · {entry.contact?.email}</Body>)
            : (
              <>
                <Body>{direct.released ? 'Contact released.' : `Fee £${String(direct.feeGbp ?? 10)}`}</Body>
                {!direct.released && <SecondaryButton label="Request direct contact" onPress={() => {
                  requestDirectContact(tenderId).then(async (outcome) => {
                    if (outcome.status === 'PAYMENT_REQUIRED') await openCheckout(outcome.checkoutUrl, { kind: 'direct-contact', tenderId, paymentId: outcome.paymentId });
                    else { setNotice('Direct contact released.'); await reload(); }
                  }).catch((reason) => setNotice(reason instanceof Error ? reason.message : 'Unable to request direct contact.'));
                }} />}
              </>
            )}
        </Card>
      )}
      <Card>
        <Title>Messages</Title>
        {messagesUnavailable ? <Body>{messagesUnavailable}</Body> : messages.map((message) => (
          <Body key={message.id}>{message.isOwn ? 'You' : message.senderRole ?? 'Counterparty'} · {message.body}</Body>
        ))}
        {!messagesUnavailable && (
          <>
            <Field label="Message" multiline onChangeText={setMessageBody} value={messageBody} />
            <PrimaryButton label="Send message" onPress={() => {
              sendTenderMessage(tenderId, messageBody.trim()).then(async () => {
                setMessageBody('');
                await reload();
              }).catch((reason) => setNotice(reason instanceof Error ? reason.message : 'Unable to send the message.'));
            }} />
          </>
        )}
      </Card>
      {categories.some((value) => value.toLowerCase().includes('contractor') || value.toLowerCase().includes('professional')) && (
        <Body>Site-visit contact is released after unlock for contractor and professional packages.</Body>
      )}
      <Notice>{notice}</Notice>
    </View>
  );
}

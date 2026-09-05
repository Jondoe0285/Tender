'use client';

import { Suspense, useEffect, useState, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Combobox } from '@/components/ui/Combobox';
import { Stepper, type WizardStep } from '@/components/ui/Stepper';
import { Label, Input, Select, Textarea, FieldGroup } from '@/components/ui/Field';
import { REQUIREMENT_OPTIONS, SERVICE_CATALOG, type ServiceName } from '@/lib/categories';
import { buildSafeAttachmentName } from '@/lib/attachment-utils';
import { getModerationMessage, stripDetectedContactDetails } from '@/lib/moderation';

function getServiceSenseCheck(service: string | undefined, quantityValue: string, quantityUnit: string): { quantityError?: string; unitError?: string; message?: string } {
  const normalisedService = String(service ?? '').trim().toLowerCase();
  const hasValue = quantityValue.trim().length > 0;
  const hasUnit = Boolean(quantityUnit && quantityUnit.trim().length > 0);

  if (!normalisedService) return {};

  if (normalisedService.includes('professional')) {
    if (!hasValue) return { quantityError: 'Enter a number of days or weeks for this professional service.' };
    if (!/\b(days?|weeks?)\b/i.test(quantityUnit)) {
      return { unitError: 'Select a duration unit such as days or weeks.' };
    }
    return { message: 'Professional services should be described by duration.' };
  }

  if (normalisedService.includes('material') || normalisedService.includes('waste')) {
    if (!hasValue) return { quantityError: 'Enter a quantity for this material or waste requirement.' };
    if (!hasUnit) return { unitError: 'Select a unit for this material or waste requirement.' };
    return { message: 'Materials and waste services should be specified by quantity and unit.' };
  }

  if (normalisedService.includes('ground') || normalisedService.includes('civil') || normalisedService.includes('construction') || normalisedService.includes('contractor')) {
    if (hasValue || hasUnit) {
      return { quantityError: 'Groundworks and construction services should not include a number or a unit unless the requirement is specifically itemised.' };
    }
    return { message: 'Groundworks should be described by scope rather than quantity units.' };
  }

  if (normalisedService.includes('plant')) {
    if (!hasValue) return { quantityError: 'Enter a hire duration or quantity for this plant hire requirement.' };
    if (!/\b(days?|weeks?|months?)\b/i.test(quantityUnit)) {
      return { unitError: 'Select a hire duration unit such as days or weeks.' };
    }
    return { message: 'Plant hire should include the hire duration.' };
  }

  return {};
}

const QUANTITY_UNITS = ['units', 'tonnes', 'bags', 'pallets', 'm³', 'skips', 'days', 'weeks'];

const STEPS: WizardStep[] = [
  { id: 1, label: 'Project Details' },
  { id: 2, label: 'Tender Packages' },
  { id: 3, label: 'Additional Requirements' },
  { id: 4, label: 'Upload Files' },
  { id: 5, label: 'Review & Submit' },
];

type FormState = {
  projectName: string;
  selectedServices: string[];
  category: ServiceName | string;
  subcategory: string;
  item: string;
  location: string;
  requirements: string[];
  quantityValue: string;
  quantityUnit: string;
  description: string;
  primaryItemDescription: string;
  urgency: string;
  closingDate: string;
  supplyDate: string;
  items: TenderItem[];
};

type TenderItem = {
  id: string;
  category: ServiceName | string;
  subcategory: string;
  item: string;
  quantityValue: string;
  quantityUnit: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  projectName: '',
  selectedServices: [],
  category: '',
  subcategory: '',
  item: '',
  location: '',
  requirements: [],
  quantityValue: '',
  quantityUnit: '',
  description: '',
  primaryItemDescription: '',
  urgency: '',
  closingDate: '',
  supplyDate: '',
  items: [],
};

const DRAFT_KEY = 'tradeTender.newTenderDraft.v1';

function closingDatePreset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function splitQuantity(quantity: string): { quantityValue: string; quantityUnit: string } {
  const unit = QUANTITY_UNITS.find((candidate) => quantity.endsWith(` ${candidate}`));
  return unit ? { quantityValue: quantity.slice(0, -unit.length).trim(), quantityUnit: unit } : { quantityValue: quantity, quantityUnit: 'units' };
}

function packageLabels(service: string): { provision: string; detail: string } {
  if (service === 'Materials') return { provision: 'Material category', detail: 'Material detail (optional)' };
  if (service === 'Waste') return { provision: 'Waste type', detail: 'Waste detail (optional)' };
  if (service === 'Plant Hire') return { provision: 'Plant category', detail: 'Plant detail (optional)' };
  return { provision: 'Service provision', detail: 'Detailed provision (optional)' };
}

export default function NewTenderPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-site-white p-6 text-sm text-concrete-grey">Loading tender builder...</main>}>
      <NewTenderForm />
    </Suspense>
  );
}

function NewTenderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFrom = searchParams.get('copyFrom');
  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [activePackageIndex, setActivePackageIndex] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [packagesNeedReset, setPackagesNeedReset] = useState(true);
  const [catalog, setCatalog] = useState<Record<string, Record<string, string[]>>>(() => Object.fromEntries(Object.entries(SERVICE_CATALOG).map(([service, categories]) => [service, Object.fromEntries(Object.entries(categories).map(([name, items]) => [name, [...items]]))])));

  const hasDetectedContactDetails = [
    getModerationMessage('description', form.description),
    ...form.items.map((item) => getModerationMessage(`item ${item.category}`, item.description)),
  ].some(Boolean);
  const activeCategory = activePackageIndex === 0
    ? form.category
    : form.items[activePackageIndex - 1]?.category ?? form.category;
  const activePackageLabels = packageLabels(activeCategory);

  // Restore a saved draft after mount only, so server and first client render still match.
  useEffect(() => {
    if (copyFrom) return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        setForm((prev) => ({ ...prev, ...JSON.parse(raw) }));
        setDraftRestored(true);
        setPackagesNeedReset(false);
      }
    } catch {
      // Corrupt or unavailable storage — start with a blank form.
    }
  }, [copyFrom]);

  useEffect(() => {
    if (!copyFrom) return;
    const sourceTenderId = copyFrom;
    let cancelled = false;

    async function loadTenderForRetender() {
      const response = await fetch(`/api/tenders/${encodeURIComponent(sourceTenderId)}`);
      if (!response.ok) throw new Error('Unable to load tender');
      const { tender } = await response.json() as { tender: { category: string; subcategory: string; item: string | null; location: string; quantity: string; urgency: string; closingDate: string; supplyDate: string | null; requirements: string; description: string; items: { id: string; category: string; subcategory: string; item: string | null; quantity: string; description: string }[]; attachments: { id: string; fileName: string; mimeType: string }[] } };
      const tenderItems = tender.items.length > 0 ? tender.items : [{ id: 'primary', category: tender.category, subcategory: tender.subcategory, item: tender.item, quantity: tender.quantity, description: tender.description }];
      const primaryItem = tenderItems[0]!;
      const primaryQuantity = splitQuantity(primaryItem.quantity);
      const attachments = await Promise.all(tender.attachments.map(async (attachment) => {
        const attachmentResponse = await fetch(`/api/tenders/${encodeURIComponent(sourceTenderId)}/attachments/${encodeURIComponent(attachment.id)}`);
        if (!attachmentResponse.ok) throw new Error('Unable to copy tender attachments');
        return new File([await attachmentResponse.blob()], attachment.fileName, { type: attachment.mimeType });
      }));
      if (cancelled) return;
      setForm({
        ...EMPTY_FORM,
        projectName: `${primaryItem.subcategory} re-tender`,
        selectedServices: [...new Set(tenderItems.map((item) => item.category))],
        category: primaryItem.category,
        subcategory: primaryItem.subcategory,
        item: primaryItem.item ?? '',
        location: tender.location,
        quantityValue: primaryQuantity.quantityValue,
        quantityUnit: primaryQuantity.quantityUnit,
        description: tender.description,
        primaryItemDescription: primaryItem.description,
        urgency: tender.urgency,
        closingDate: '',
        supplyDate: tender.supplyDate?.slice(0, 10) ?? '',
        requirements: tender.requirements.split(',').filter(Boolean),
        items: tenderItems.slice(1).map((item) => {
          const quantity = splitQuantity(item.quantity);
          return { id: item.id, category: item.category, subcategory: item.subcategory, item: item.item ?? '', quantityValue: quantity.quantityValue, quantityUnit: quantity.quantityUnit, description: item.description };
        }),
      });
      setFiles(attachments);
      setPackagesNeedReset(false);
    }

    loadTenderForRetender().catch(() => setError('We could not prepare this tender for re-tendering.'));
    return () => { cancelled = true; };
  }, [copyFrom]);

  useEffect(() => {
    fetch('/api/categories').then((response) => response.ok ? response.json() : null).then((data: { catalog?: Record<string, Record<string, string[]>> } | null) => {
      if (data?.catalog) setCatalog(data.catalog);
    }).catch(() => undefined);
  }, []);

  // Auto-save progress as the Client works through the form (files are never persisted here).
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        // Autosave is a convenience only — ignore storage failures.
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRequirement(option: string) {
    setForm((prev) => ({
      ...prev,
      requirements: prev.requirements.includes(option)
        ? prev.requirements.filter((item) => item !== option)
        : [...prev.requirements, option],
    }));
  }

  function toggleService(service: string) {
    setPackagesNeedReset(true);
    setForm((current) => ({
      ...current,
      selectedServices: current.selectedServices.includes(service)
        ? current.selectedServices.filter((item) => item !== service)
        : [...current.selectedServices, service],
    }));
  }

  function updateItem<K extends keyof TenderItem>(index: number, key: K, value: TenderItem[K]) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addAnotherItem() {
    const category = activeCategory || form.selectedServices[0] || '';
    setActivePackageIndex(form.items.length + 1);
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          category,
          subcategory: '',
          item: '',
          quantityValue: '',
          quantityUnit: '',
          description: '',
        },
      ],
    }));
  }

  function validateStep(targetStep: number): boolean {
    const next: Record<string, string> = {};
    if (targetStep === 1) {
      if (form.projectName.trim().length < 3) next.projectName = 'Enter a project name (at least 3 characters).';
      if (form.selectedServices.length === 0) next.selectedServices = 'Select at least one service group to tender.';
      if (!form.urgency) next.urgency = 'Select the project urgency.';
      if (!/\b(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i.test(form.location)) {
        next.location = 'Enter a valid UK jobsite or delivery postcode.';
      }
      if (!form.closingDate) next.closingDate = 'Select a quote closing date.';
      else if (new Date(form.closingDate).getTime() <= Date.now()) next.closingDate = 'Closing date must be in the future.';
      const descriptionWarning = getModerationMessage('description', form.description);
      if (descriptionWarning) next.description = descriptionWarning;
    }
    if (targetStep === 2) {
      if (activePackageIndex === 0) {
        if (!form.subcategory) next.subcategory = 'Select a service category.';

        const packageSenseCheck = getServiceSenseCheck(form.category, form.quantityValue, form.quantityUnit);
        if (packageSenseCheck.quantityError) next.quantityValue = packageSenseCheck.quantityError;
        if (packageSenseCheck.unitError) next.quantityUnit = packageSenseCheck.unitError;

        if (!packageSenseCheck.quantityError && !packageSenseCheck.unitError) {
          if (!form.quantityValue.trim()) next.quantityValue = 'Enter a quantity.';
          if (!form.quantityUnit) next.quantityUnit = 'Select a unit.';
        }
      } else {
        const item = form.items[activePackageIndex - 1];
        const prefix = `item-${activePackageIndex - 1}-`;
        if (!item?.subcategory) next[`${prefix}subcategory`] = 'Select a service category.';

        const itemSenseCheck = getServiceSenseCheck(item.category, item.quantityValue, item.quantityUnit);
        if (itemSenseCheck.quantityError) next[`${prefix}quantity`] = itemSenseCheck.quantityError;
        if (itemSenseCheck.unitError) next[`${prefix}unit`] = itemSenseCheck.unitError;

        if (!itemSenseCheck.quantityError && !itemSenseCheck.unitError) {
          if (!item?.quantityValue.trim()) next[`${prefix}quantity`] = 'Enter a quantity.';
          if (!item?.quantityUnit) next[`${prefix}unit`] = 'Select a unit.';
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step === 1 && packagesNeedReset) {
      const [primaryService, ...additionalServices] = form.selectedServices;
      setForm((current) => ({
        ...current,
        category: primaryService,
        subcategory: '',
        item: '',
        quantityValue: '',
        quantityUnit: '',
        items: additionalServices.map((service, index) => ({
          id: `${Date.now()}-${index}`,
          category: service,
          subcategory: '',
          item: '',
          quantityValue: '',
          quantityUnit: '',
          description: '',
        })),
      }));
      setPackagesNeedReset(false);
    }
    if (step === 2 && activePackageIndex < form.items.length) {
      setActivePackageIndex((current) => current + 1);
      return;
    }
    const nextStep = Math.min(step + 1, STEPS.length);
    setStep(nextStep);
    setFurthestStep((current) => Math.max(current, nextStep));
  }

  function fastTravel(targetStep: number) {
    setErrors({});
    setStep(targetStep);
  }

  function goBack() {
    setErrors({});
    if (step === 2 && activePackageIndex > 0) {
      setActivePackageIndex((current) => current - 1);
      return;
    }
    setStep((current) => Math.max(current - 1, 1));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    event.target.value = '';
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((file) => file.name !== name));
  }

  function removeDetectedContactDetails() {
    setForm((prev) => ({
      ...prev,
      description: stripDetectedContactDetails(prev.description),
      items: prev.items.map((item) => ({
        ...item,
        description: stripDetectedContactDetails(item.description),
      })),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.description;
      return next;
    });
  }

  async function prepareAttachments() {
    return Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });

        return {
          name: buildSafeAttachmentName(file.name),
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataBase64: btoa(binary),
        };
      })
    );
  }

  async function handleSubmit() {
    const requiredStepsValid = [1, 2, 3].every((targetStep) => validateStep(targetStep));
    if (!requiredStepsValid) {
      setError('Some required details are missing — please check the earlier steps.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: form.projectName,
          category: form.category,
          subcategory: form.subcategory,
          item: form.item,
          location: form.location,
          quantity: `${form.quantityValue} ${form.quantityUnit}`.trim(),
          itemDescription: form.primaryItemDescription,
          urgency: form.urgency,
          closingDate: form.closingDate,
          supplyDate: form.supplyDate || undefined,
          requirements: form.requirements,
          description: form.description,
          items: form.items.map((item) => ({
            category: item.category,
            subcategory: item.subcategory,
            item: item.item,
            quantity: `${item.quantityValue} ${item.quantityUnit}`.trim(),
            description: item.description,
          })),
          attachments: await prepareAttachments(),
        }),
      });

      const responseBody = await response.json().catch(() => null) as {
        error?: string;
        issues?: { fieldErrors?: Record<string, string[]> };
        reasons?: string[];
      } | null;

      if (!response.ok) {
        const fieldErrors = responseBody?.issues?.fieldErrors ?? {};
        const firstFieldError = Object.values(fieldErrors).flat()[0];
        setError(firstFieldError ?? responseBody?.reasons?.join(' ') ?? responseBody?.error ?? `Unable to save this tender (HTTP ${response.status}).`);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to clean up if storage was never available.
      }
      router.push('/client/tenders');
      router.refresh();
    } catch {
      setSubmitting(false);
      setError('We could not reach Trade Tender. Check your connection and try again.');
    }
  }

  return (
    <AppShell role="client" title="Create Tender">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-concrete-grey">
          {copyFrom ? 'Review the copied tender details, set a new quote deadline, and submit it as a new tender.' : 'Complete the project details, then provide requirements for each selected service. Providers only see full details once they unlock your tender.'}
        </p>

        <Stepper steps={STEPS} currentStep={step} furthestStep={furthestStep} onStepClick={fastTravel} />

        {draftRestored && (
          <Card className="mb-6 flex items-center justify-between gap-4 border-l-4 border-l-steel-blue">
            <p className="text-sm text-concrete-grey">We restored your saved progress from last time.</p>
            <button
              type="button"
              onClick={() => setDraftRestored(false)}
              className="text-sm font-semibold text-steel-blue hover:text-foundation-navy"
            >
              Dismiss
            </button>
          </Card>
        )}

        {step === 1 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Project Details</h2>
            <FieldGroup>
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Side extension and external works"
                value={form.projectName}
                onChange={(event) => update('projectName', event.target.value)}
              />
              {errors.projectName && <p className="text-sm font-semibold text-attention">{errors.projectName}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="location">Jobsite or delivery postcode</Label>
              <Input id="location" placeholder="e.g. LS10 2AB" value={form.location} onChange={(event) => update('location', event.target.value)} />
              <p className="text-xs text-concrete-grey">Used to notify only Providers that cover this area.</p>
              {errors.location && <p className="text-sm font-semibold text-attention">{errors.location}</p>}
            </FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="urgency">Project urgency</Label>
                <Select id="urgency" value={form.urgency} onChange={(event) => update('urgency', event.target.value)}>
                  <option value="" disabled>Select urgency</option>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="flexible">Flexible</option>
                </Select>
                {errors.urgency && <p className="text-sm font-semibold text-attention">{errors.urgency}</p>}
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="supply-date">Planned works start date (optional)</Label>
                <Input id="supply-date" type="date" value={form.supplyDate} onChange={(event) => update('supplyDate', event.target.value)} />
                {errors.supplyDate && <p className="text-sm font-semibold text-attention">{errors.supplyDate}</p>}
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="closing-date">Quote deadline</Label>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => update('closingDate', closingDatePreset(days))}
                    className="rounded-md border border-steel-blue/40 px-3 py-1.5 text-xs font-semibold text-steel-blue hover:bg-steel-blue/5"
                  >
                    In {days} days
                  </button>
                ))}
              </div>
              <Input
                id="closing-date"
                type="date"
                value={form.closingDate}
                onChange={(event) => update('closingDate', event.target.value)}
              />
              {errors.closingDate && <p className="text-sm font-semibold text-attention">{errors.closingDate}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label>Services to tender</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.keys(catalog).map((service) => (
                  <label key={service} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-foundation-navy">
                    <input type="checkbox" checked={form.selectedServices.includes(service)} onChange={() => toggleService(service)} className="h-4 w-4 accent-safety-amber" />
                    {service}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-concrete-grey">Each selected service becomes a tender package. Only matching Providers and contractors in this area receive the relevant opportunity.</p>
              {errors.selectedServices && <p className="text-sm font-semibold text-attention">{errors.selectedServices}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="description">Additional information (optional)</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Add a project overview, site constraints, or information relevant to every tender package. Do not include phone numbers, email addresses, company names, or direct contact instructions."
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
              />
              <p className="text-xs text-concrete-grey">Keep project details in-platform. Do not include any phone numbers, email addresses, business names, or instructions to contact outside Trade Tender.</p>
              {errors.description && <p className="text-sm font-semibold text-attention">{errors.description}</p>}
            </FieldGroup>
          </Card>
        )}

        {step === 2 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">{activeCategory} Requirements</h2>
            <p className="text-sm text-concrete-grey">Complete this service package before moving to the next selected service.</p>
            {activePackageIndex !== 0 && activeCategory === form.category && (
              <button
                type="button"
                onClick={() => { setActivePackageIndex(0); setErrors({}); }}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:border-steel-blue"
              >
                <span><span className="font-semibold text-foundation-navy">Package 1: {form.item || form.subcategory || 'Untitled package'}</span><span className="block text-xs text-concrete-grey">{form.category} {form.quantityValue && `${form.quantityValue} ${form.quantityUnit}`}</span></span>
                <span className="text-xs font-semibold text-steel-blue">Edit</span>
              </button>
            )}
            {activePackageIndex === 0 && <><FieldGroup>
              <Label htmlFor="subcategory">{activePackageLabels.provision}</Label>
              <Combobox
                id="subcategory"
                name="subcategory"
                value={form.subcategory}
                onChange={(value) => update('subcategory', value)}
                disabled={!form.category}
                placeholder={form.category ? 'Search categories…' : 'Choose a service first'}
                groups={form.category ? [{ label: form.category, options: Object.keys(catalog[form.category] ?? {}) }] : []}
              />
              {errors.subcategory && <p className="text-sm font-semibold text-attention">{errors.subcategory}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="item">{activePackageLabels.detail}</Label>
              <Combobox id="item" name="item" value={form.item} onChange={(value) => update('item', value)} disabled={!form.subcategory} placeholder={form.subcategory ? 'Search detailed provisions…' : 'Choose a service provision first'} groups={form.category ? [{ label: form.subcategory, options: catalog[form.category]?.[form.subcategory] ?? [] }] : []} />
              {errors.item && <p className="text-sm font-semibold text-attention">{errors.item}</p>}
            </FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="quantity-value">Quantity</Label>
                <Input id="quantity-value" placeholder={form.category?.toLowerCase().includes('plant') || form.category?.toLowerCase().includes('professional') ? 'e.g. 7 days' : 'e.g. 4,000'} value={form.quantityValue} onChange={(event) => update('quantityValue', event.target.value)} />
                {errors.quantityValue && <p className="text-sm font-semibold text-attention">{errors.quantityValue}</p>}
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="quantity-unit">Unit</Label>
                <Select id="quantity-unit" value={form.quantityUnit} onChange={(event) => update('quantityUnit', event.target.value)}>
                  <option value="" disabled>Select a unit</option>
                  {QUANTITY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </Select>
                {errors.quantityUnit && <p className="text-sm font-semibold text-attention">{errors.quantityUnit}</p>}
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="primary-item-description">Item specification (optional)</Label>
              <Textarea id="primary-item-description" rows={3} value={form.primaryItemDescription} placeholder="Add the specification or delivery requirement for this item." onChange={(event) => update('primaryItemDescription', event.target.value)} />
              {errors.primaryItemDescription && <p className="text-xs font-semibold text-attention">{errors.primaryItemDescription}</p>}
            </FieldGroup>
            </>}
            <div className="border-t border-slate-200 pt-5 sm:col-span-2">
              <p className="text-xs text-concrete-grey">Package {activePackageIndex + 1} of {form.selectedServices.length}</p>
              {form.items.length > 0 && (
                <div className="mt-5 flex flex-col gap-4">
                  {form.items.map((item, index) => {
                    const isActive = index === activePackageIndex - 1;
                    if (!isActive && item.category === activeCategory) {
                      return (
                        <button key={item.id} type="button" onClick={() => { setActivePackageIndex(index + 1); setErrors({}); }} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:border-steel-blue">
                          <span><span className="font-semibold text-foundation-navy">Package {index + 2}: {item.item || item.subcategory || 'Untitled package'}</span><span className="block text-xs text-concrete-grey">{item.category} {item.quantityValue && `${item.quantityValue} ${item.quantityUnit}`}</span></span>
                          <span className="text-xs font-semibold text-steel-blue">Edit</span>
                        </button>
                      );
                    }
                    if (isActive) return (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foundation-navy">{item.category}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-subcategory`}>{packageLabels(item.category).provision}</Label>
                          <Combobox
                            id={`item-${index}-subcategory`}
                            name={`item-${index}-subcategory-input`}
                            value={item.subcategory}
                            onChange={(value) => updateItem(index, 'subcategory', value)}
                            disabled={!item.category}
                            placeholder={item.category ? 'Search categories…' : 'Choose a service first'}
                            groups={item.category ? [{ label: item.category, options: Object.keys(catalog[item.category] ?? {}) }] : []}
                          />
                          {errors[`item-${index}-subcategory`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-subcategory`]}</p>}
                        </FieldGroup>
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-item`}>{packageLabels(item.category).detail}</Label>
                          <Combobox
                            id={`item-${index}-item`}
                            name={`item-${index}-item-input`}
                            value={item.item}
                            onChange={(value) => updateItem(index, 'item', value)}
                            disabled={!item.subcategory}
                            placeholder={item.subcategory ? 'Search detailed provisions…' : 'Choose a service provision first'}
                            groups={item.category ? [{ label: item.subcategory, options: catalog[item.category]?.[item.subcategory] ?? [] }] : []}
                          />
                          {errors[`item-${index}-item`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-item`]}</p>}
                        </FieldGroup>
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-quantity`}>Quantity</Label>
                          <Input id={`item-${index}-quantity`} value={item.quantityValue} placeholder={item.category?.toLowerCase().includes('plant') || item.category?.toLowerCase().includes('professional') ? 'e.g. 7 days' : 'e.g. 20'} onChange={(event) => updateItem(index, 'quantityValue', event.target.value)} />
                          {errors[`item-${index}-quantity`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-quantity`]}</p>}
                        </FieldGroup>
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-unit`}>Unit</Label>
                          <Select id={`item-${index}-unit`} value={item.quantityUnit} onChange={(event) => updateItem(index, 'quantityUnit', event.target.value)}>
                            <option value="" disabled>Select a unit</option>
                            {QUANTITY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                          </Select>
                          {errors[`item-${index}-unit`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-unit`]}</p>}
                        </FieldGroup>
                      </div>
                      <FieldGroup>
                        <Label htmlFor={`item-${index}-description`}>Item specification (optional)</Label>
                        <Textarea id={`item-${index}-description`} rows={3} value={item.description} placeholder="Add the specification or delivery requirement for this item." onChange={(event) => updateItem(index, 'description', event.target.value)} />
                        {errors[`item-${index}-description`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-description`]}</p>}
                      </FieldGroup>
                    </div>
                    );
                    return null;
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={addAnotherItem}
                className="mt-5 inline-flex items-center justify-center self-start rounded-md border border-steel-blue/40 bg-steel-blue/5 px-3 py-2 text-xs font-semibold text-steel-blue hover:bg-steel-blue/10"
              >
                Add another item
              </button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Additional Requirements</h2>
            <fieldset>
              <legend className="text-sm font-semibold text-foundation-navy">Site, delivery and supporting requirements</legend>
              <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {REQUIREMENT_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-3 text-sm text-concrete-grey">
                    <input
                      type="checkbox"
                      checked={form.requirements.includes(option)}
                      onChange={() => toggleRequirement(option)}
                      className="h-4 w-4 accent-safety-amber"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        )}

        {step === 4 && (
          <Card className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Upload Files (optional)</h2>
            <p className="text-sm text-concrete-grey">
              Attach drawings, specifications, or site photos. These files are saved with the tender, but
              Retailers cannot preview or download them until they unlock the full detail set.
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-steel-blue">
              <span className="text-sm font-semibold text-steel-blue">Choose files or drag them here</span>
              <span className="text-xs text-concrete-grey">PDF, Word, or image files</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((file) => (
                  <li key={file.name} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-4 py-2 text-sm">
                    <span className="truncate text-foundation-navy">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="text-xs font-semibold text-attention hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {step === 5 && (
          <Card className="flex flex-col gap-5">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Review &amp; Submit</h2>
            <ReviewSection title="Project Details" onEdit={() => setStep(1)}>
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReviewItem label="Project name" value={form.projectName} />
                <ReviewItem label="Selected services" value={form.selectedServices.join(', ')} />
                <ReviewItem label="Jobsite or delivery postcode" value={form.location} />
                <ReviewItem label="Urgency" value={form.urgency} />
                <ReviewItem label="Closing date" value={form.closingDate} />
                <ReviewItem label="Planned works start date" value={form.supplyDate || 'Not specified'} />
              </dl>
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-concrete-grey">Project information</p>
                <p className="whitespace-pre-line text-sm text-foundation-navy">{form.description || 'None'}</p>
              </div>
            </ReviewSection>
            <ReviewSection title="Tender Packages" onEdit={() => { setActivePackageIndex(0); setStep(2); }}>
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReviewItem label="Tender packages" value={`${form.items.length + 1} package(s)`} />
                <ReviewItem label="Primary quantity" value={`${form.quantityValue} ${form.quantityUnit}`.trim()} />
                <ReviewItem label="Primary specification" value={form.primaryItemDescription || 'None'} />
              </dl>
              {form.items.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2 text-sm text-foundation-navy">
                  {form.items.map((item, index) => <li key={item.id}>{index + 2}. {item.category} / {item.subcategory} &middot; {item.quantityValue} {item.quantityUnit}</li>)}
                </ul>
              )}
            </ReviewSection>
            <ReviewSection title="Additional Requirements" onEdit={() => setStep(3)}>
              <ReviewItem label="Requirements" value={form.requirements.join(', ') || 'None'} />
            </ReviewSection>
            <ReviewSection title="Attachments" onEdit={() => setStep(4)}>
              <ReviewItem label="Files" value={files.length > 0 ? `${files.length} file(s) selected and saved with this tender` : 'None'} />
            </ReviewSection>
            {hasDetectedContactDetails && (
              <div className="rounded-lg border border-attention/40 bg-attention/5 p-4">
                <p className="text-sm font-semibold text-attention">Contact details were found in the tender notes.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStep(1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-foundation-navy hover:bg-slate-50">
                    Edit details
                  </button>
                  <button type="button" onClick={removeDetectedContactDetails} className="rounded-md border border-attention bg-attention/10 px-3 py-2 text-xs font-semibold text-attention hover:bg-attention/15">
                    Remove contact details
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-attention">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/client/tenders" className="text-center text-sm font-semibold text-concrete-grey hover:text-foundation-navy">
            Cancel
          </Link>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {step > 1 && (
              <Button variant="secondary" size="lg" onClick={goBack}>
                Back
              </Button>
            )}
            {step < STEPS.length ? (
              <Button size="lg" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button size="lg" loading={submitting} success={success} onClick={handleSubmit}>
                Submit tender
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-bold text-foundation-navy">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-steel-blue hover:text-foundation-navy">Edit</button>
      </div>
      {children}
    </section>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foundation-navy">{value || '—'}</p>
    </div>
  );
}

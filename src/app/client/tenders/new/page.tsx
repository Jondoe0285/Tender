'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Combobox } from '@/components/ui/Combobox';
import { Stepper, type WizardStep } from '@/components/ui/Stepper';
import { Label, Input, Select, Textarea, FieldGroup } from '@/components/ui/Field';
import { CATEGORIES, REQUIREMENT_OPTIONS, type CategoryName } from '@/lib/categories';

const QUANTITY_UNITS = ['units', 'tonnes', 'bags', 'pallets', 'm³', 'skips', 'days', 'weeks'];

const STEPS: WizardStep[] = [
  { id: 1, label: 'Project Information' },
  { id: 2, label: 'Category Selection' },
  { id: 3, label: 'Location & Access' },
  { id: 4, label: 'Materials / Services' },
  { id: 5, label: 'Schedule' },
  { id: 6, label: 'Upload Files' },
  { id: 7, label: 'Review & Submit' },
];

type FormState = {
  projectName: string;
  budget: string;
  category: CategoryName | '';
  subcategory: string;
  location: string;
  requirements: string[];
  quantityValue: string;
  quantityUnit: string;
  description: string;
  urgency: string;
  closingDate: string;
  items: TenderItem[];
};

type TenderItem = {
  id: string;
  category: CategoryName | '';
  subcategory: string;
  quantityValue: string;
  quantityUnit: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  projectName: '',
  budget: '',
  category: '',
  subcategory: '',
  location: '',
  requirements: [],
  quantityValue: '',
  quantityUnit: '',
  description: '',
  urgency: '',
  closingDate: '',
  items: [],
};

const DRAFT_KEY = 'tradeTender.newTenderDraft.v1';

function closingDatePreset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function NewTenderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore a saved draft after mount only, so server and first client render still match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        setForm((prev) => ({ ...prev, ...JSON.parse(raw) }));
        setDraftRestored(true);
      }
    } catch {
      // Corrupt or unavailable storage — start with a blank form.
    }
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

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `${Date.now()}-${prev.items.length}`, category: '', subcategory: '', quantityValue: '', quantityUnit: '', description: '' },
      ],
    }));
  }

  function updateItem<K extends keyof TenderItem>(index: number, key: K, value: TenderItem[K]) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function validateStep(targetStep: number): boolean {
    const next: Record<string, string> = {};
    if (targetStep === 1 && form.projectName.trim().length < 3) {
      next.projectName = 'Enter a tender name (at least 3 characters).';
    }
    if (targetStep === 2) {
      if (!form.category) next.category = 'Select a category.';
      if (!form.subcategory) next.subcategory = 'Select a subcategory.';
      form.items.forEach((item, index) => {
        if (!item.category) next[`item-${index}-category`] = 'Select a category.';
        if (!item.subcategory) next[`item-${index}-subcategory`] = 'Select a subcategory.';
      });
    }
    if (targetStep === 3 && form.location.trim().length < 2) {
      next.location = 'Enter a delivery or site location.';
    }
    if (targetStep === 4) {
      if (!form.quantityValue.trim()) next.quantityValue = 'Enter a quantity.';
      if (!form.quantityUnit) next.quantityUnit = 'Select a unit.';
      if (form.description.trim().length < 10) next.description = 'Add a short specification (at least 10 characters).';
      form.items.forEach((item, index) => {
        if (!item.quantityValue.trim()) next[`item-${index}-quantity`] = 'Enter a quantity.';
        if (!item.quantityUnit) next[`item-${index}-unit`] = 'Select a unit.';
        if (item.description.trim().length < 10) next[`item-${index}-description`] = 'Add a specification (at least 10 characters).';
      });
    }
    if (targetStep === 5) {
      if (!form.urgency) next.urgency = 'Select urgency.';
      if (!form.closingDate) next.closingDate = 'Select a quote closing date.';
      else if (new Date(form.closingDate).getTime() <= Date.now()) next.closingDate = 'Closing date must be in the future.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length));
  }

  function goBack() {
    setErrors({});
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

  async function handleSubmit() {
    const requiredStepsValid = [1, 2, 3, 4, 5].every((targetStep) => validateStep(targetStep));
    if (!requiredStepsValid) {
      setError('Some required details are missing — please check the earlier steps.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await fetch('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: form.projectName,
        category: form.category,
        subcategory: form.subcategory,
        location: form.location,
        quantity: `${form.quantityValue} ${form.quantityUnit}`.trim(),
        urgency: form.urgency,
        closingDate: form.closingDate,
        budget: form.budget || undefined,
        requirements: form.requirements,
        description: form.description,
        items: form.items.map((item) => ({
          category: item.category,
          subcategory: item.subcategory,
          quantity: `${item.quantityValue} ${item.quantityUnit}`.trim(),
          description: item.description,
        })),
      }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError('Unable to save this tender. Check the form and try again.');
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
  }

  return (
    <AppShell role="client" title="Create Tender">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-concrete-grey">
          Seven quick steps, around 2&ndash;5 minutes. Retailers only see full details once they unlock your tender.
        </p>

        <Stepper steps={STEPS} currentStep={step} />

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
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Project Information</h2>
            <FieldGroup>
              <Label htmlFor="project-name">Tender name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Bricks and blocks for side extension"
                value={form.projectName}
                onChange={(event) => update('projectName', event.target.value)}
              />
              {errors.projectName && <p className="text-sm font-semibold text-attention">{errors.projectName}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="budget">Estimated budget (optional)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                placeholder="GBP"
                value={form.budget}
                onChange={(event) => update('budget', event.target.value)}
              />
            </FieldGroup>
          </Card>
        )}

        {step === 2 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Category Selection</h2>
            <FieldGroup>
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(event) => {
                  update('category', event.target.value as CategoryName);
                  update('subcategory', '');
                }}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {Object.keys(CATEGORIES).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {errors.category && <p className="text-sm font-semibold text-attention">{errors.category}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Combobox
                id="subcategory"
                name="subcategory"
                value={form.subcategory}
                onChange={(value) => update('subcategory', value)}
                disabled={!form.category}
                placeholder={form.category ? 'Search subcategories…' : 'Choose a category first'}
                groups={form.category ? [{ label: form.category, options: [...CATEGORIES[form.category]] }] : []}
              />
              {errors.subcategory && <p className="text-sm font-semibold text-attention">{errors.subcategory}</p>}
            </FieldGroup>
            <div className="border-t border-slate-200 pt-5 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-base font-bold text-foundation-navy">Additional tender items</h3>
                  <p className="mt-1 text-xs text-concrete-grey">Add each material or service you want Retailers to price separately.</p>
                </div>
                <Button type="button" variant="secondary" onClick={addItem}>Add item</Button>
              </div>
              {form.items.length > 0 && (
                <div className="mt-5 flex flex-col gap-4">
                  {form.items.map((item, index) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foundation-navy">Item {index + 2}</p>
                        <button type="button" onClick={() => removeItem(index)} className="text-xs font-semibold text-attention hover:underline">Remove</button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-category`}>Category</Label>
                          <Select
                            id={`item-${index}-category`}
                            value={item.category}
                            onChange={(event) => {
                              updateItem(index, 'category', event.target.value as CategoryName);
                              updateItem(index, 'subcategory', '');
                            }}
                          >
                            <option value="" disabled>Select a category</option>
                            {Object.keys(CATEGORIES).map((option) => <option key={option} value={option}>{option}</option>)}
                          </Select>
                          {errors[`item-${index}-category`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-category`]}</p>}
                        </FieldGroup>
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-subcategory`}>Subcategory</Label>
                          <Combobox
                            id={`item-${index}-subcategory`}
                            name={`item-${index}-subcategory-input`}
                            value={item.subcategory}
                            onChange={(value) => updateItem(index, 'subcategory', value)}
                            disabled={!item.category}
                            placeholder={item.category ? 'Search subcategories…' : 'Choose a category first'}
                            groups={item.category ? [{ label: item.category, options: [...CATEGORIES[item.category]] }] : []}
                          />
                          {errors[`item-${index}-subcategory`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-subcategory`]}</p>}
                        </FieldGroup>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Location &amp; Access</h2>
            <FieldGroup>
              <Label htmlFor="location">Delivery or site location</Label>
              <Input
                id="location"
                placeholder="Town or postcode"
                value={form.location}
                onChange={(event) => update('location', event.target.value)}
              />
              {errors.location && <p className="text-sm font-semibold text-attention">{errors.location}</p>}
            </FieldGroup>
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold text-foundation-navy">Access &amp; supporting requirements</legend>
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
            </fieldset>
          </Card>
        )}

        {step === 4 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Materials / Services Required</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="quantity-value">Quantity</Label>
                <Input
                  id="quantity-value"
                  placeholder="e.g. 4,000"
                  value={form.quantityValue}
                  onChange={(event) => update('quantityValue', event.target.value)}
                />
                {errors.quantityValue && <p className="text-sm font-semibold text-attention">{errors.quantityValue}</p>}
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="quantity-unit">Unit</Label>
                <Select id="quantity-unit" value={form.quantityUnit} onChange={(event) => update('quantityUnit', event.target.value)}>
                  <option value="" disabled>
                    Select a unit
                  </option>
                  {QUANTITY_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
                {errors.quantityUnit && <p className="text-sm font-semibold text-attention">{errors.quantityUnit}</p>}
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="description">Specification and notes</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Describe the products, waste stream, or plant required, along with any specification details."
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
              />
              {errors.description && <p className="text-sm font-semibold text-attention">{errors.description}</p>}
            </FieldGroup>
            {form.items.length > 0 && (
              <div className="border-t border-slate-200 pt-5 sm:col-span-2">
                <h3 className="font-heading text-base font-bold text-foundation-navy">Item quantities and specifications</h3>
                <div className="mt-4 flex flex-col gap-5">
                  {form.items.map((item, index) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-4 text-sm font-semibold text-foundation-navy">Item {index + 2}: {item.subcategory || 'Unselected item'}</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-quantity`}>Quantity</Label>
                          <Input id={`item-${index}-quantity`} value={item.quantityValue} placeholder="e.g. 20" onChange={(event) => updateItem(index, 'quantityValue', event.target.value)} />
                          {errors[`item-${index}-quantity`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-quantity`]}</p>}
                        </FieldGroup>
                        <FieldGroup>
                          <Label htmlFor={`item-${index}-unit`}>Unit</Label>
                          <Select id={`item-${index}-unit`} value={item.quantityUnit} onChange={(event) => updateItem(index, 'quantityUnit', event.target.value)}>
                            <option value="" disabled>Select a unit</option>
                            {QUANTITY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                          </Select>
                          {errors[`item-${index}-unit`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-unit`]}</p>}
                        </FieldGroup>
                      </div>
                      <FieldGroup>
                        <Label htmlFor={`item-${index}-description`}>Item specification</Label>
                        <Textarea id={`item-${index}-description`} rows={3} value={item.description} placeholder="Add the specification or delivery requirement for this item." onChange={(event) => updateItem(index, 'description', event.target.value)} />
                        {errors[`item-${index}-description`] && <p className="text-xs font-semibold text-attention">{errors[`item-${index}-description`]}</p>}
                      </FieldGroup>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {step === 5 && (
          <Card className="flex flex-col gap-6">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Schedule</h2>
            <FieldGroup>
              <Label htmlFor="urgency">Urgency</Label>
              <Select id="urgency" value={form.urgency} onChange={(event) => update('urgency', event.target.value)}>
                <option value="" disabled>
                  Select urgency
                </option>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
                <option value="flexible">Flexible</option>
              </Select>
              {errors.urgency && <p className="text-sm font-semibold text-attention">{errors.urgency}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="closing-date">Quote closing date</Label>
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
          </Card>
        )}

        {step === 6 && (
          <Card className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Upload Files (optional)</h2>
            <p className="text-sm text-concrete-grey">
              Attach drawings, specifications, or site photos. File storage is coming soon &mdash; for
              now, selected files are listed here for your reference only and are not saved with the
              tender. Mention any key documents in your specification notes (Step 4) instead.
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

        {step === 7 && (
          <Card className="flex flex-col gap-5">
            <h2 className="font-heading text-lg font-bold text-foundation-navy">Review &amp; Submit</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <ReviewItem label="Tender name" value={form.projectName} />
              <ReviewItem label="Budget" value={form.budget ? `£${form.budget}` : 'Not specified'} />
              <ReviewItem label="Category" value={`${form.category} / ${form.subcategory}`} />
              <ReviewItem label="Location" value={form.location} />
              <ReviewItem label="Requirements" value={form.requirements.join(', ') || 'None'} />
              <ReviewItem label="Quantity" value={`${form.quantityValue} ${form.quantityUnit}`.trim()} />
              <ReviewItem label="Urgency" value={form.urgency} />
              <ReviewItem label="Closing date" value={form.closingDate} />
              <ReviewItem label="Tender items" value={`${form.items.length + 1} item(s)`} />
              <ReviewItem
                label="Attachments"
                value={files.length > 0 ? `${files.length} file(s) selected (not yet saved)` : 'None'}
              />
            </dl>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-concrete-grey">Specification</p>
              <p className="whitespace-pre-line text-sm text-foundation-navy">{form.description}</p>
            </div>
            {form.items.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-concrete-grey">Additional items</p>
                <ul className="flex flex-col gap-2 text-sm text-foundation-navy">
                  {form.items.map((item, index) => (
                    <li key={item.id}>
                      {index + 2}. {item.category} / {item.subcategory} &middot; {item.quantityValue} {item.quantityUnit}
                    </li>
                  ))}
                </ul>
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

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foundation-navy">{value || '—'}</p>
    </div>
  );
}

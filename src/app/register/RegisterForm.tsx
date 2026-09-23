'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Stepper } from '@/components/ui/Stepper';
import { SERVICE_CATALOG } from '@/lib/categories';
import { cloneCatalog, type CategoryCatalog } from '@/lib/catalog';
import { COMPANY_TYPE_LABELS, COMPANY_TYPES } from '@/lib/companyTypes';
import { FieldGroup, Input, Label, PasswordInput } from '@/components/ui/Field';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { UK_COUNTIES, UK_REGIONS } from '@/lib/geography';

export type WorkspaceIntent = 'buying' | 'supplying' | 'both';

export function parseIntent(value: string | null | undefined): WorkspaceIntent {
  if (value === 'supplying') return 'supplying';
  if (value === 'buying') return 'buying';
  return 'buying';
}

export function RegisterForm({ initialIntent }: { initialIntent: WorkspaceIntent }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [workspace, setWorkspace] = useState<WorkspaceIntent>(initialIntent);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState<(typeof COMPANY_TYPES)[number]>('LIMITED_COMPANY');
  const [branchIdentifier, setBranchIdentifier] = useState('');
  const [coverageScope, setCoverageScope] = useState<'COUNTY' | 'REGION' | 'UK'>('COUNTY');
  const [counties, setCounties] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [serviceProvisions, setServiceProvisions] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CategoryCatalog>(() => cloneCatalog(SERVICE_CATALOG));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const serviceNames = Object.keys(catalog);

  useEffect(() => {
    fetch('/api/categories')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { catalog?: CategoryCatalog } | null) => {
        if (data?.catalog) setCatalog(data.catalog);
      })
      .catch(() => undefined);
  }, []);

  const supplies = workspace !== 'buying';
  const steps = useMemo(
    () =>
      supplies
        ? [
            { id: 1, label: 'Account' },
            { id: 2, label: 'Workspace' },
            { id: 3, label: 'Coverage' },
          ]
        : [
            { id: 1, label: 'Account' },
            { id: 2, label: 'Workspace' },
            { id: 3, label: 'Confirm' },
          ],
    [supplies],
  );

  function goTo(next: number) {
    setError(null);
    setStep(next);
    setFurthestStep((current) => Math.max(current, next));
  }

  function validateAccount() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !companyName.trim() || !branchIdentifier.trim()) {
      setError('Complete the required account details.');
      return false;
    }
    if (password.length < 10 || password.length > 200 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password must be 10-200 characters, including a capital letter and a special character.');
      return false;
    }
    return true;
  }

  function validateCoverage() {
    if (!supplies) return true;
    if (services.length === 0) {
      setError('Select at least one category you supply.');
      return false;
    }
    if (serviceProvisions.length === 0) {
      setError('Select at least one provision for the services you supply.');
      return false;
    }
    if (coverageScope === 'COUNTY' && counties.length === 0) {
      setError('Select at least one county, or choose a wider operating area.');
      return false;
    }
    if (coverageScope === 'REGION' && regions.length === 0) {
      setError('Select at least one region, or choose UK-wide coverage.');
      return false;
    }
    return true;
  }

  function handleContinue() {
    if (step === 1 && !validateAccount()) return;
    goTo(Math.min(step + 1, 3));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) {
      handleContinue();
      return;
    }
    if (!validateAccount() || !validateCoverage()) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        contactName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        contactPhone: contactPhone || undefined,
        role: 'USER',
        termsAccepted: form.get('termsAccepted') === 'on',
        privacyAccepted: form.get('privacyAccepted') === 'on',
        companyName,
        companyType,
        branchIdentifier,
        categories: supplies ? services : [],
        serviceProvisions: supplies ? serviceProvisions : [],
        coverageScope: supplies ? coverageScope : undefined,
        counties: supplies && coverageScope === 'COUNTY' ? counties : undefined,
        regions: supplies && coverageScope === 'REGION' ? regions : undefined,
      }),
    });

    if (!response.ok) {
      setSubmitting(false);
      const data = await response.json().catch(() => null);
      setError(data?.error ?? 'Unable to complete registration. Check your details and try again.');
      return;
    }
    router.push('/login?verification=pending');
  }

  const workspaceOptions: Array<{ value: WorkspaceIntent; title: string; body: string }> = [
    { value: 'buying', title: 'Buying', body: 'Raise tenders and compare formal quotes. You can add supplying later from your profile.' },
    { value: 'supplying', title: 'Supplying', body: 'Quote specified demand in your trades and coverage. Buying can be added later from your profile.' },
    { value: 'both', title: 'Buying and supplying', body: 'One account for both. Coverage is only needed for the supplying side.' },
  ];

  return (
    <section className="mx-auto max-w-lg pt-12 pb-24">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-blue">Create an account</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foundation-navy">Create your Trade Tender account</h1>
      <p className="mt-3 text-sm leading-relaxed text-foundation-navy">
        {supplies
          ? 'Set up the business, then tell us what you supply and where you operate.'
          : 'Set up the business. You will not be asked for supplier coverage on a buying account.'}
      </p>

      <Card className="mt-6">
        <Stepper steps={steps} currentStep={step} furthestStep={furthestStep} onStepClick={goTo} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {step === 1 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" name="firstName" required autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" name="lastName" required autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </FieldGroup>
              </div>
              <FieldGroup>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="contactPhone">Phone (optional)</Label>
                <Input id="contactPhone" name="contactPhone" autoComplete="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" name="password" minLength={10} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <p className="text-xs text-concrete-grey">Use 10-200 characters, including a capital letter and a special character.</p>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" name="companyName" required autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="companyType">Company type</Label>
                <select id="companyType" name="companyType" required value={companyType} onChange={(event) => setCompanyType(event.target.value as typeof companyType)} className="w-full min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-foundation-navy">
                  {COMPANY_TYPES.map((type) => (
                    <option key={type} value={type}>{COMPANY_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="branchIdentifier">Branch or location</Label>
                <Input id="branchIdentifier" name="branchIdentifier" required placeholder="e.g. Leeds branch or Head Office" value={branchIdentifier} onChange={(event) => setBranchIdentifier(event.target.value)} />
                <p className="text-xs text-concrete-grey">This distinguishes businesses with the same company name.</p>
              </FieldGroup>
            </>
          )}

          {step === 2 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold text-foundation-navy">How will you use Trade Tender?</legend>
              <p className="text-xs text-concrete-grey">This only changes what we ask next. You can buy and supply from the same account later.</p>
              {workspaceOptions.map((option) => {
                const selected = workspace === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-4 ${selected ? 'border-trade-blue bg-trade-blue/5' : 'border-slate-200 bg-white hover:border-steel-blue/40'}`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="workspace"
                        value={option.value}
                        checked={selected}
                        onChange={() => setWorkspace(option.value)}
                        className="h-4 w-4 accent-trade-blue"
                      />
                      <span className="text-sm font-semibold text-foundation-navy">{option.title}</span>
                    </span>
                    <span className="pl-7 text-xs leading-relaxed text-concrete-grey">{option.body}</span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {step === 3 && supplies && (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-foundation-navy">Categories you provide</legend>
                <p className="text-xs text-concrete-grey">These categories determine which tender opportunities are matched to you.</p>
                {serviceNames.map((category) => (
                  <label key={category} className="flex items-center gap-3 text-sm text-concrete-grey">
                    <input
                      type="checkbox"
                      name="categories"
                      value={category}
                      checked={services.includes(category)}
                      onChange={() => setServices((current) => {
                        const nextServices = current.includes(category) ? current.filter((service) => service !== category) : [...current, category];
                        setServiceProvisions((provisions) => provisions.filter((entry) => nextServices.includes(entry.split('::')[0] ?? '')));
                        return nextServices;
                      })}
                      className="h-4 w-4 accent-trade-blue"
                    />
                    {category}
                  </label>
                ))}
              </fieldset>
              {services.map((service) => (
                <fieldset key={service} className="flex flex-col gap-2">
                  <legend className="text-sm font-semibold text-foundation-navy">{service} provisions (optional)</legend>
                  <p className="text-xs text-concrete-grey">Select the areas your business provides to refine your profile.</p>
                  {Object.keys(catalog[service] ?? {}).map((provision) => {
                    const value = `${service}::${provision}`;
                    return (
                      <label key={value} className="flex items-center gap-3 text-sm text-concrete-grey">
                        <input type="checkbox" checked={serviceProvisions.includes(value)} onChange={() => setServiceProvisions((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value])} className="h-4 w-4 accent-trade-blue" />
                        {provision}
                      </label>
                    );
                  })}
                </fieldset>
              ))}
              <FieldGroup>
                <Label htmlFor="coverageScope">Operating area</Label>
                <div className="flex flex-wrap gap-4">
                  {(['COUNTY', 'REGION', 'UK'] as const).map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm text-concrete-grey">
                      <input
                        type="radio"
                        name="coverageScope"
                        checked={coverageScope === scope}
                        onChange={() => setCoverageScope(scope)}
                        className="h-4 w-4 accent-trade-blue"
                      />
                      {scope === 'COUNTY' ? 'Select counties' : scope === 'REGION' ? 'Select regions' : 'UK-wide (all regions)'}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-concrete-grey">A tender is matched to you only when its location falls inside the service areas you select here.</p>
              </FieldGroup>
              {coverageScope === 'COUNTY' && (
                <FieldGroup>
                  <Label htmlFor="counties">Service areas (counties)</Label>
                  <MultiSelectDropdown
                    options={UK_COUNTIES.map((county) => ({ label: county, value: county }))}
                    selected={counties}
                    onChange={setCounties}
                    placeholder="Select one or more counties"
                  />
                </FieldGroup>
              )}
              {coverageScope === 'REGION' && (
                <FieldGroup>
                  <Label htmlFor="regions">Service areas (regions)</Label>
                  <MultiSelectDropdown
                    options={UK_REGIONS.map((region) => ({ label: region, value: region }))}
                    selected={regions}
                    onChange={setRegions}
                    placeholder="Select one or more regions"
                  />
                </FieldGroup>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <label className="flex items-start gap-3 text-sm text-concrete-grey">
                <input type="checkbox" name="termsAccepted" required className="mt-1 h-4 w-4 accent-trade-blue" />
                I accept the <Link href="/policies/platform-terms" className="font-semibold text-steel-blue underline underline-offset-4">Trade Tender Terms of Use</Link>.
              </label>
              <label className="flex items-start gap-3 text-sm text-concrete-grey">
                <input type="checkbox" name="privacyAccepted" required className="mt-1 h-4 w-4 accent-trade-blue" />
                I acknowledge the <Link href="/policies/privacy" className="font-semibold text-steel-blue underline underline-offset-4">Privacy Policy</Link>.
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-attention">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => goTo(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" size="lg" onClick={handleContinue}>
                Continue
              </Button>
            ) : (
              <Button type="submit" loading={submitting} size="lg">
                Create account
              </Button>
            )}
          </div>
        </form>
      </Card>
    </section>
  );
}

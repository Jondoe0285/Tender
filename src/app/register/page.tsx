'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Input, FieldGroup } from '@/components/ui/Field';
import { CATEGORY_NAMES } from '@/lib/categories';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'CLIENT' | 'RETAILER'>('CLIENT');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const categories = form.getAll('categories') as string[];

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        contactName: `${form.get('firstName')} ${form.get('lastName')}`.trim(),
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        contactPhone: form.get('contactPhone') || undefined,
        role,
        termsAccepted: form.get('termsAccepted') === 'on',
        companyName: form.get('companyName') || undefined,
        categories: role === 'RETAILER' ? categories : undefined,
        coverageAreas: form.get('coverageAreas') || undefined,
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

  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 sm:px-10">
        <section className="mx-auto max-w-lg pt-16 pb-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-steel-blue">Create an account</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foundation-navy">Create your Trade Tender account</h1>
          <p className="mt-3 text-sm leading-relaxed text-concrete-grey">
            Select the account type that matches your role in the construction supply chain.
          </p>

          <div className="mt-6 flex gap-2 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Account type">
            {(['CLIENT', 'RETAILER'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={role === option}
                onClick={() => setRole(option)}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
                  role === option
                    ? 'bg-white text-foundation-navy shadow-soft'
                    : 'text-concrete-grey hover:text-foundation-navy'
                }`}
              >
                {option === 'CLIENT' ? 'Client' : 'Retailer'}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-concrete-grey">
            {role === 'CLIENT'
              ? 'For construction businesses raising requirements and comparing trade prices.'
              : 'For merchants and suppliers responding to matched construction demand.'}
          </p>

          <Card className="mt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" name="firstName" required autoComplete="given-name" />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" name="lastName" required autoComplete="family-name" />
                </FieldGroup>
              </div>
              <FieldGroup>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="contactPhone">Phone (optional)</Label>
                <Input id="contactPhone" name="contactPhone" autoComplete="tel" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" />
                <p className="text-xs text-concrete-grey">Use at least 10 characters.</p>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" name="companyName" required autoComplete="organization" />
              </FieldGroup>

              {role === 'RETAILER' && (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-sm font-semibold text-foundation-navy">Categories you supply</legend>
                    <p className="text-xs text-concrete-grey">These categories determine which tender opportunities are matched to you.</p>
                    {CATEGORY_NAMES.map((category) => (
                      <label key={category} className="flex items-center gap-3 text-sm text-concrete-grey">
                        <input type="checkbox" name="categories" value={category} className="h-4 w-4 accent-safety-amber" />
                        {category}
                      </label>
                    ))}
                  </fieldset>
                  <FieldGroup>
                    <Label htmlFor="coverageAreas">Coverage areas</Label>
                    <Input id="coverageAreas" name="coverageAreas" placeholder="e.g. Leeds, Manchester, Sheffield" />
                    <p className="text-xs text-concrete-grey">Use towns, cities, or postcode areas separated by commas.</p>
                  </FieldGroup>
                </>
              )}

              <label className="flex items-start gap-3 text-sm text-concrete-grey">
                <input type="checkbox" name="termsAccepted" required className="mt-1 h-4 w-4 accent-safety-amber" />
                I accept the Trade Tender Terms of Use.
              </label>

              {error && (
                <p role="alert" className="text-sm font-semibold text-attention">
                  {error}
                </p>
              )}

              <Button type="submit" loading={submitting} size="lg" className="mt-2">
                Create account
              </Button>
            </form>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

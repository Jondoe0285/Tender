'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldGroup, Label, PasswordInput } from '@/components/ui/Field';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 sm:px-10">
        <Suspense fallback={null}><ResetPasswordForm /></Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirmPassword') ?? '')) {
      setError('Those passwords do not match.');
      return;
    }

    setSubmitting(true);
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setSubmitting(false);
      setError(data?.error ?? 'Unable to set your password. Please try again.');
      return;
    }

    router.replace('/login?password=set');
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-md pt-16 pb-24">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foundation-navy">Reset link required</h1>
        <p role="alert" className="mt-4 text-sm text-concrete-grey">
          Open the link from your Trade Tender email to set a password.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md pt-16 pb-24">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-steel-blue">Account security</p>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foundation-navy">Set your password</h1>
      <p className="mt-4 text-sm text-concrete-grey">Choose a password of at least 10 characters.</p>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FieldGroup>
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" name="password" required minLength={10} autoComplete="new-password" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={10} autoComplete="new-password" />
          </FieldGroup>
          {error && (
            <p role="alert" className="text-sm font-semibold text-attention">
              {error}
            </p>
          )}
          <Button type="submit" loading={submitting} size="lg" className="mt-2">
            Set password
          </Button>
        </form>
      </Card>
    </section>
  );
}

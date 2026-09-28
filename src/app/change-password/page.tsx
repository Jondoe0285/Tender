'use client';

import { useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Label, PasswordInput } from '@/components/ui/Field';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('currentPassword') ?? '');
    const newPassword = String(form.get('newPassword') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (newPassword !== confirmPassword) {
      setSubmitting(false);
      setError('Those passwords do not match.');
      return;
    }
    const response = await fetch('/api/client/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setSubmitting(false);
      setError(data?.error ?? 'Unable to change password.');
      return;
    }
    await signOut({ redirect: false });
    router.replace('/login?password=changed');
  }

  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1 px-6 sm:px-10">
        <section className="mx-auto max-w-md py-12 pb-20">
          <h1 className="text-2xl font-semibold tracking-tight text-foundation-navy">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-foundation-navy">A Super User set a temporary password for this account. You must replace it before you can use Trade Tender.</p>
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <FieldGroup>
              <Label htmlFor="currentPassword">Temporary password</Label>
              <PasswordInput id="currentPassword" name="currentPassword" required autoComplete="current-password" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput id="newPassword" name="newPassword" minLength={10} required autoComplete="new-password" />
              <p className="mt-1 text-xs text-concrete-grey">Use 10-200 characters, including a capital letter and a special character.</p>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" minLength={10} required autoComplete="new-password" />
            </FieldGroup>
            {error && <p role="alert" className="text-sm font-semibold text-attention">{error}</p>}
            <Button type="submit" loading={submitting} size="lg">Save password and continue</Button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

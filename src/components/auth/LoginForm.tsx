'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldGroup, Input, Label, PasswordInput } from '@/components/ui/Field';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    });

    if (result?.error) {
      setSubmitting(false);
      if (result.error.includes('MFA_REQUIRED')) {
        setMfaRequired(true);
        setError('Enter the six-digit authenticator code or a recovery code.');
      } else if (result.error.includes('MFA_INVALID')) {
        setMfaRequired(true);
        setError('That MFA code was not accepted. Try again.');
      } else setError('Incorrect email or password.');
      return;
    }
    router.replace('/api/auth/workspace');
  }

  async function handlePasswordResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetSubmitting(true);
    setResetError(null);
    setResetEmailSent(false);

    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('resetEmail') }),
    });

    setResetSubmitting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setResetError(data?.error ?? 'Unable to request a reset link. Please try again.');
      return;
    }

    setResetEmailSent(true);
  }

  return (
    <section className="mx-auto max-w-5xl py-10 pb-20 sm:py-16">
      <div className="grid overflow-hidden rounded-card border border-slate-200 bg-white shadow-soft-lg lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-[520px] flex-col justify-between bg-foundation-navy p-8 text-white sm:p-12">
          <div>
            <div className="inline-block bg-site-white p-3"><TradeTenderLogo /></div>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-sky-blue">Secure workspace access</p>
            <h1 className="mt-4 max-w-sm font-heading text-3xl font-bold leading-tight sm:text-4xl">Connect. Compare. Construct.</h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-white/75">Sign in to manage tenders, compare formal quotes, and keep your construction procurement moving.</p>
          </div>
          <p className="text-sm font-semibold text-safety-amber">Trade Tender</p>
        </div>

        <div className="bg-light-grey p-6 sm:p-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-steel-blue">Sign in</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foundation-navy">Sign in to your workspace</h2>
          {searchParams.get('verification') === 'pending' && <p role="status" className="mt-4 text-sm font-semibold text-approved">Check your email and use the verification link to activate your account.</p>}
          {searchParams.get('verification') === 'verified' && <p role="status" className="mt-4 text-sm font-semibold text-approved">Your email address is verified. You can now sign in.</p>}
          {searchParams.get('verification') === 'invalid' && <p role="alert" className="mt-4 text-sm font-semibold text-attention">This verification link is invalid or has expired. Register again with the same details to request a new link.</p>}
          {searchParams.get('password') === 'set' && <p role="status" className="mt-4 text-sm font-semibold text-approved">Your password is set. Sign in with your new password.</p>}
          {searchParams.get('error') === 'workspace' && <p role="alert" className="mt-4 text-sm font-semibold text-attention">Your account is not assigned to an approved workspace.</p>}

          <Card className="mt-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <FieldGroup>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" name="password" required autoComplete="current-password" />
              </FieldGroup>
              {mfaRequired && <FieldGroup>
                <Label htmlFor="mfaCode">MFA code</Label>
                <Input id="mfaCode" name="mfaCode" inputMode="numeric" autoComplete="one-time-code" placeholder="123456 or recovery code" required />
              </FieldGroup>}
              {error && <p role="alert" className="text-sm font-semibold text-attention">{error}</p>}
              <Button type="submit" loading={submitting} size="lg" className="mt-2">Sign in</Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-concrete-grey">
            New to Trade Tender? <a href="/register" className="font-semibold text-steel-blue hover:text-foundation-navy">Create an account</a>
          </p>

          <Card className="mt-8">
            <form onSubmit={handlePasswordResetRequest} className="flex flex-col gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-foundation-navy">Forgotten password?</h2>
                <p className="mt-2 text-sm text-concrete-grey">Enter your email address and we will send a reset link if the account exists.</p>
              </div>
              <FieldGroup>
                <Label htmlFor="resetEmail">Email</Label>
                <Input id="resetEmail" name="resetEmail" type="email" required autoComplete="email" />
              </FieldGroup>
              {resetEmailSent && <p role="status" className="text-sm font-semibold text-approved">If an account exists for that email, a reset link has been sent.</p>}
              {resetError && <p role="alert" className="text-sm font-semibold text-attention">{resetError}</p>}
              <Button type="submit" loading={resetSubmitting} variant="secondary" className="mt-1">Send reset link</Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
}

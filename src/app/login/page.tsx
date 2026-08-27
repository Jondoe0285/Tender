'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { getSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Input, FieldGroup } from '@/components/ui/Field';
import { workspaceForRole } from '@/lib/navigation';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 sm:px-10">
        <Suspense fallback={null}><LoginForm /></Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError('Incorrect email or password.');
      return;
    }
    const session = await getSession();
    const workspace = workspaceForRole(session?.user?.role);
    if (!workspace) {
      setSubmitting(false);
      setError('Your account is not assigned to an approved workspace.');
      return;
    }
    router.replace(workspace);
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-md pt-16 pb-24">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-steel-blue">Sign in</p>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foundation-navy">Sign in to your workspace</h1>
      {searchParams.get('verification') === 'pending' && <p role="status" className="mt-4 text-sm font-semibold text-approved">Check your email and use the verification link to activate your account.</p>}
      {searchParams.get('verification') === 'verified' && <p role="status" className="mt-4 text-sm font-semibold text-approved">Your email address is verified. You can now sign in.</p>}
      {searchParams.get('verification') === 'invalid' && <p role="alert" className="mt-4 text-sm font-semibold text-attention">This verification link is invalid or has expired. Register again with the same details to request a new link.</p>}

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FieldGroup>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </FieldGroup>
          {error && (
            <p role="alert" className="text-sm font-semibold text-attention">
              {error}
            </p>
          )}
          <Button type="submit" loading={submitting} size="lg" className="mt-2">
            Sign in
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-concrete-grey">
        New to Trade Tender?{' '}
        <a href="/register" className="font-semibold text-steel-blue hover:text-foundation-navy">
          Create an account
        </a>
      </p>
    </section>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldGroup, Input, Label, Textarea } from '@/components/ui/Field';

export default function DemoPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/demo-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        organisation: form.get('organisation'),
        role: form.get('role'),
        message: form.get('message'),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setStatus(data?.error ?? 'Unable to send this request.');
      return;
    }
    setStatus('Request received. We will contact you from the support address.');
    event.currentTarget.reset();
  }

  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-blue">For buyers and suppliers</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foundation-navy">Request a demo</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-foundation-navy">Tell us the buying or supplying job you need to run. We will walk the tender, quote, and award path — not a generic product tour.</p>
          <Card className="mt-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup><Label htmlFor="name">Name</Label><Input id="name" name="name" required minLength={2} /></FieldGroup>
              <FieldGroup><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" required /></FieldGroup>
              <FieldGroup><Label htmlFor="organisation">Organisation</Label><Input id="organisation" name="organisation" required minLength={2} /></FieldGroup>
              <FieldGroup><Label htmlFor="role">Your role</Label><Input id="role" name="role" required placeholder="Buyer, supplier, QS, director" /></FieldGroup>
              <FieldGroup><Label htmlFor="message">What you need to see</Label><Textarea id="message" name="message" rows={5} required /></FieldGroup>
              {status && <p className="text-sm font-semibold text-foundation-navy" role="status">{status}</p>}
              <Button type="submit" loading={submitting}>Send demo request</Button>
            </form>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

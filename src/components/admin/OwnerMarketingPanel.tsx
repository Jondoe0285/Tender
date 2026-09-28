'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldGroup, Input, Label } from '@/components/ui/Field';
import type { MarketingCampaignSummary } from '@/server/domain/marketingCampaignService';

const TEMPLATES = [
  {
    key: 'MARKETPLACE',
    title: 'Buyers and mixed lists',
    body: 'Sells the marketplace to Buyers: one written brief, comparable quotes, and an award with contact still private.',
  },
  {
    key: 'SUPPLIERS',
    title: 'Suppliers',
    body: 'Sells live demand to plant hire companies, waste handlers, materials suppliers, and contractors. They see scope, location, and requirements before they quote.',
  },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]['key'];

export function OwnerMarketingPanel({
  initialCampaigns,
  marketplaceCtaUrl,
  supplierCtaUrl,
}: {
  initialCampaigns: MarketingCampaignSummary[];
  marketplaceCtaUrl: string;
  supplierCtaUrl: string;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [templateKey, setTemplateKey] = useState<TemplateKey>('MARKETPLACE');
  const [ctaUrl, setCtaUrl] = useState(marketplaceCtaUrl);
  const [lawfulBasis, setLawfulBasis] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function defaultCtaFor(key: TemplateKey) {
    return key === 'SUPPLIERS' ? supplierCtaUrl : marketplaceCtaUrl;
  }

  function selectTemplate(next: TemplateKey) {
    setTemplateKey(next);
    setCtaUrl((current) => {
      const trimmed = current.trim();
      if (!trimmed || trimmed === marketplaceCtaUrl || trimmed === supplierCtaUrl) {
        return defaultCtaFor(next);
      }
      return current;
    });
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file');
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
      setMessage('Choose an Excel workbook or CSV file of email addresses.');
      return;
    }

    setBusy('upload');
    setMessage(null);
    try {
      const body = new FormData();
      body.set('file', fileInput.files[0]);
      body.set('ctaUrl', ctaUrl);
      body.set('templateKey', templateKey);
      const response = await fetch('/api/super-user/owner/marketing/campaigns', { method: 'POST', body });
      const data = await response.json().catch(() => ({})) as { error?: string; campaign?: MarketingCampaignSummary };
      if (!response.ok || !data.campaign) throw new Error(data.error ?? 'Unable to read this spreadsheet');
      setCampaigns((current) => [data.campaign!, ...current.filter((row) => row.id !== data.campaign!.id)].slice(0, 20));
      setMessage(`Loaded ${data.campaign.counts.total} addresses from ${data.campaign.fileName}. ${data.campaign.counts.skipped} already unsubscribed.`);
      form.reset();
      setCtaUrl(ctaUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read this spreadsheet');
    } finally {
      setBusy(null);
    }
  }

  async function preview(campaignId: string) {
    setBusy(`preview-${campaignId}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/super-user/owner/marketing/campaigns/${campaignId}/preview`, { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { error?: string; recipient?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to send a preview');
      setMessage(`Preview sent to ${data.recipient}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send a preview');
    } finally {
      setBusy(null);
    }
  }

  async function sendAll(campaign: MarketingCampaignSummary) {
    if (!lawfulBasis) {
      setMessage('Confirm you have a lawful basis to email these addresses before sending.');
      return;
    }
    setBusy(`send-${campaign.id}`);
    setMessage(null);
    try {
      let remaining = campaign.counts.pending;
      let sentTotal = 0;
      let failedTotal = 0;
      while (remaining > 0) {
        const response = await fetch(`/api/super-user/owner/marketing/campaigns/${campaign.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmLawfulBasis: true }),
        });
        const data = await response.json().catch(() => ({})) as {
          error?: string;
          remaining?: number;
          sent?: number;
          failed?: number;
          status?: string;
        };
        if (!response.ok) throw new Error(data.error ?? 'Unable to send this campaign');
        sentTotal += data.sent ?? 0;
        failedTotal += data.failed ?? 0;
        remaining = data.remaining ?? 0;
        setCampaigns((current) => current.map((row) => row.id === campaign.id
          ? {
            ...row,
            status: data.status === 'completed' ? 'COMPLETED' : 'SENDING',
            counts: {
              ...row.counts,
              pending: remaining,
              sent: row.counts.sent + (data.sent ?? 0),
              failed: row.counts.failed + (data.failed ?? 0),
            },
          }
          : row));
        if (data.status === 'completed') break;
      }
      setMessage(`Send finished. ${sentTotal} sent, ${failedTotal} failed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send this campaign');
    } finally {
      setBusy(null);
    }
  }

  const selectedTemplate = TEMPLATES.find((template) => template.key === templateKey) ?? TEMPLATES[0];

  function downloadHref(key: TemplateKey) {
    const params = new URLSearchParams();
    const trimmed = ctaUrl.trim();
    const destination = key === templateKey && trimmed ? trimmed : defaultCtaFor(key);
    if (destination) params.set('ctaUrl', destination);
    const query = params.toString();
    return `/api/super-user/owner/marketing/templates/${key}${query ? `?${query}` : ''}`;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-steel-blue">Trade Tender marketing</p>
        <h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">Promotional email campaign</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-concrete-grey">
          Upload an Excel workbook or CSV of work email addresses. Choose the Buyer marketplace template or the Supplier template, then send. Each message includes an unsubscribe link.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={downloadHref('MARKETPLACE')}
            className="inline-flex h-11 items-center justify-center rounded-md border border-foundation-navy bg-site-white px-5 text-sm font-semibold text-foundation-navy hover:bg-slate-50"
          >
            Download Buyer template
          </a>
          <a
            href={downloadHref('SUPPLIERS')}
            className="inline-flex h-11 items-center justify-center rounded-md border border-foundation-navy bg-site-white px-5 text-sm font-semibold text-foundation-navy hover:bg-slate-50"
          >
            Download Supplier template
          </a>
        </div>
        <p className="mt-2 text-xs text-concrete-grey">HTML copies of the two campaign emails. Open them in a browser to review photography and copy before you send.</p>
        {message && <p className="mt-4 text-sm font-semibold text-foundation-navy" role="status">{message}</p>}
        <form onSubmit={upload} className="mt-5 grid gap-4 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold text-foundation-navy">Campaign template</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {TEMPLATES.map((template) => {
                const selected = template.key === templateKey;
                return (
                  <label
                    key={template.key}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-3 ${selected ? 'border-trade-blue bg-light-grey' : 'border-slate-300 bg-white'}`}
                  >
                    <input
                      type="radio"
                      name="templateKey"
                      value={template.key}
                      checked={selected}
                      onChange={() => selectTemplate(template.key)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foundation-navy">{template.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-concrete-grey">{template.body}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <FieldGroup>
            <Label htmlFor="marketing-file">Excel or CSV list</Label>
            <Input id="marketing-file" name="file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
            <span className="text-xs text-concrete-grey">Any column of email addresses. Maximum 5 MB and 10,000 unique addresses. The file is read and discarded; only the addresses are stored.</span>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="marketing-cta">Destination link</Label>
            <Input id="marketing-cta" type="url" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="https://" />
            <span className="text-xs text-concrete-grey">
              HTTPS link on the register button. {templateKey === 'SUPPLIERS' ? 'Defaults to the Supplier register page.' : 'Defaults to this environment\'s register page.'} Leave blank to use that default.
            </span>
          </FieldGroup>
          <div className="flex items-end">
            <Button type="submit" loading={busy === 'upload'}>Load addresses</Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-concrete-grey">Selected: {selectedTemplate.title}.</p>
        <label className="mt-5 flex items-start gap-3 text-sm text-concrete-grey">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={lawfulBasis}
            onChange={(event) => setLawfulBasis(event.target.checked)}
          />
          <span>I have a lawful basis under UK PECR to send this marketing to every address on the list (for example consent, or a corporate subscriber where a soft opt-out is offered). Each message includes an unsubscribe link.</span>
        </label>
      </Card>

      <Card className="divide-y divide-slate-100 p-0">
        {campaigns.length === 0 ? (
          <p className="px-6 py-8 text-sm text-concrete-grey">No marketing lists have been uploaded yet.</p>
        ) : campaigns.map((campaign) => (
          <div key={campaign.id} className="px-6 py-5">
            <p className="font-semibold text-foundation-navy">{campaign.name}</p>
            <p className="mt-1 text-sm text-concrete-grey">
              {campaign.templateLabel} · {campaign.fileName} · {campaign.counts.total} addresses · {campaign.counts.pending} remaining · {campaign.counts.sent} sent · {campaign.counts.failed} failed · {campaign.counts.skipped} unsubscribed
            </p>
            {campaign.sampleEmails.length > 0 && (
              <p className="mt-1 text-xs text-concrete-grey">Sample: {campaign.sampleEmails.join(', ')}</p>
            )}
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-steel-blue">{campaign.status}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" loading={busy === `preview-${campaign.id}`} onClick={() => preview(campaign.id)}>Send preview to me</Button>
              <Button type="button" disabled={!lawfulBasis || campaign.counts.pending === 0} loading={busy === `send-${campaign.id}`} onClick={() => sendAll(campaign)}>Send to remaining addresses</Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

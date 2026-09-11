'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { VERIFICATION_DOCUMENT_TYPES, verificationDocumentExpires, type VerificationDocumentType } from '@/lib/verification-documents';
import { buildSafeAttachmentName } from '@/lib/attachment-utils';

type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
const REOPEN_STATUSES: VerificationStatus[] = ['UNVERIFIED', 'REJECTED', 'EXPIRED'];

type UploadedDocument = {
  documentType: VerificationDocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiryDate: string | null;
  uploadedAt: string;
};

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(0)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProviderVerificationPage() {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('UNVERIFIED');
  const [isSoleTrader, setIsSoleTrader] = useState(false);
  const [applicableTypes, setApplicableTypes] = useState<VerificationDocumentType[]>([]);
  const [requiredTypes, setRequiredTypes] = useState<VerificationDocumentType[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<VerificationDocumentType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  async function load() {
    setLoading(true);
    const [profileResponse, documentsResponse] = await Promise.all([
      fetch('/api/retailer/profile'),
      fetch('/api/retailer/verification/documents'),
    ]);
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      setVerificationStatus(profile.verificationStatus);
      setIsSoleTrader(Boolean(profile.isSoleTrader));
    }
    if (documentsResponse.ok) {
      const data = await documentsResponse.json();
      setApplicableTypes(data.applicableDocumentTypes);
      setRequiredTypes(data.requiredDocumentTypes);
      setDocuments(data.documents);
    }
    setCurrentTime(Date.now());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleUpload(documentType: VerificationDocumentType) {
    const file = pendingFiles[documentType];
    const expiryDate = expiryDates[documentType];
    const expires = verificationDocumentExpires(documentType);
    if (!file || (expires && !expiryDate)) {
      setError(expires ? 'Choose a file and an expiry date before uploading.' : 'Choose a file before uploading.');
      return;
    }
    setUploadingType(documentType);
    setError(null);
    setMessage(null);
    try {
      const dataBase64 = await fileToBase64(file);
      const response = await fetch('/api/retailer/verification/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          name: buildSafeAttachmentName(file.name),
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataBase64,
          ...(expires ? { expiryDate } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.issues?.fieldErrors?.dataBase64?.[0] ?? data?.issues?.fieldErrors?.expiryDate?.[0] ?? data?.error ?? 'Unable to upload this document.');
        return;
      }
      setDocuments((current) => [...current.filter((doc) => doc.documentType !== documentType), data.document]);
      setPendingFiles((current) => { const next = { ...current }; delete next[documentType]; return next; });
      setExpiryDates((current) => { const next = { ...current }; delete next[documentType]; return next; });
      setMessage(`${documentLabel(documentType)} uploaded.`);
    } finally {
      setUploadingType(null);
    }
  }

  async function handleRemove(documentType: VerificationDocumentType) {
    setUploadingType(documentType);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/retailer/verification/documents/${documentType}`, { method: 'DELETE' });
    setUploadingType(null);
    if (!response.ok) {
      setError('Unable to remove this document.');
      return;
    }
    setDocuments((current) => current.filter((doc) => doc.documentType !== documentType));
  }

  async function handleSubmitForReview() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const response = await fetch('/api/retailer/verification', { method: 'POST' });
    const data = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to submit your verification request.');
      return;
    }
    setVerificationStatus(data.verificationStatus);
    setMessage(data.verificationStatus === 'VERIFIED'
      ? 'Your documents passed automated assessment and your account is now verified.'
      : 'Verification request submitted. An automated check flagged this for human review — our team will confirm your status shortly.');
  }

  function documentLabel(documentType: VerificationDocumentType) {
    return VERIFICATION_DOCUMENT_TYPES.find((doc) => doc.type === documentType)?.label ?? documentType;
  }

  const applicableDocuments = VERIFICATION_DOCUMENT_TYPES.filter((doc) => applicableTypes.includes(doc.type));
  const now = currentTime;
  const validUploadedTypes = new Set(documents.filter((doc) => !doc.expiryDate || new Date(doc.expiryDate).getTime() > now).map((doc) => doc.documentType));
  const requiredUploaded = requiredTypes.filter((type) => validUploadedTypes.has(type));
  const canSubmit = requiredTypes.length > 0 && requiredUploaded.length === requiredTypes.length;
  const canEdit = !isSoleTrader && REOPEN_STATUSES.includes(verificationStatus);
  const minExpiryDate = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (loading) return <AppShell role="retailer" title="Become Verified"><p className="text-sm text-concrete-grey">Loading...</p></AppShell>;

  return (
    <AppShell role="retailer" title="Become Verified">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/retailer/profile" className="inline-block text-sm font-semibold text-concrete-grey hover:text-foundation-navy">&larr; Back to profile</Link>

        {message && <p role="status" className="rounded-lg border border-steel-blue/20 bg-steel-blue/5 px-4 py-3 text-sm text-steel-blue">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-attention/30 bg-attention/5 px-4 py-3 text-sm text-attention">{error}</p>}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-foundation-navy">Verification documents</h2>
              <p className="mt-1 max-w-xl text-sm text-concrete-grey">
                {isSoleTrader
                  ? 'Your profile is marked as a sole trader, so AI verification is not available. Your quotes will show a Sole Trader status for Contractor due diligence.'
                  : 'Upload each document below with its expiry date. Every upload is submitted separately, so you can complete this checklist at your own pace.'}
                {!isSoleTrader && requiredTypes.length > 0 && ` Required documents uploaded: ${requiredUploaded.length} of ${requiredTypes.length}.`}
              </p>
            </div>
            <StatusBadge status={isSoleTrader ? 'neutral' : verificationStatus === 'VERIFIED' ? 'approved' : verificationStatus === 'PENDING' ? 'pending' : verificationStatus === 'REJECTED' || verificationStatus === 'EXPIRED' ? 'attention' : 'neutral'}>
              {isSoleTrader ? 'Sole Trader' : verificationStatus === 'VERIFIED' ? 'Verified by Ai' : verificationStatus === 'PENDING' ? 'Pending review' : verificationStatus === 'REJECTED' ? 'Not approved' : verificationStatus === 'EXPIRED' ? 'Expired' : 'Unverified'}
            </StatusBadge>
          </div>
        </Card>

        {isSoleTrader && <Card className="border-l-4 border-safety-amber bg-amber-50/40"><p className="text-sm font-semibold text-foundation-navy">Sole trader status</p><p className="mt-2 text-sm text-concrete-grey">Sole traders cannot be AI verified by Trade Tender because the automated legal-entity evidence route is not suitable. Contractors will see a Sole Trader flag on your quotes and should complete their own identity, insurance, competence, and commercial checks.</p></Card>}

        <Card className="border-l-4 border-safety-amber bg-amber-50/40">
          <p className="text-sm font-semibold text-foundation-navy">Compliance score disclaimer</p>
          <p className="mt-2 text-sm text-concrete-grey">
            The automated review assesses legal-compliance evidence only and may make mistakes. Each uploaded document
            receives a compliance score from 0-100%. To achieve a verified status, the required documents must together
            reach at least 90%. Trade Tender does not replace client due diligence, and clients must carry out suitable
            checks before entering any formal agreement.
          </p>
        </Card>

        {applicableDocuments.map((doc) => {
          const uploaded = documents.find((item) => item.documentType === doc.type);
          const expired = uploaded?.expiryDate ? new Date(uploaded.expiryDate).getTime() <= now : false;
          const busy = uploadingType === doc.type;
          const pendingFile = pendingFiles[doc.type];
          return (
            <Card key={doc.type}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-foundation-navy">{doc.label}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{requiredTypes.includes(doc.type) ? 'Required' : 'Optional'}</span>
                    {uploaded && !expired && <StatusBadge status="approved">Uploaded</StatusBadge>}
                    {uploaded && expired && <StatusBadge status="attention">Expired</StatusBadge>}
                  </div>
                  <p className="mt-1 text-sm text-concrete-grey">{doc.description}</p>
                  {uploaded && (
                    <p className="mt-2 text-sm text-foundation-navy">
                      <a href={`/api/retailer/verification/documents/${doc.type}`} download={uploaded.fileName} className="font-semibold text-steel-blue hover:underline">{uploaded.fileName}</a>
                      <span className="ml-2 text-concrete-grey">({formatFileSize(uploaded.sizeBytes)}) &middot; uploaded {new Date(uploaded.uploadedAt).toLocaleDateString('en-GB')}{uploaded.expiryDate && ` \u00b7 expires ${new Date(uploaded.expiryDate).toLocaleDateString('en-GB')}`}</span>
                    </p>
                  )}
                </div>
              </div>
              {(canEdit || verificationStatus === 'PENDING') && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold text-foundation-navy">File</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) setPendingFiles((current) => ({ ...current, [doc.type]: file }));
                      }}
                      className="text-sm"
                    />
                  </label>
                  {doc.expires && (
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-semibold text-foundation-navy">Expiry date</span>
                      <input
                        type="date"
                        min={minExpiryDate}
                        disabled={busy}
                        value={expiryDates[doc.type] ?? ''}
                        onChange={(event) => setExpiryDates((current) => ({ ...current, [doc.type]: event.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>
                  )}
                  <Button onClick={() => void handleUpload(doc.type)} loading={busy} disabled={!pendingFile || (doc.expires && !expiryDates[doc.type])}>
                    {uploaded ? 'Replace evidence' : 'Upload evidence'}
                  </Button>
                  {uploaded && (
                    <Button variant="danger" onClick={() => void handleRemove(doc.type)} disabled={busy}>Remove</Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-concrete-grey">
              {verificationStatus === 'VERIFIED' && 'This account is verified. No further action is required.'}
              {verificationStatus === 'PENDING' && 'Your request is under review. You can still upload or replace documents while it is pending.'}
              {isSoleTrader && 'AI verification is not available for sole trader profiles. Your quotes will show a Sole Trader status.'}
              {canEdit && !canSubmit && 'Upload every required document above, with a future expiry date, then submit your request for review.'}
              {canEdit && canSubmit && 'All required documents are uploaded. Submit your request for review.'}
            </p>
            {canEdit && (
              <Button onClick={handleSubmitForReview} loading={submitting} disabled={!canSubmit}>Submit for review</Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}


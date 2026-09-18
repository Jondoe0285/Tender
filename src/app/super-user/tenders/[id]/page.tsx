import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getComplianceOverview } from '@/server/domain/complianceMonitoringService';
import { TenderWarningForm } from '@/components/admin/TenderWarningForm';

export default async function HighRiskTenderReviewPage(props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER' || user.isAccountant) redirect('/login');
  const { id } = await props.params;
  const highRisk = (await getComplianceOverview()).flags.some((flag) => flag.severity === 'HIGH' && flag.targetType === 'Tender' && flag.targetId === id);
  if (!highRisk) notFound();
  const tender = await prisma.tender.findUnique({ where: { id }, select: { id: true, reference: true, category: true, subcategory: true, service: true, item: true, location: true, quantity: true, urgency: true, closingDate: true, supplyDate: true, requirements: true, description: true, status: true, createdAt: true, items: { select: { category: true, subcategory: true, item: true, quantity: true, description: true } }, packages: { select: { reference: true, category: true, subcategory: true, quantity: true, description: true } } } });
  if (!tender) notFound();

  return <AppShell role="super-user" title="High-Risk Tender Review"><div className="mx-auto max-w-4xl space-y-6">
    <Card><p className="text-xs font-semibold uppercase tracking-wide text-attention">High-risk tender</p><h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">{tender.reference}</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2">{[['Category', tender.category], ['Subcategory', tender.subcategory], ['Service', tender.service], ['Item', tender.item ?? 'Not specified'], ['Location', tender.location], ['Quantity', tender.quantity], ['Urgency', tender.urgency], ['Status', tender.status], ['Closing date', tender.closingDate.toLocaleDateString('en-GB')], ['Supply date', tender.supplyDate?.toLocaleDateString('en-GB') ?? 'Not specified']].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{label}</dt><dd className="mt-1 text-sm text-foundation-navy">{value}</dd></div>)}</dl><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Requirements</p><p className="mt-1 text-sm text-foundation-navy">{tender.requirements}</p></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Description</p><p className="mt-1 whitespace-pre-wrap text-sm text-foundation-navy">{tender.description}</p></div></Card>
    <Card><h2 className="font-heading text-lg font-bold text-foundation-navy">Issue warning</h2><p className="mt-1 text-sm text-concrete-grey">The recipient is fixed to this tender’s owner. Suspension is never automatic and requires a separate Owner decision.</p><div className="mt-5"><TenderWarningForm tenderId={tender.id} /></div></Card>
  </div></AppShell>;
}
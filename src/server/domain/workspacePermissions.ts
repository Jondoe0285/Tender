import { ForbiddenError } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { type BuyerDuty, canMakeSupplierPayment, hasBuyerDuty } from '@/lib/workspace-duties';

export async function assertBuyerDuty(userId: string, duty: BuyerDuty): Promise<void> {
  await assertAnyBuyerDuty(userId, [duty]);
}

export async function assertAnyBuyerDuty(userId: string, duties: BuyerDuty[]): Promise<void> {
  const membership = await prisma.clientCompanyMember.findUnique({
    where: { userId },
    select: { duties: true, company: { select: { primaryUserId: true } } },
  });
  if (!membership) return;
  if (membership.company.primaryUserId === userId) return;
  if (duties.some((duty) => hasBuyerDuty(membership.duties, duty))) return;
  throw new ForbiddenError(`${duties.join(' or ')} permission is required for this action`);
}

export async function assertSecondApprover(actorId: string, secondApproverEmail: string | undefined): Promise<string> {
  const email = String(secondApproverEmail ?? '').trim().toLowerCase();
  if (!email) throw new ForbiddenError('Percentage release fees at this amount require a second Approver email');
  const actorMembership = await prisma.clientCompanyMember.findUnique({
    where: { userId: actorId },
    select: { companyId: true, company: { select: { primaryUserId: true } } },
  });
  if (!actorMembership) throw new ForbiddenError('Add a second Approver in the buying company before using percentage fees above the threshold');
  const second = await prisma.user.findFirst({
    where: { email, clientCompanyMembership: { companyId: actorMembership.companyId } },
    select: { id: true, clientCompanyMembership: { select: { duties: true, company: { select: { primaryUserId: true } } } } },
  });
  if (!second || second.id === actorId) throw new ForbiddenError('Second Approver must be a different buying-company user');
  const membership = second.clientCompanyMembership;
  const isPrimary = membership?.company.primaryUserId === second.id;
  if (!isPrimary && !hasBuyerDuty(membership?.duties, 'APPROVER')) {
    throw new ForbiddenError('Second Approver must hold APPROVER');
  }
  return second.id;
}
export async function assertSupplierPaymentPermission(userId: string): Promise<void> {
  const membership = await prisma.retailerTeamMember.findUnique({
    where: { userId },
    select: { permissions: true },
  });
  if (!membership) return;
  if (!canMakeSupplierPayment(membership.permissions)) {
    throw new ForbiddenError('PAYMENTS permission is required to create this charge');
  }
}

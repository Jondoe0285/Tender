import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { requireOwner } from '@/server/auth/session';
import { adjustedBaselineGbp, calculateEstimateVariancePercent, effectiveBaselineOffsetPercent, setPricingIntelligenceManualOffset } from '@/server/domain/quoteEstimateService';
import { rejectCrossOrigin } from '@/server/http/origin';
import { toErrorResponse } from '@/server/http/errors';

const updateSchema = z.object({
  mode: z.enum(['AUTOMATIC', 'MANUAL']),
  manualOffsetPercent: z.number().min(-100).max(100).optional(),
});

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const owner = await requireOwner();
    const { id } = await props.params;
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid pricing offset details' }, { status: 400 });
    if (parsed.data.mode === 'MANUAL' && parsed.data.manualOffsetPercent === undefined) {
      return NextResponse.json({ error: 'Manual offset percentage is required' }, { status: 400 });
    }

    const row = await setPricingIntelligenceManualOffset(id, parsed.data.mode === 'AUTOMATIC' ? null : parsed.data.manualOffsetPercent!);
    await recordAuditEvent({
      actorId: owner.id,
      action: 'PRICING_INTELLIGENCE_OFFSET_UPDATED',
      targetType: 'QuoteEstimateBaseline',
      targetId: row.id,
      metadata: { key: row.key, mode: parsed.data.mode, manualOffsetPercent: parsed.data.manualOffsetPercent },
    });

    const effectiveOffsetPercent = effectiveBaselineOffsetPercent(row);
    const adjustedEstimateGbp = adjustedBaselineGbp(row.baselineGbp, effectiveOffsetPercent);
    const actualBaselineGbp = row.observedUnitPriceGbp;

    return NextResponse.json({
      row: {
        id: row.id,
        key: row.key,
        service: row.service,
        category: row.category,
        item: row.item,
        standardUnit: row.standardUnit,
        standardUnitSize: row.standardUnitSize,
        baselineGbp: row.baselineGbp,
        observedUnitPriceGbp: row.observedUnitPriceGbp,
        adjustedEstimateGbp,
        actualBaselineGbp,
        automaticOffsetPercent: row.automaticOffsetPercent,
        manualOffsetPercent: row.manualOffsetPercent,
        effectiveOffsetPercent,
        offsetMode: row.offsetMode,
        sampleSize: row.sampleSize,
        reviewedAt: row.reviewedAt,
        variancePercent: actualBaselineGbp ? calculateEstimateVariancePercent(row.baselineGbp, actualBaselineGbp) : 0,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

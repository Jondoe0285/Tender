import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/data/prisma';
import { requireFullSuperUser } from '@/server/auth/session';
import { rejectCrossOrigin } from '@/server/http/origin';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { CATEGORIES } from '@/lib/categories';

const categorySchema = z.object({
  service: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  items: z.array(z.string().trim().min(1).max(160)).min(1).max(100),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireFullSuperUser();
    const saved = await prisma.categoryDefinition.findMany({ orderBy: [{ service: 'asc' }, { name: 'asc' }] });
    const savedByKey = new Map(saved.map((category) => [`${category.service}:${category.name}`, category]));
    const categories = Object.entries(CATEGORIES).flatMap(([service, categoryMap]) => Object.entries(categoryMap).map(([name, items]) => {
      const override = savedByKey.get(`${service}:${name}`);
      return { id: override?.id ?? null, service, name, items: override ? JSON.parse(override.itemsJson) as string[] : items, active: override?.active ?? true };
    }));
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const admin = await requireFullSuperUser().catch(() => null);
  if (!admin) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });
  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid category details' }, { status: 400 });
  const input = parsed.data;
  const category = await prisma.categoryDefinition.upsert({
    where: { service_name: { service: input.service, name: input.name } },
    update: { itemsJson: JSON.stringify(input.items), ...(input.active === undefined ? {} : { active: input.active }) },
    create: { service: input.service, name: input.name, itemsJson: JSON.stringify(input.items), active: input.active ?? true },
  });
  await recordAuditEvent({ actorId: admin.id, action: input.active === false ? 'CATEGORY_DEACTIVATED' : 'CATEGORY_UPDATED', targetType: 'CategoryDefinition', targetId: category.id, metadata: { service: category.service, name: category.name, active: category.active } });
  return NextResponse.json({ category: { ...category, items: input.items } });
}

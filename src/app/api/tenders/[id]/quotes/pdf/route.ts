import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const tender = await prisma.tender.findFirst({
    where: { id: params.id, clientId: user.id },
    include: {
      quotes: {
        where: { status: { not: 'REJECTED' } },
        orderBy: { priceGbp: 'asc' },
        include: { lines: { include: { tenderItem: { select: { item: true, subcategory: true, quantity: true } } } }, charges: true },
      },
    },
  });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(14 / 255, 28 / 255, 46 / 255);
  const steel = rgb(29 / 255, 61 / 255, 92 / 255);
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const addText = (text: string, x: number, size = 10, bold = false) => {
    page.drawText(text.slice(0, 105), { x, y, size, font: bold ? boldFont : font, color: navy });
  };
  const addWrapped = (text: string, x: number, size = 9) => {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 92) {
        addText(line, x, size);
        y -= 14;
        line = '';
      }
      line += `${word} `;
    }
    if (line) addText(line, x, size);
    y -= 15;
  };

  addText('Trade Tender', 40, 18, true);
  y -= 28;
  addText('Quote comparison', 40, 14, true);
  y -= 22;
  addText(`${tender.reference} · ${tender.category} · ${tender.subcategory}`, 40, 10);
  y -= 16;
  addText(`Location: ${tender.location} · Closing date: ${tender.closingDate.toLocaleDateString('en-GB')}`, 40, 10);
  y -= 32;

  for (const quote of tender.quotes) {
    if (y < 120) {
      page = pdf.addPage([595, 842]);
      y = 790;
    }
    page.drawRectangle({ x: 36, y: y - 10, width: 523, height: 1, color: steel });
    y -= 28;
    addText(quote.reference, 40, 11, true);
    y -= 18;
    addText(`Price: £${quote.priceGbp} excl. VAT · Lead time: ${quote.leadTimeDays} days · Valid: ${quote.validityDays} days`, 40, 10);
    y -= 16;
    if (tender.supplyDate) addWrapped(`Requested supply date: ${tender.supplyDate.toLocaleDateString('en-GB')} · Confirmed: ${quote.deliveryDateConfirmed ? 'Yes' : 'No'}`, 40);
    for (const quoteLine of quote.lines) {
      addWrapped(`${quoteLine.tenderItem.item ?? quoteLine.tenderItem.subcategory} (${quoteLine.tenderItem.quantity}): ${quoteLine.available ? `£${quoteLine.priceGbp} excl. VAT` : 'Cannot supply'}`, 40);
    }
    for (const charge of quote.charges) {
      addWrapped(`${charge.description}: £${charge.priceGbp} excl. VAT`, 40);
    }
    addWrapped(`Delivery: ${quote.deliveryInfo}`, 40);
    y -= 8;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${tender.reference}-quote-comparison.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

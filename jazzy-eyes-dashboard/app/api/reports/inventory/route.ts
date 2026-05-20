import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type InventoryTransactionForStatus = {
  transactionType: string;
  writeOffReason: string | null;
};

function getDisplayStatus(
  currentQty: number,
  statusName: string | undefined,
  transactions: InventoryTransactionForStatus[]
) {
  if (currentQty === 0) {
    const depletionTransaction = [...transactions]
      .reverse()
      .find((t) => t.transactionType === 'SALE' || t.transactionType === 'WRITE_OFF');

    if (
      depletionTransaction?.transactionType === 'WRITE_OFF' &&
      depletionTransaction.writeOffReason === 'return'
    ) {
      return 'Returned';
    }

    if (depletionTransaction?.transactionType === 'SALE') {
      return 'Sold Out';
    }
  }

  if (statusName === 'Discontinued') {
    return 'Discontinued';
  }

  if (currentQty === 0) {
    return 'Sold Out';
  }

  return 'Active';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    const brandIdNum = parseInt(brandId);
    if (isNaN(brandIdNum)) {
      return NextResponse.json(
        { success: false, error: 'brandId must be a number' },
        { status: 400 }
      );
    }

    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), 0, 1);
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // System inception: 2026-01-08 was the day initial inventory was seeded
    // (807 ORDER transactions on one day). Anything on/before this counts as
    // Beginning, not Added — even when looking at the 2026 report.
    const INCEPTION_DATE = new Date('2026-01-08T23:59:59.999Z');
    const beginningBoundary =
      startDate.getTime() > INCEPTION_DATE.getTime()
        ? new Date(startDate.getTime() - 1)
        : INCEPTION_DATE;

    const brand = await prisma.brand.findUnique({
      where: { id: brandIdNum },
      select: { brandName: true, companyName: true },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    const products = await prisma.product.findMany({
      where: { brandId: brandIdNum },
      include: {
        status: { select: { name: true, colorScheme: true } },
        transactions: { orderBy: { transactionDate: 'asc' } },
      },
      orderBy: { compositeId: 'asc' },
    });

    // Per-frame flow computation
    const frames = products.map((p) => {
      let beginningQty = 0;
      let added = 0;
      let returned = 0;
      let sold = 0;
      let otherAdjustments = 0; // damaged/lost/defective write-offs + reverts

      for (const t of p.transactions) {
        const beforeWindow = t.transactionDate <= beginningBoundary;
        const inWindow = !beforeWindow && t.transactionDate <= endDate;

        // Signed delta from each transaction type
        let delta = 0;
        let bucket: 'added' | 'returned' | 'sold' | 'other' = 'other';
        switch (t.transactionType) {
          case 'ORDER':
          case 'RESTOCK':
            delta = t.quantity;
            bucket = 'added';
            break;
          case 'SALE':
            delta = -t.quantity;
            bucket = 'sold';
            break;
          case 'WRITE_OFF':
            delta = -t.quantity;
            bucket = t.writeOffReason === 'return' ? 'returned' : 'other';
            break;
          case 'REVERT_WRITE_OFF':
            delta = t.quantity;
            bucket = 'other';
            break;
        }

        if (beforeWindow) {
          beginningQty += delta;
        } else if (inWindow) {
          if (bucket === 'added') added += t.quantity;
          else if (bucket === 'sold') sold += t.quantity;
          else if (bucket === 'returned') returned += t.quantity;
          else otherAdjustments += -delta; // positive if subtraction
        }
      }

      const endingQty = beginningQty + added - returned - sold - otherAdjustments;
      const orderTx = p.transactions.find((t) => t.transactionType === 'ORDER');
      const retailPrice = orderTx ? Number(orderTx.unitPrice) : 0;
      const costPrice = orderTx ? Number(orderTx.unitCost) : 0;
      const displayStatus = getDisplayStatus(p.currentQty, p.status?.name, p.transactions);
      const discontinuedInStockQty = displayStatus === 'Discontinued' ? p.currentQty : 0;

      return {
        frameId: p.compositeId,
        model: p.styleNumber,
        color: p.colorCode,
        frameType: p.frameType,
        productType: p.productType,
        status: p.status?.name || 'Active',
        displayStatus,
        statusColorScheme: p.status?.colorScheme || 'green',
        beginningQty,
        added,
        returned,
        returnedOrDiscontinued: returned + discontinuedInStockQty,
        discontinuedInStockQty,
        sold,
        otherAdjustments,
        endingQty,
        currentQty: p.currentQty,
        retailPrice,
        costPrice,
        inventoryValue: costPrice * p.currentQty,
      };
    });

    // Brand-level rollup
    const summary = frames.reduce(
      (acc, f) => ({
        beginningQty: acc.beginningQty + f.beginningQty,
        added: acc.added + f.added,
        ongoingInventory: acc.ongoingInventory + f.beginningQty + f.added,
        returned: acc.returned + f.returned,
        returnedOrDiscontinued: acc.returnedOrDiscontinued + f.returnedOrDiscontinued,
        discontinuedInStockQty: acc.discontinuedInStockQty + f.discontinuedInStockQty,
        sold: acc.sold + f.sold,
        otherAdjustments: acc.otherAdjustments + f.otherAdjustments,
        endingQty: acc.endingQty + f.endingQty,
        currentQty: acc.currentQty + f.currentQty,
        currentInventory: acc.currentInventory + f.currentQty - f.discontinuedInStockQty,
        inventoryValue: acc.inventoryValue + f.inventoryValue,
      }),
      {
        beginningQty: 0,
        added: 0,
        ongoingInventory: 0,
        returned: 0,
        returnedOrDiscontinued: 0,
        discontinuedInStockQty: 0,
        sold: 0,
        otherAdjustments: 0,
        endingQty: 0,
        currentQty: 0,
        currentInventory: 0,
        inventoryValue: 0,
      }
    );

    // Special orders (preserved for backwards compat with the page)
    const specialOrders = await prisma.inventoryTransaction.findMany({
      where: {
        isSpecialOrder: true,
        product: { brandId: brandIdNum },
      },
      include: {
        product: {
          select: {
            compositeId: true,
            styleNumber: true,
            colorCode: true,
            frameType: true,
            productType: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    const specialOrderItems = specialOrders.map((so) => ({
      id: so.id,
      frameId: so.product.compositeId,
      model: so.product.styleNumber,
      color: so.product.colorCode,
      frameType: so.product.frameType,
      productType: so.product.productType,
      quantity: so.quantity,
      unitCost: Number(so.unitCost),
      unitPrice: Number(so.unitPrice),
      transactionDate: so.transactionDate.toISOString(),
      invoiceNumber: so.invoiceNumber,
      status: so.status,
      notes: so.notes,
    }));

    return NextResponse.json({
      success: true,
      brandName: brand.brandName,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: {
        ...summary,
        totalFrames: frames.length,
        specialOrderCount: specialOrderItems.length,
      },
      frames,
      specialOrders: specialOrderItems,
    });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory report' },
      { status: 500 }
    );
  }
}

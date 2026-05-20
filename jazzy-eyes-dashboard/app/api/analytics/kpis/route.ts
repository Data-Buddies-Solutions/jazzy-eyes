import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateReturnCreditSummaries, type CreditLedgerEvent } from '@/lib/analytics/return-credits';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Total inventory value & qty on hand: sum across all products with qty > 0,
    // using each product's most recent ORDER unitCost (with brand discount if applicable).
    const products = await prisma.product.findMany({
      where: { currentQty: { gt: 0 } },
      include: {
        status: { select: { name: true } },
        brand: { select: { brandName: true, costDiscountPercent: true, costDiscountStartDate: true } },
        transactions: {
          where: { transactionType: { in: ['ORDER', 'RESTOCK'] } },
          orderBy: { transactionDate: 'desc' },
          take: 1,
        },
      },
    });

    let totalInventoryValue = 0;
    let totalQtyOnHand = 0;
    let discontinuedInStock = 0;
    for (const p of products) {
      const orderTx = p.transactions[0];
      let unitCost = orderTx ? Number(orderTx.unitCost) : 0;
      if (
        unitCost > 0 &&
        p.brand.costDiscountPercent &&
        Number(p.brand.costDiscountPercent) > 0 &&
        p.brand.costDiscountStartDate &&
        new Date() >= p.brand.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - Number(p.brand.costDiscountPercent) / 100);
      }
      totalInventoryValue += unitCost * p.currentQty;
      totalQtyOnHand += p.currentQty;
      if (p.status?.name === 'Discontinued') {
        discontinuedInStock += p.currentQty;
      }
    }
    const currentInventory = totalQtyOnHand - discontinuedInStock;

    // Returns in window: WRITE_OFF rows with reason='return' in date range.
    // Credit value per row = quantity * product's most-recent ORDER cost (with brand discount).
    const returnWriteOffs = await prisma.inventoryTransaction.findMany({
      where: {
        transactionType: 'WRITE_OFF',
        writeOffReason: 'return',
        transactionDate: { gte: startDate, lte: endDate },
      },
      include: {
        product: {
          include: {
            brand: { select: { brandName: true, costDiscountPercent: true, costDiscountStartDate: true } },
            transactions: {
              where: { transactionType: { in: ['ORDER', 'RESTOCK'] } },
              orderBy: { transactionDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    let returnsCount = 0;
    let returnsCreditValue = 0;
    for (const wo of returnWriteOffs) {
      const orderTx = wo.product.transactions[0];
      let unitCost = orderTx ? Number(orderTx.unitCost) : 0;
      const brand = wo.product.brand;
      if (
        unitCost > 0 &&
        brand.costDiscountPercent &&
        Number(brand.costDiscountPercent) > 0 &&
        brand.costDiscountStartDate &&
        wo.transactionDate >= brand.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - Number(brand.costDiscountPercent) / 100);
      }
      returnsCount += wo.quantity;
      returnsCreditValue += unitCost * wo.quantity;
    }

    // Outstanding credit balance across all brands: walk full ledger to "now".
    const allReturns = await prisma.inventoryTransaction.findMany({
      where: { transactionType: 'WRITE_OFF', writeOffReason: 'return' },
      include: {
        product: {
          include: {
            brand: { select: { brandName: true, costDiscountPercent: true, costDiscountStartDate: true } },
            transactions: {
              where: { transactionType: { in: ['ORDER', 'RESTOCK'] } },
              orderBy: { transactionDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const allInventorySales = await prisma.inventoryTransaction.findMany({
      where: { transactionType: 'SALE' },
      include: {
        product: {
          include: {
            brand: { select: { brandName: true, costDiscountPercent: true, costDiscountStartDate: true } },
            transactions: {
              where: { transactionType: { in: ['ORDER', 'RESTOCK'] } },
              orderBy: { transactionDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    const allRxSales = await prisma.rxSale.findMany({
      include: { brand: { select: { brandName: true } } },
    });

    const events: CreditLedgerEvent[] = [];
    for (const r of allReturns) {
      const orderTx = r.product.transactions[0];
      let unitCost = orderTx ? Number(orderTx.unitCost) : 0;
      const brand = r.product.brand;
      if (
        unitCost > 0 &&
        brand.costDiscountPercent &&
        Number(brand.costDiscountPercent) > 0 &&
        brand.costDiscountStartDate &&
        r.transactionDate >= brand.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - Number(brand.costDiscountPercent) / 100);
      }
      events.push({
        brandName: brand.brandName,
        date: r.transactionDate,
        type: 'RETURN_CREDIT',
        amount: unitCost * r.quantity,
      });
    }
    for (const s of allInventorySales) {
      let cogs = Number(s.unitCost);
      if (cogs === 0 && s.product.transactions.length > 0) {
        cogs = Number(s.product.transactions[0].unitCost);
        const brand = s.product.brand;
        if (
          brand.costDiscountPercent &&
          Number(brand.costDiscountPercent) > 0 &&
          brand.costDiscountStartDate &&
          s.transactionDate >= brand.costDiscountStartDate
        ) {
          cogs = cogs * (1 - Number(brand.costDiscountPercent) / 100);
        }
      }
      if (cogs <= 0) continue;
      events.push({
        brandName: s.product.brand.brandName,
        date: s.transactionDate,
        type: 'COST',
        amount: cogs * s.quantity,
      });
    }
    for (const rx of allRxSales) {
      const cogs = Number(rx.costPrice);
      if (cogs <= 0) continue;
      events.push({
        brandName: rx.brand.brandName,
        date: rx.saleDate,
        type: 'COST',
        amount: cogs,
      });
    }

    const summaries = calculateReturnCreditSummaries(events, startDate, endDate);
    const outstandingCreditBalance = summaries.reduce(
      (sum, s) => sum + s.endingCreditBalance,
      0
    );

    return NextResponse.json({
      success: true,
      totalInventoryValue,
      totalQtyOnHand,
      currentInventory,
      discontinuedInStock,
      returnsCount,
      returnsCreditValue,
      outstandingCreditBalance,
    });
  } catch (error) {
    console.error('Error in kpis API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}

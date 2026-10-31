import { NextRequest, NextResponse } from 'next/server';
import { inStockProductRows, returnWriteOffRows, rxSaleRows, saleRows } from '@/db/analytics';
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

    const range = { start: startDate, end: endDate };
    const products = await inStockProductRows();

    let totalInventoryValue = 0;
    let totalQtyOnHand = 0;
    let discontinuedInStock = 0;
    for (const p of products) {
      let unitCost = p.latestOrderCost ?? 0;
      if (
        unitCost > 0 &&
        p.costDiscountPercent &&
        p.costDiscountPercent > 0 &&
        p.costDiscountStartDate &&
        new Date() >= p.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - p.costDiscountPercent / 100);
      }
      totalInventoryValue += unitCost * p.currentQty;
      totalQtyOnHand += p.currentQty;
      if (p.statusName === 'Discontinued') {
        discontinuedInStock += p.currentQty;
      }
    }
    const currentInventory = totalQtyOnHand - discontinuedInStock;

    const returnWriteOffs = await returnWriteOffRows(range);

    let returnsCount = 0;
    let returnsCreditValue = 0;
    for (const wo of returnWriteOffs) {
      returnsCount += wo.quantity;
      returnsCreditValue += returnUnitCost(wo) * wo.quantity;
    }

    const allReturns = await returnWriteOffRows();
    const allInventorySales = await saleRows();
    const allRxSales = await rxSaleRows();

    const events: CreditLedgerEvent[] = [];
    for (const r of allReturns) {
      events.push({
        brandName: r.brandName,
        date: r.transactionDate,
        type: 'RETURN_CREDIT',
        amount: returnUnitCost(r) * r.quantity,
      });
    }
    for (const s of allInventorySales) {
      let cogs = s.unitCost;
      if (cogs === 0 && s.latestOrderCost !== null) {
        cogs = s.latestOrderCost;
        if (
          s.costDiscountPercent &&
          s.costDiscountPercent > 0 &&
          s.costDiscountStartDate &&
          s.transactionDate >= s.costDiscountStartDate
        ) {
          cogs = cogs * (1 - s.costDiscountPercent / 100);
        }
      }
      if (cogs <= 0) continue;
      events.push({
        brandName: s.brandName,
        date: s.transactionDate,
        type: 'COST',
        amount: cogs * s.quantity,
      });
    }
    for (const rx of allRxSales) {
      const cogs = rx.costPrice;
      if (cogs <= 0) continue;
      events.push({
        brandName: rx.brandName,
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

type ReturnWriteOff = Awaited<ReturnType<typeof returnWriteOffRows>>[number];

// A return credits the product's latest order cost, discounted when the return falls
// on or after the brand's discount start.
function returnUnitCost(wo: ReturnWriteOff): number {
  let unitCost = wo.latestOrderCost ?? 0;
  if (
    unitCost > 0 &&
    wo.costDiscountPercent &&
    wo.costDiscountPercent > 0 &&
    wo.costDiscountStartDate &&
    wo.transactionDate >= wo.costDiscountStartDate
  ) {
    unitCost = unitCost * (1 - wo.costDiscountPercent / 100);
  }
  return unitCost;
}

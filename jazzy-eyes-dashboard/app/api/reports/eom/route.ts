import { NextRequest, NextResponse } from 'next/server';
import { allReturnsEver, allRxSalesEver, allSalesEver, returnsInPeriod, rxSalesInPeriod, salesInPeriod } from '@/db/reports';
import { calculateReturnCreditSummaries, type CreditLedgerEvent } from '@/lib/analytics/return-credits';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString(), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, error: 'Invalid year or month parameter' },
        { status: 400 }
      );
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const period = { start: startDate, end: endDate };
    const inventorySales = await salesInPeriod(period);
    const rxSales = await rxSalesInPeriod(period);

    const formattedInventorySales = inventorySales.map((sale) => {
      let unitCost = Number(sale.unitCost);
      if (unitCost === 0 && sale.receivedUnitCost !== null) {
        unitCost = Number(sale.receivedUnitCost);
        if (
          sale.costDiscountPercent &&
          Number(sale.costDiscountPercent) > 0 &&
          sale.costDiscountStartDate &&
          sale.transactionDate >= sale.costDiscountStartDate
        ) {
          unitCost = unitCost * (1 - Number(sale.costDiscountPercent) / 100);
        }
      }

      return {
        id: sale.id,
        type: 'Inventory' as const,
        date: sale.transactionDate,
        brandName: sale.brandName,
        styleNumber: sale.styleNumber,
        colorCode: sale.colorCode,
        eyeSize: sale.eyeSize,
        gender: sale.gender,
        frameType: sale.frameType,
        productType: sale.productType,
        quantity: sale.quantity,
        unitPrice: Number(sale.unitPrice),
        unitCost,
        totalRevenue: Number(sale.unitPrice) * sale.quantity,
        totalCost: unitCost * sale.quantity,
        profit: (Number(sale.unitPrice) - unitCost) * sale.quantity,
      };
    });

    const formattedRxSales = rxSales.map((sale) => ({
      id: sale.id,
      type: 'RX' as const,
      date: sale.saleDate,
      brandName: sale.brandName,
      styleNumber: sale.styleNumber,
      colorCode: sale.colorCode,
      eyeSize: sale.eyeSize,
      gender: sale.gender,
      frameType: sale.frameType,
      productType: sale.productType,
      quantity: 1,
      unitPrice: Number(sale.salePrice),
      unitCost: Number(sale.costPrice),
      totalRevenue: Number(sale.salePrice),
      totalCost: Number(sale.costPrice),
      profit: Number(sale.salePrice) - Number(sale.costPrice),
    }));

    const allSales = [...formattedInventorySales, ...formattedRxSales].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const totalRevenue = allSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
    const totalCost = allSales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalUnits = allSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const inventoryUnits = formattedInventorySales.reduce((sum, sale) => sum + sale.quantity, 0);
    const rxUnits = formattedRxSales.length;

    const brandSummary: Record<string, { units: number; revenue: number; cost: number; profit: number }> = {};
    allSales.forEach((sale) => {
      if (!brandSummary[sale.brandName]) {
        brandSummary[sale.brandName] = { units: 0, revenue: 0, cost: 0, profit: 0 };
      }
      brandSummary[sale.brandName].units += sale.quantity;
      brandSummary[sale.brandName].revenue += sale.totalRevenue;
      brandSummary[sale.brandName].cost += sale.totalCost;
      brandSummary[sale.brandName].profit += sale.profit;
    });

    const brandSummaryArray = Object.entries(brandSummary)
      .map(([brandName, data]) => ({
        brandName,
        ...data,
        marginPercent: data.revenue > 0 ? ((data.profit / data.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const returnsInMonth = await returnsInPeriod(period);

    type ReturnRow = {
      brandName: string;
      styleNumber: string;
      colorCode: string;
      eyeSize: string;
      date: Date;
      quantity: number;
      creditPerUnit: number;
      creditValue: number;
    };
    const returnRows: ReturnRow[] = [];
    const returnsByBrand: Record<string, { units: number; creditValue: number }> = {};
    for (const r of returnsInMonth) {
      let unitCost = r.receivedUnitCost ?? 0;
      if (
        unitCost > 0 &&
        r.costDiscountPercent &&
        Number(r.costDiscountPercent) > 0 &&
        r.costDiscountStartDate &&
        r.transactionDate >= r.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - Number(r.costDiscountPercent) / 100);
      }
      const creditValue = unitCost * r.quantity;
      returnRows.push({
        brandName: r.brandName,
        styleNumber: r.styleNumber,
        colorCode: r.colorCode,
        eyeSize: r.eyeSize,
        date: r.transactionDate,
        quantity: r.quantity,
        creditPerUnit: unitCost,
        creditValue,
      });
      if (!returnsByBrand[r.brandName]) {
        returnsByBrand[r.brandName] = { units: 0, creditValue: 0 };
      }
      returnsByBrand[r.brandName].units += r.quantity;
      returnsByBrand[r.brandName].creditValue += creditValue;
    }

    const allInventorySales = await allSalesEver();
    const allRxSaleRows = await allRxSalesEver();
    const allReturnRows = await allReturnsEver();
    const creditEvents: CreditLedgerEvent[] = [];
    for (const s of allInventorySales) {
      let cogs = Number(s.unitCost);
      if (cogs === 0 && s.receivedUnitCost !== null) {
        cogs = Number(s.receivedUnitCost);
        if (
          s.costDiscountPercent &&
          Number(s.costDiscountPercent) > 0 &&
          s.costDiscountStartDate &&
          s.transactionDate >= s.costDiscountStartDate
        ) {
          cogs = cogs * (1 - Number(s.costDiscountPercent) / 100);
        }
      }
      if (cogs <= 0) continue;
      creditEvents.push({
        brandName: s.brandName,
        date: s.transactionDate,
        type: 'COST',
        amount: cogs * s.quantity,
      });
    }
    for (const rx of allRxSaleRows) {
      const cogs = Number(rx.costPrice);
      if (cogs <= 0) continue;
      creditEvents.push({
        brandName: rx.brandName,
        date: rx.saleDate,
        type: 'COST',
        amount: cogs,
      });
    }
    for (const r of allReturnRows) {
      let unitCost = r.receivedUnitCost ?? 0;
      if (
        unitCost > 0 &&
        r.costDiscountPercent &&
        Number(r.costDiscountPercent) > 0 &&
        r.costDiscountStartDate &&
        r.transactionDate >= r.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - Number(r.costDiscountPercent) / 100);
      }
      creditEvents.push({
        brandName: r.brandName,
        date: r.transactionDate,
        type: 'RETURN_CREDIT',
        amount: unitCost * r.quantity,
      });
    }
    const summaries = calculateReturnCreditSummaries(creditEvents, startDate, endDate);

    const returnsBrandSummary = summaries
      .filter(
        (s) =>
          (returnsByBrand[s.brandName]?.units ?? 0) > 0 ||
          s.returnCredits > 0 ||
          s.creditsApplied > 0 ||
          s.endingCreditBalance > 0 ||
          s.startingCreditBalance > 0
      )
      .map((s) => ({
        brandName: s.brandName,
        returnedUnits: returnsByBrand[s.brandName]?.units ?? 0,
        startingCreditBalance: s.startingCreditBalance,
        creditGenerated: s.returnCredits,
        creditsApplied: s.creditsApplied,
        endingCreditBalance: s.endingCreditBalance,
      }))
      .sort((a, b) => b.creditGenerated - a.creditGenerated);

    const totalReturnedUnits = returnRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalCreditGenerated = returnRows.reduce((sum, r) => sum + r.creditValue, 0);
    const totalCreditsApplied = summaries.reduce((sum, s) => sum + s.creditsApplied, 0);
    const totalOutstandingCredit = summaries.reduce((sum, s) => sum + s.endingCreditBalance, 0);

    return NextResponse.json({
      success: true,
      report: {
        period: {
          year,
          month,
          monthName: startDate.toLocaleString('default', { month: 'long' }),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalSales: allSales.length,
          totalUnits,
          inventoryUnits,
          rxUnits,
          totalRevenue,
          totalCost,
          totalProfit,
          averageMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0,
          averageSalePrice: totalUnits > 0 ? (totalRevenue / totalUnits) : 0,
          totalReturnedUnits,
          totalCreditGenerated,
          totalCreditsApplied,
          totalOutstandingCredit,
        },
        brandSummary: brandSummaryArray,
        returnsBrandSummary,
        returnRows: returnRows.map((r) => ({ ...r, date: r.date.toISOString() })),
        sales: allSales,
      },
    });
  } catch (error) {
    console.error('Error generating EOM report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

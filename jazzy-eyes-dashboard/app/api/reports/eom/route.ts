import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Fetch inventory sales (SALE transactions)
    const inventorySales = await prisma.inventoryTransaction.findMany({
      where: {
        transactionType: 'SALE',
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: {
          include: {
            brand: true,
            transactions: {
              where: {
                transactionType: { in: ['ORDER', 'RESTOCK'] },
              },
              orderBy: { transactionDate: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    // Fetch RX sales
    const rxSales = await prisma.rxSale.findMany({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        brand: true,
      },
      orderBy: {
        saleDate: 'asc',
      },
    });

    // Format inventory sales
    const formattedInventorySales = inventorySales.map((sale) => {
      // Use SALE transaction cost, or fallback to ORDER transaction cost if SALE cost is 0
      let unitCost = Number(sale.unitCost);
      if (unitCost === 0 && sale.product.transactions.length > 0) {
        unitCost = Number(sale.product.transactions[0].unitCost);
        // Apply brand discount to fallback cost for sales on/after discount start date
        const brand = sale.product.brand;
        if (
          brand.costDiscountPercent &&
          Number(brand.costDiscountPercent) > 0 &&
          brand.costDiscountStartDate &&
          sale.transactionDate >= brand.costDiscountStartDate
        ) {
          unitCost = unitCost * (1 - Number(brand.costDiscountPercent) / 100);
        }
      }

      return {
        id: sale.id,
        type: 'Inventory' as const,
        date: sale.transactionDate,
        brandName: sale.product.brand.brandName,
        styleNumber: sale.product.styleNumber,
        colorCode: sale.product.colorCode,
        eyeSize: sale.product.eyeSize,
        gender: sale.product.gender,
        frameType: sale.product.frameType,
        productType: sale.product.productType,
        quantity: sale.quantity,
        unitPrice: Number(sale.unitPrice),
        unitCost,
        totalRevenue: Number(sale.unitPrice) * sale.quantity,
        totalCost: unitCost * sale.quantity,
        profit: (Number(sale.unitPrice) - unitCost) * sale.quantity,
      };
    });

    // Format RX sales
    const formattedRxSales = rxSales.map((sale) => ({
      id: sale.id,
      type: 'RX' as const,
      date: sale.saleDate,
      brandName: sale.brand.brandName,
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

    // Combine and sort by date
    const allSales = [...formattedInventorySales, ...formattedRxSales].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summaries
    const totalRevenue = allSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
    const totalCost = allSales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalUnits = allSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const inventoryUnits = formattedInventorySales.reduce((sum, sale) => sum + sale.quantity, 0);
    const rxUnits = formattedRxSales.length;

    // Summary by brand
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

    // Convert to sorted array
    const brandSummaryArray = Object.entries(brandSummary)
      .map(([brandName, data]) => ({
        brandName,
        ...data,
        marginPercent: data.revenue > 0 ? ((data.profit / data.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // ---- Returns + credit ledger ----
    const returnsInMonth = await prisma.inventoryTransaction.findMany({
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
      const creditValue = unitCost * r.quantity;
      returnRows.push({
        brandName: brand.brandName,
        styleNumber: r.product.styleNumber,
        colorCode: r.product.colorCode,
        eyeSize: r.product.eyeSize,
        date: r.transactionDate,
        quantity: r.quantity,
        creditPerUnit: unitCost,
        creditValue,
      });
      if (!returnsByBrand[brand.brandName]) {
        returnsByBrand[brand.brandName] = { units: 0, creditValue: 0 };
      }
      returnsByBrand[brand.brandName].units += r.quantity;
      returnsByBrand[brand.brandName].creditValue += creditValue;
    }

    // Build full credit ledger across all time. Credits apply against cost of goods sold (COGS).
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
    const creditEvents: CreditLedgerEvent[] = [];
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
      creditEvents.push({
        brandName: s.product.brand.brandName,
        date: s.transactionDate,
        type: 'COST',
        amount: cogs * s.quantity,
      });
    }
    for (const rx of allRxSales) {
      const cogs = Number(rx.costPrice);
      if (cogs <= 0) continue;
      creditEvents.push({
        brandName: rx.brand.brandName,
        date: rx.saleDate,
        type: 'COST',
        amount: cogs,
      });
    }
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
      creditEvents.push({
        brandName: brand.brandName,
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

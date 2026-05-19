import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MarginsResponse } from '@/types/analytics';
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

    // Get all SALE transactions in the date range with their products (inventory sales)
    const saleTransactions = await prisma.inventoryTransaction.findMany({
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
            brand: {
              select: {
                brandName: true,
                costDiscountPercent: true,
                costDiscountStartDate: true,
              },
            },
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
    });

    // Get all RX sales in the date range
    const rxSales = await prisma.rxSale.findMany({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        brand: {
          select: {
            brandName: true,
          },
        },
      },
    });

    // Calculate margins by brand
    const brandMarginMap = new Map<
      string,
      {
        totalRevenue: number;
        totalCost: number;
        unitsSold: number;
      }
    >();

    // Calculate margins by product type
    const productTypeMarginMap = new Map<
      string,
      {
        revenue: number;
        cost: number;
      }
    >();

    // Process inventory sale transactions
    saleTransactions.forEach((saleTransaction) => {
      const brandName = saleTransaction.product.brand.brandName;
      const brand = saleTransaction.product.brand;

      const revenue = Number(saleTransaction.unitPrice);
      // Use SALE transaction's unitCost (includes FIFO + brand discount), fallback to ORDER cost for older records
      let cost = Number(saleTransaction.unitCost);
      if (cost === 0 && saleTransaction.product.transactions.length > 0) {
        cost = Number(saleTransaction.product.transactions[0].unitCost);
        // Apply brand discount to fallback cost for sales on/after discount start date
        if (
          brand.costDiscountPercent &&
          Number(brand.costDiscountPercent) > 0 &&
          brand.costDiscountStartDate &&
          saleTransaction.transactionDate >= brand.costDiscountStartDate
        ) {
          cost = cost * (1 - Number(brand.costDiscountPercent) / 100);
        }
      }

      // By brand
      if (!brandMarginMap.has(brandName)) {
        brandMarginMap.set(brandName, {
          totalRevenue: 0,
          totalCost: 0,
          unitsSold: 0,
        });
      }

      const brandData = brandMarginMap.get(brandName)!;
      brandData.totalRevenue += revenue;
      brandData.totalCost += cost;
      brandData.unitsSold += 1;

      // By product type
      const productType = saleTransaction.product.productType;
      if (!productTypeMarginMap.has(productType)) {
        productTypeMarginMap.set(productType, {
          revenue: 0,
          cost: 0,
        });
      }

      const productTypeData = productTypeMarginMap.get(productType)!;
      productTypeData.revenue += revenue;
      productTypeData.cost += cost;
    });

    // Process RX sales (include if they have cost data)
    rxSales.forEach((rx) => {
      const brandName = rx.brand.brandName;
      const revenue = Number(rx.salePrice);
      const cost = Number(rx.costPrice);

      // Only include in margin calculations if we have cost data
      if (cost <= 0) return;

      // By brand
      if (!brandMarginMap.has(brandName)) {
        brandMarginMap.set(brandName, {
          totalRevenue: 0,
          totalCost: 0,
          unitsSold: 0,
        });
      }

      const brandData = brandMarginMap.get(brandName)!;
      brandData.totalRevenue += revenue;
      brandData.totalCost += cost;
      brandData.unitsSold += 1;

      // By product type (RX sales have productType field)
      const productType = rx.productType;
      if (!productTypeMarginMap.has(productType)) {
        productTypeMarginMap.set(productType, {
          revenue: 0,
          cost: 0,
        });
      }

      const productTypeData = productTypeMarginMap.get(productType)!;
      productTypeData.revenue += revenue;
      productTypeData.cost += cost;
    });

    // Build credit ledger events (SALE COGS + RX COGS + return WRITE_OFFs) across all time
    // so the per-brand starting balance is correct. Credits apply against cost of goods sold.
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
    const creditByBrand = new Map(
      calculateReturnCreditSummaries(creditEvents, startDate, endDate).map((s) => [s.brandName, s])
    );

    // Format by brand
    const byBrand = Array.from(brandMarginMap.entries())
      .map(([brandName, data]) => {
        const grossProfit = data.totalRevenue - data.totalCost;
        const marginPercent =
          data.totalRevenue > 0 ? (grossProfit / data.totalRevenue) * 100 : 0;
        const avgSalePrice =
          data.unitsSold > 0 ? data.totalRevenue / data.unitsSold : 0;

        const credits = creditByBrand.get(brandName);
        const startingCreditBalance = credits?.startingCreditBalance ?? 0;
        const returnCredits = credits?.returnCredits ?? 0;
        const creditsApplied = credits?.creditsApplied ?? 0;
        const endingCreditBalance = credits?.endingCreditBalance ?? 0;
        const netCost = data.totalCost - creditsApplied;
        const adjustedProfit = data.totalRevenue - netCost;

        return {
          brandName,
          totalRevenue: data.totalRevenue,
          totalCost: data.totalCost,
          grossProfit,
          marginPercent,
          unitsSold: data.unitsSold,
          avgSalePrice,
          startingCreditBalance,
          returnCredits,
          creditsApplied,
          endingCreditBalance,
          netCost,
          adjustedProfit,
        };
      })
      .sort((a, b) => b.marginPercent - a.marginPercent);

    // Also surface brands that have credits but no sales in window
    for (const [brandName, summary] of creditByBrand) {
      if (byBrand.find((b) => b.brandName === brandName)) continue;
      if (summary.returnCredits === 0 && summary.endingCreditBalance === 0) continue;
      byBrand.push({
        brandName,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        marginPercent: 0,
        unitsSold: 0,
        avgSalePrice: 0,
        startingCreditBalance: summary.startingCreditBalance,
        returnCredits: summary.returnCredits,
        creditsApplied: summary.creditsApplied,
        endingCreditBalance: summary.endingCreditBalance,
        netCost: -summary.creditsApplied,
        adjustedProfit: summary.creditsApplied,
      });
    }

    // Format by product type
    const byProductType = Array.from(productTypeMarginMap.entries()).map(
      ([productType, data]) => {
        const profit = data.revenue - data.cost;
        const marginPercent = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

        return {
          productType,
          revenue: data.revenue,
          profit,
          marginPercent,
        };
      }
    );

    // Calculate overall metrics
    const totalRevenue = byBrand.reduce((sum, b) => sum + b.totalRevenue, 0);
    const totalProfit = byBrand.reduce((sum, b) => sum + b.grossProfit, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const bestMarginBrand =
      byBrand.length > 0 ? byBrand[0].brandName : 'N/A';
    const worstMarginBrand =
      byBrand.length > 0 ? byBrand[byBrand.length - 1].brandName : 'N/A';

    const response: MarginsResponse = {
      success: true,
      byBrand,
      byProductType,
      overall: {
        totalRevenue,
        totalProfit,
        avgMargin,
        bestMarginBrand,
        worstMarginBrand,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in margins API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch margins data' },
      { status: 500 }
    );
  }
}

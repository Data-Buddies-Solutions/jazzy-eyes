import { NextRequest, NextResponse } from 'next/server';
import { returnWriteOffRows, rxSaleRows, saleRows } from '@/db/analytics';
import type { MarginsResponse } from '@/types/analytics';

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
    const saleTransactions = await saleRows(range);
    const rxSales = await rxSaleRows(range);

    const brandMarginMap = new Map<
      string,
      {
        totalRevenue: number;
        totalCost: number;
        unitsSold: number;
      }
    >();

    const productTypeMarginMap = new Map<
      string,
      {
        revenue: number;
        cost: number;
      }
    >();

    saleTransactions.forEach((saleTransaction) => {
      const brandName = saleTransaction.brandName;

      const revenue = saleTransaction.unitPrice;
      let cost = saleTransaction.unitCost;
      if (cost === 0 && saleTransaction.latestOrderCost !== null) {
        cost = saleTransaction.latestOrderCost;
        if (
          saleTransaction.costDiscountPercent &&
          saleTransaction.costDiscountPercent > 0 &&
          saleTransaction.costDiscountStartDate &&
          saleTransaction.transactionDate >= saleTransaction.costDiscountStartDate
        ) {
          cost = cost * (1 - saleTransaction.costDiscountPercent / 100);
        }
      }

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

      const productType = saleTransaction.productType;
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

    rxSales.forEach((rx) => {
      const brandName = rx.brandName;
      const revenue = rx.salePrice;
      const cost = rx.costPrice;

      if (cost <= 0) return;

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

    const returnWriteOffs = await returnWriteOffRows(range);

    const returnCreditsByBrand = new Map<string, number>();
    for (const r of returnWriteOffs) {
      let unitCost = r.latestOrderCost ?? 0;
      if (
        unitCost > 0 &&
        r.costDiscountPercent &&
        r.costDiscountPercent > 0 &&
        r.costDiscountStartDate &&
        r.transactionDate >= r.costDiscountStartDate
      ) {
        unitCost = unitCost * (1 - r.costDiscountPercent / 100);
      }
      returnCreditsByBrand.set(
        r.brandName,
        (returnCreditsByBrand.get(r.brandName) ?? 0) + unitCost * r.quantity
      );
    }

    const byBrand = Array.from(brandMarginMap.entries())
      .map(([brandName, data]) => {
        const grossProfit = data.totalRevenue - data.totalCost;
        const marginPercent =
          data.totalRevenue > 0 ? (grossProfit / data.totalRevenue) * 100 : 0;
        const avgSalePrice =
          data.unitsSold > 0 ? data.totalRevenue / data.unitsSold : 0;

        const returnCredits = returnCreditsByBrand.get(brandName) ?? 0;

        return {
          brandName,
          totalRevenue: data.totalRevenue,
          totalCost: data.totalCost,
          grossProfit,
          marginPercent,
          unitsSold: data.unitsSold,
          avgSalePrice,
          returnCredits,
        };
      })
      .sort((a, b) => b.marginPercent - a.marginPercent);

    for (const [brandName, returnCredits] of returnCreditsByBrand) {
      if (byBrand.find((b) => b.brandName === brandName)) continue;
      if (returnCredits === 0) continue;
      byBrand.push({
        brandName,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        marginPercent: 0,
        unitsSold: 0,
        avgSalePrice: 0,
        returnCredits,
      });
    }

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

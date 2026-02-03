import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
              },
            },
            transactions: {
              where: {
                transactionType: 'ORDER',
              },
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
      const orderTransaction = saleTransaction.product.transactions[0];

      if (!orderTransaction) return;

      const revenue = Number(saleTransaction.unitPrice);
      const cost = Number(orderTransaction.unitCost);

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

    // Format by brand
    const byBrand = Array.from(brandMarginMap.entries())
      .map(([brandName, data]) => {
        const grossProfit = data.totalRevenue - data.totalCost;
        const marginPercent =
          data.totalRevenue > 0 ? (grossProfit / data.totalRevenue) * 100 : 0;
        const avgSalePrice =
          data.unitsSold > 0 ? data.totalRevenue / data.unitsSold : 0;

        return {
          brandName,
          totalRevenue: data.totalRevenue,
          totalCost: data.totalCost,
          grossProfit,
          marginPercent,
          unitsSold: data.unitsSold,
          avgSalePrice,
        };
      })
      .sort((a, b) => b.marginPercent - a.marginPercent);

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

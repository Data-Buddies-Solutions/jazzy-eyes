import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { BrandPerformanceResponse } from '@/types/analytics';

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

    // Get all brands with their products and transactions
    const brands = await prisma.brand.findMany({
      include: {
        products: {
          include: {
            status: true,
            transactions: {
              where: {
                transactionDate: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        },
        rxSales: {
          where: {
            saleDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      orderBy: {
        brandName: 'asc',
      },
    });

    // Calculate metrics for each brand
    const brandPerformanceData = brands.map((brand) => {
      // Get all products for this brand
      const allProducts = brand.products;

      // Current inventory: products not sold
      const totalInventory = allProducts.filter(
        (p) => p.status?.name !== 'Sold'
      ).length;

      // Get sale transactions in date range (inventory sales)
      const saleTransactions = allProducts.flatMap((p) =>
        p.transactions.filter((t) => t.transactionType === 'SALE')
      );

      // Get RX sales in date range
      const rxSales = brand.rxSales;

      const inventorySold = saleTransactions.length;
      const rxSold = rxSales.length;
      const totalSold = inventorySold + rxSold;

      // Calculate revenue (inventory + RX)
      const inventoryRevenue = saleTransactions.reduce(
        (sum, t) => sum + Number(t.unitPrice),
        0
      );
      const rxRevenue = rxSales.reduce(
        (sum, rx) => sum + Number(rx.salePrice),
        0
      );
      const revenue = inventoryRevenue + rxRevenue;

      // Calculate average margin (including RX sales with cost data)
      let avgMargin = 0;
      if (totalSold > 0) {
        let marginsSum = 0;
        let marginsCount = 0;

        // Inventory sale margins
        saleTransactions.forEach((saleTransaction) => {
          const product = allProducts.find(
            (p) => p.compositeId === saleTransaction.productId
          );
          const orderTransaction = product?.transactions.find(
            (t) => t.transactionType === 'ORDER'
          );

          if (orderTransaction) {
            const salePrice = Number(saleTransaction.unitPrice);
            const costPrice = Number(orderTransaction.unitCost);
            const margin = ((salePrice - costPrice) / salePrice) * 100;
            marginsSum += margin;
            marginsCount += 1;
          }
        });

        // RX sale margins (if cost data exists)
        rxSales.forEach((rx) => {
          const salePrice = Number(rx.salePrice);
          const costPrice = Number(rx.costPrice);
          if (costPrice > 0 && salePrice > 0) {
            const margin = ((salePrice - costPrice) / salePrice) * 100;
            marginsSum += margin;
            marginsCount += 1;
          }
        });

        avgMargin = marginsCount > 0 ? marginsSum / marginsCount : 0;
      }

      // Calculate sell-through rate (inventory only - RX doesn't affect inventory)
      const totalUnits = inventorySold + totalInventory;
      const sellThroughRate = totalUnits > 0 ? (inventorySold / totalUnits) * 100 : 0;

      // Reorder recommendation: inventory < 20% of allocation
      const reorderRecommended =
        totalInventory < brand.allocationQuantity * 0.2;

      return {
        brandId: brand.id,
        brandName: brand.brandName,
        companyName: brand.companyName,
        allocationQuantity: brand.allocationQuantity,
        totalInventory,
        totalSold,
        inventorySold,
        rxSold,
        revenue,
        avgMargin,
        sellThroughRate,
        reorderRecommended,
      };
    });

    // Sort by sell-through rate descending
    brandPerformanceData.sort((a, b) => b.sellThroughRate - a.sellThroughRate);

    const response: BrandPerformanceResponse = {
      success: true,
      data: brandPerformanceData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in brand-performance API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brand performance data' },
      { status: 500 }
    );
  }
}

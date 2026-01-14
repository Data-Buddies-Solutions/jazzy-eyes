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

      // Get sale transactions in date range
      const saleTransactions = allProducts.flatMap((p) =>
        p.transactions.filter((t) => t.transactionType === 'SALE')
      );

      const totalSold = saleTransactions.length;

      // Calculate revenue
      const revenue = saleTransactions.reduce(
        (sum, t) => sum + Number(t.unitPrice),
        0
      );

      // Calculate average margin
      let avgMargin = 0;
      if (totalSold > 0) {
        const marginsSum = saleTransactions.reduce((sum, saleTransaction) => {
          // Find corresponding ORDER transaction for cost
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
            return sum + margin;
          }
          return sum;
        }, 0);

        avgMargin = marginsSum / totalSold;
      }

      // Calculate sell-through rate
      const totalUnits = totalSold + totalInventory;
      const sellThroughRate = totalUnits > 0 ? (totalSold / totalUnits) * 100 : 0;

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

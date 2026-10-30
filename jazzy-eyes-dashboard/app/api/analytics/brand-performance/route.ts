import { NextRequest, NextResponse } from 'next/server';
import { brandsWithActivity } from '@/db/analytics';
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

    const brands = await brandsWithActivity({ start: startDate, end: endDate });

    const brandPerformanceData = brands.map((brand) => {
      const allProducts = brand.products;

      const totalInventory = allProducts.filter(
        (p) => p.statusName !== 'Sold'
      ).length;

      const saleTransactions = allProducts.flatMap((p) =>
        p.transactions.filter((t) => t.transactionType === 'SALE')
      );

      const rxSales = brand.rxSales;

      const inventorySold = saleTransactions.length;
      const rxSold = rxSales.length;
      const totalSold = inventorySold + rxSold;

      const inventoryRevenue = saleTransactions.reduce(
        (sum, t) => sum + t.unitPrice,
        0
      );
      const rxRevenue = rxSales.reduce(
        (sum, rx) => sum + rx.salePrice,
        0
      );
      const revenue = inventoryRevenue + rxRevenue;

      let avgMargin = 0;
      if (totalSold > 0) {
        let marginsSum = 0;
        let marginsCount = 0;

        saleTransactions.forEach((saleTransaction) => {
          const salePrice = saleTransaction.unitPrice;
          let costPrice = saleTransaction.unitCost;
          if (costPrice === 0) {
            const product = allProducts.find(
              (p) => p.compositeId === saleTransaction.productId
            );
            const orderTransaction = product?.transactions.find(
              (t) => t.transactionType === 'ORDER' || t.transactionType === 'RESTOCK'
            );
            if (orderTransaction) {
              costPrice = orderTransaction.unitCost;
              if (
                brand.costDiscountPercent &&
                brand.costDiscountPercent > 0 &&
                brand.costDiscountStartDate &&
                saleTransaction.transactionDate >= brand.costDiscountStartDate
              ) {
                costPrice = costPrice * (1 - brand.costDiscountPercent / 100);
              }
            }
          }
          if (salePrice > 0 && costPrice > 0) {
            const margin = ((salePrice - costPrice) / salePrice) * 100;
            marginsSum += margin;
            marginsCount += 1;
          }
        });

        rxSales.forEach((rx) => {
          const salePrice = rx.salePrice;
          const costPrice = rx.costPrice;
          if (costPrice > 0 && salePrice > 0) {
            const margin = ((salePrice - costPrice) / salePrice) * 100;
            marginsSum += margin;
            marginsCount += 1;
          }
        });

        avgMargin = marginsCount > 0 ? marginsSum / marginsCount : 0;
      }

      const totalUnits = inventorySold + totalInventory;
      const sellThroughRate = totalUnits > 0 ? (inventorySold / totalUnits) * 100 : 0;

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

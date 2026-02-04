import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SellThroughResponse } from '@/types/analytics';

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

    // Calculate days in period
    const daysInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get brands with products and transactions
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
                transactionType: 'SALE',
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

    // Calculate sell-through metrics for each brand
    const sellThroughData = brands
      .map((brand) => {
        // Current inventory (not sold)
        const currentInventory = brand.products.filter(
          (p) => p.status?.name !== 'Sold'
        ).length;

        // Inventory sold in period
        const inventorySoldInPeriod = brand.products.filter((p) =>
          p.transactions.some((t) => t.transactionType === 'SALE')
        ).length;

        // RX sold in period (doesn't affect inventory)
        const rxSoldInPeriod = brand.rxSales.length;

        // Total sold (inventory + RX)
        const totalSoldInPeriod = inventorySoldInPeriod + rxSoldInPeriod;

        // Calculate sell-through rate (inventory only - RX doesn't come from inventory)
        const totalUnits = inventorySoldInPeriod + currentInventory;
        const sellThroughRate =
          totalUnits > 0 ? (inventorySoldInPeriod / totalUnits) * 100 : 0;

        // Calculate velocity (all units per day including RX)
        const velocity = daysInPeriod > 0 ? totalSoldInPeriod / daysInPeriod : 0;

        // Determine status based on sell-through rate
        let status: 'excellent' | 'good' | 'slow' | 'stale';
        if (sellThroughRate >= 75) {
          status = 'excellent';
        } else if (sellThroughRate >= 50) {
          status = 'good';
        } else if (sellThroughRate >= 25) {
          status = 'slow';
        } else {
          status = 'stale';
        }

        return {
          brandName: brand.brandName,
          currentInventory,
          soldInPeriod: totalSoldInPeriod,
          inventorySold: inventorySoldInPeriod,
          rxSold: rxSoldInPeriod,
          sellThroughRate,
          velocity,
          status,
        };
      })
      .filter((brand) => brand.currentInventory > 0 || brand.soldInPeriod > 0); // Only include brands with activity

    // Sort by sell-through rate descending
    sellThroughData.sort((a, b) => b.sellThroughRate - a.sellThroughRate);

    // Calculate summary
    const totalSold = sellThroughData.reduce((sum, b) => sum + b.soldInPeriod, 0);
    const totalInventorySold = sellThroughData.reduce((sum, b) => sum + b.inventorySold, 0);
    const totalRxSold = sellThroughData.reduce((sum, b) => sum + b.rxSold, 0);
    const totalInventory = sellThroughData.reduce(
      (sum, b) => sum + b.currentInventory,
      0
    );
    const overallSellThrough =
      totalInventorySold + totalInventory > 0
        ? (totalInventorySold / (totalInventorySold + totalInventory)) * 100
        : 0;

    const fastestMoving =
      sellThroughData.length > 0 ? sellThroughData[0].brandName : 'N/A';
    const slowestMoving =
      sellThroughData.length > 0
        ? sellThroughData[sellThroughData.length - 1].brandName
        : 'N/A';

    const response: SellThroughResponse = {
      success: true,
      data: sellThroughData,
      summary: {
        overallSellThrough,
        totalSold,
        totalRxSold,
        fastestMoving,
        slowestMoving,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in sell-through API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sell-through data' },
      { status: 500 }
    );
  }
}

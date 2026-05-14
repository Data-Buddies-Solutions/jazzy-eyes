import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateHistoricalInventoryMetrics } from '@/lib/analytics/inventory-metrics';
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

    // Calculate sell-through metrics for each brand
    const sellThroughData = brands
      .map((brand) => {
        const {
          currentInventory,
          startingInventory,
          unitsAddedInPeriod,
          availableInventory,
          inventorySoldInPeriod,
          unitsWrittenOffInPeriod,
          sellThroughRate,
        } = calculateHistoricalInventoryMetrics(brand.products, startDate, endDate);

        // RX sold in period (doesn't affect inventory)
        const rxSoldInPeriod = brand.rxSales.length;

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
          availableInventory,
          startingInventory,
          unitsAddedInPeriod,
          unitsWrittenOffInPeriod,
          soldInPeriod: inventorySoldInPeriod,
          inventorySold: inventorySoldInPeriod,
          rxSold: rxSoldInPeriod,
          sellThroughRate,
          velocity: daysInPeriod > 0 ? inventorySoldInPeriod / daysInPeriod : 0,
          status,
        };
      })
      .filter(
        (brand) =>
          brand.currentInventory > 0 ||
          (brand.availableInventory ?? 0) > 0 ||
          brand.soldInPeriod > 0
      ); // Only include brands with inventory or activity

    // Sort by sell-through rate descending
    sellThroughData.sort((a, b) => b.sellThroughRate - a.sellThroughRate);

    // Calculate summary
    const totalSold = sellThroughData.reduce((sum, b) => sum + b.soldInPeriod, 0);
    const totalInventorySold = sellThroughData.reduce((sum, b) => sum + b.inventorySold, 0);
    const totalRxSold = sellThroughData.reduce((sum, b) => sum + b.rxSold, 0);
    const totalAvailableInventory = sellThroughData.reduce(
      (sum, b) => sum + (b.availableInventory ?? 0),
      0
    );
    const overallSellThrough =
      totalAvailableInventory > 0
        ? (totalInventorySold / totalAvailableInventory) * 100
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

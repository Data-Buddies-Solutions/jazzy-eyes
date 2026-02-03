import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SalesTrendsResponse } from '@/types/analytics';

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

    // Get all SALE transactions in date range (inventory sales)
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
          },
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    // Get all RX sales in date range
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
      orderBy: {
        saleDate: 'asc',
      },
    });

    // Group by date
    const dailySalesMap = new Map<
      string,
      {
        unitsSold: number;
        revenue: number;
        totalPrice: number;
        inventoryUnits: number;
        rxUnits: number;
      }
    >();

    // Group by brand and date for trends
    const brandTrendsMap = new Map<
      string,
      Map<
        string,
        {
          units: number;
          revenue: number;
        }
      >
    >();

    // Process inventory transactions
    saleTransactions.forEach((transaction) => {
      const dateStr = transaction.transactionDate.toISOString().split('T')[0];
      const brandName = transaction.product.brand.brandName;
      const revenue = Number(transaction.unitPrice);

      // Daily sales
      if (!dailySalesMap.has(dateStr)) {
        dailySalesMap.set(dateStr, {
          unitsSold: 0,
          revenue: 0,
          totalPrice: 0,
          inventoryUnits: 0,
          rxUnits: 0,
        });
      }

      const dailyData = dailySalesMap.get(dateStr)!;
      dailyData.unitsSold += 1;
      dailyData.inventoryUnits += 1;
      dailyData.revenue += revenue;
      dailyData.totalPrice += revenue;

      // Brand trends
      if (!brandTrendsMap.has(brandName)) {
        brandTrendsMap.set(brandName, new Map());
      }

      const brandDateMap = brandTrendsMap.get(brandName)!;
      if (!brandDateMap.has(dateStr)) {
        brandDateMap.set(dateStr, {
          units: 0,
          revenue: 0,
        });
      }

      const brandDateData = brandDateMap.get(dateStr)!;
      brandDateData.units += 1;
      brandDateData.revenue += revenue;
    });

    // Process RX sales
    rxSales.forEach((rx) => {
      const dateStr = rx.saleDate.toISOString().split('T')[0];
      const brandName = rx.brand.brandName;
      const revenue = Number(rx.salePrice);

      // Daily sales
      if (!dailySalesMap.has(dateStr)) {
        dailySalesMap.set(dateStr, {
          unitsSold: 0,
          revenue: 0,
          totalPrice: 0,
          inventoryUnits: 0,
          rxUnits: 0,
        });
      }

      const dailyData = dailySalesMap.get(dateStr)!;
      dailyData.unitsSold += 1;
      dailyData.rxUnits += 1;
      dailyData.revenue += revenue;
      dailyData.totalPrice += revenue;

      // Brand trends
      if (!brandTrendsMap.has(brandName)) {
        brandTrendsMap.set(brandName, new Map());
      }

      const brandDateMap = brandTrendsMap.get(brandName)!;
      if (!brandDateMap.has(dateStr)) {
        brandDateMap.set(dateStr, {
          units: 0,
          revenue: 0,
        });
      }

      const brandDateData = brandDateMap.get(dateStr)!;
      brandDateData.units += 1;
      brandDateData.revenue += revenue;
    });

    // Format daily sales
    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({
        date,
        unitsSold: data.unitsSold,
        revenue: data.revenue,
        avgPrice: data.unitsSold > 0 ? data.totalPrice / data.unitsSold : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format brand trends
    const brandTrends = Array.from(brandTrendsMap.entries()).map(
      ([brandName, dateMap]) => {
        const data = Array.from(dateMap.entries())
          .map(([date, values]) => ({
            date,
            units: values.units,
            revenue: values.revenue,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

        return {
          brandName,
          data,
          totalRevenue,
        };
      }
    );

    // Sort brand trends by total revenue descending
    brandTrends.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate summary
    const totalDays = dailySales.length;
    const totalRevenue = dailySales.reduce((sum, d) => sum + d.revenue, 0);
    const avgDailyRevenue = totalDays > 0 ? totalRevenue / totalDays : 0;

    const bestDay =
      dailySales.length > 0
        ? dailySales.reduce((best, current) =>
            current.revenue > best.revenue ? current : best
          )
        : { date: 'N/A', revenue: 0 };

    const worstDay =
      dailySales.length > 0
        ? dailySales.reduce((worst, current) =>
            current.revenue < worst.revenue ? current : worst
          )
        : { date: 'N/A', revenue: 0 };

    const response: SalesTrendsResponse = {
      success: true,
      dailySales,
      brandTrends,
      summary: {
        totalDays,
        avgDailyRevenue,
        bestDay: {
          date: bestDay.date,
          revenue: bestDay.revenue,
        },
        worstDay: {
          date: worstDay.date,
          revenue: worstDay.revenue,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in sales-trends API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales trends data' },
      { status: 500 }
    );
  }
}

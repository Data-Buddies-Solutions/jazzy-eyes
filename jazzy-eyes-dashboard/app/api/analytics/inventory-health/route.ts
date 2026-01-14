import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { InventoryHealthResponse } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    // Get status distribution
    const statuses = await prisma.frameStatus.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    const totalProducts = statuses.reduce((sum, s) => sum + s._count.products, 0);

    const statusDistribution = statuses.map((status) => ({
      statusName: status.name,
      count: status._count.products,
      percentage:
        totalProducts > 0 ? (status._count.products / totalProducts) * 100 : 0,
      colorScheme: status.colorScheme,
    }));

    // Get all non-sold products with their ORDER transaction for aging analysis
    const products = await prisma.product.findMany({
      where: {
        status: {
          name: {
            not: 'Sold',
          },
        },
      },
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
          orderBy: {
            invoiceDate: 'asc',
          },
          take: 1,
        },
      },
    });

    // Calculate aging for each product
    const now = new Date();
    const productsWithAging = products
      .map((product) => {
        const orderTransaction = product.transactions[0];
        if (!orderTransaction || !orderTransaction.invoiceDate) return null;

        const invoiceDate = new Date(orderTransaction.invoiceDate);
        const daysInInventory = Math.floor(
          (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          frameId: product.compositeId,
          brandName: product.brand.brandName,
          styleNumber: product.styleNumber,
          daysInInventory,
          costPrice: Number(orderTransaction.unitCost),
          retailPrice: Number(orderTransaction.unitPrice),
        };
      })
      .filter((p) => p !== null);

    // Group into aging buckets
    const agingBuckets = [
      { range: '0-30 days', min: 0, max: 30, count: 0, value: 0 },
      { range: '31-60 days', min: 31, max: 60, count: 0, value: 0 },
      { range: '61-90 days', min: 61, max: 90, count: 0, value: 0 },
      { range: '91-180 days', min: 91, max: 180, count: 0, value: 0 },
      { range: '180+ days', min: 181, max: Infinity, count: 0, value: 0 },
    ];

    productsWithAging.forEach((product) => {
      const bucket = agingBuckets.find(
        (b) => product.daysInInventory >= b.min && product.daysInInventory <= b.max
      );
      if (bucket) {
        bucket.count++;
        bucket.value += product.retailPrice;
      }
    });

    const totalAgingProducts = productsWithAging.length;
    const formattedAgingBuckets = agingBuckets.map((bucket) => ({
      range: bucket.range,
      count: bucket.count,
      percentage:
        totalAgingProducts > 0 ? (bucket.count / totalAgingProducts) * 100 : 0,
      value: bucket.value,
    }));

    // Get oldest 10 items
    const oldestItems = productsWithAging
      .sort((a, b) => b.daysInInventory - a.daysInInventory)
      .slice(0, 10);

    const response: InventoryHealthResponse = {
      success: true,
      statusDistribution,
      agingBuckets: formattedAgingBuckets,
      oldestItems,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in inventory-health API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory health data' },
      { status: 500 }
    );
  }
}

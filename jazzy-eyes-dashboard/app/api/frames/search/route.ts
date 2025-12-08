import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const statusFilter = searchParams.get('status') || 'All';

    // Build where clause
    const where: any = {};

    // Search by frame ID (composite ID), brand name, or style number
    if (query) {
      where.OR = [
        {
          compositeId: {
            startsWith: query,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            brandName: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
        {
          styleNumber: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Fetch products with their transactions to determine status
    const products = await prisma.product.findMany({
      where,
      include: {
        brand: {
          select: {
            brandName: true,
            companyName: true,
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to Frame format and calculate status
    const frames = products
      .map((product) => {
        // Calculate status based on transactions
        let status: 'Active' | 'Sold' | 'Discontinued' = 'Active';
        let saleDate: string | undefined;
        let salePrice: number | undefined;

        const saleTransaction = product.transactions.find(
          (t) => t.transactionType === 'SALE'
        );

        if (saleTransaction) {
          status = 'Sold';
          saleDate = saleTransaction.transactionDate.toISOString();
          salePrice = Number(saleTransaction.unitPrice);
        }

        // Get latest ORDER transaction for cost/retail price
        const orderTransaction = product.transactions.find(
          (t) => t.transactionType === 'ORDER'
        );

        // Check if discontinued
        if (orderTransaction?.status === 'discontinued' || orderTransaction?.notes === 'DISCONTINUED') {
          status = 'Discontinued';
        }

        const costPrice = orderTransaction
          ? Number(orderTransaction.unitCost)
          : 0;
        const retailPrice = orderTransaction
          ? Number(orderTransaction.unitPrice)
          : 0;

        return {
          frameId: product.compositeId,
          brand: product.brand.brandName,
          model: product.styleNumber,
          color: product.colorCode,
          eyeSize: product.eyeSize,
          gender: product.gender as 'Men' | 'Women' | 'Unisex',
          frameType: product.frameType as any,
          productType: product.productType as 'Optical' | 'Sun',
          costPrice,
          retailPrice,
          status,
          dateAdded: product.createdAt.toISOString(),
          notes: orderTransaction?.notes?.replace('DISCONTINUED', '').trim() || null,
          saleDate,
          salePrice,
          styleNumber: product.styleNumber,
          colorCode: product.colorCode,
        };
      })
      .filter((frame) => {
        // Apply status filter
        if (statusFilter === 'All') return true;
        return frame.status === statusFilter;
      });

    return NextResponse.json({ success: true, frames });
  } catch (error) {
    console.error('Error searching frames:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search frames' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const statusFilter = searchParams.get('status') || 'All';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

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

    // Add status filter to where clause if specified
    if (statusFilter && statusFilter !== 'All') {
      where.status = {
        name: statusFilter,
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.product.count({ where });

    // Fetch products with their status and transactions (paginated)
    const products = await prisma.product.findMany({
      where,
      include: {
        brand: {
          select: {
            brandName: true,
            companyName: true,
          },
        },
        status: {
          select: {
            id: true,
            name: true,
            colorScheme: true,
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Transform to Frame format using database status
    const frames = products
      .map((product) => {
        // Get sale info if exists
        const saleTransaction = product.transactions.find(
          (t) => t.transactionType === 'SALE'
        );

        const orderTransaction = product.transactions.find(
          (t) => t.transactionType === 'ORDER'
        );

        const costPrice = orderTransaction
          ? Number(orderTransaction.unitCost)
          : 0;
        const retailPrice = orderTransaction
          ? Number(orderTransaction.unitPrice)
          : 0;
        const invoiceDate = orderTransaction?.invoiceDate
          ? orderTransaction.invoiceDate.toISOString()
          : undefined;

        return {
          frameId: product.compositeId,
          brand: product.brand.brandName,
          model: product.styleNumber,
          color: product.colorCode,
          eyeSize: product.eyeSize,
          gender: product.gender as 'Men' | 'Women' | 'Unisex',
          frameType: product.frameType as 'Zyl' | 'Metal' | 'Rimless' | 'Semi-rimless' | 'Clip',
          productType: product.productType as 'Optical' | 'Sun',
          invoiceDate,
          costPrice,
          retailPrice,
          status: product.status?.name || 'Active',
          statusId: product.status?.id,
          statusColorScheme: product.status?.colorScheme || 'green',
          dateAdded: product.createdAt.toISOString(),
          notes: orderTransaction?.notes?.replace('DISCONTINUED', '').trim() || null,
          saleDate: saleTransaction ? saleTransaction.transactionDate.toISOString() : undefined,
          salePrice: saleTransaction ? Number(saleTransaction.unitPrice) : undefined,
          styleNumber: product.styleNumber,
          colorCode: product.colorCode,
          currentQty: product.currentQty,
        };
      });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      frames,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error searching frames:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search frames' },
      { status: 500 }
    );
  }
}

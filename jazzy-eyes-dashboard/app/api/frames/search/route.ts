import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parsePagination, paginationError } from '@/lib/http/pagination';

type ProductWithRelations = Awaited<
  ReturnType<typeof prisma.product.findMany>
>[number] & {
  status: { id: number; name: string; colorScheme: string } | null;
  transactions: Array<{
    transactionType: string;
    writeOffReason: string | null;
  }>;
};

function getDisplayStatus(product: ProductWithRelations) {
  if (product.currentQty === 0) {
    const depletionTransaction = product.transactions.find(
      (t) => t.transactionType === 'SALE' || t.transactionType === 'WRITE_OFF'
    );

    if (
      depletionTransaction?.transactionType === 'WRITE_OFF' &&
      depletionTransaction.writeOffReason === 'return'
    ) {
      return 'Returned';
    }

    if (depletionTransaction?.transactionType === 'SALE') {
      return 'Sold Out';
    }
  }

  if (product.status?.name === 'Discontinued') {
    return 'Discontinued';
  }

  if (product.currentQty === 0) {
    return 'Sold Out';
  }

  return 'Active';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const statusFilter = searchParams.get('status') || 'All';
    const searchMode = searchParams.get('searchMode') || 'brand';
    const pagination = parsePagination(searchParams);
    if (!pagination) {
      return NextResponse.json({ success: false, error: paginationError }, { status: 400 });
    }
    const { page, limit, skip } = pagination;

    const where: any = {};

    if (query) {
      if (searchMode === 'color') {
        where.colorCode = {
          contains: query,
          mode: 'insensitive',
        };
      } else {
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
    }

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
          select: { transactionType: true, writeOffReason: true, unitCost: true, unitPrice: true,
            invoiceDate: true, notes: true, isSpecialOrder: true, transactionDate: true },
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { compositeId: 'asc' },
    });

    const frames = products
      .map((product) => {
        const displayStatus = getDisplayStatus(product);
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
          displayStatus,
          statusId: product.status?.id,
          statusColorScheme: product.status?.colorScheme || 'green',
          dateAdded: product.createdAt.toISOString(),
          notes: orderTransaction?.notes?.replace('DISCONTINUED', '').trim() || null,
          saleDate: saleTransaction ? saleTransaction.transactionDate.toISOString() : undefined,
          salePrice: saleTransaction ? Number(saleTransaction.unitPrice) : undefined,
          styleNumber: product.styleNumber,
          colorCode: product.colorCode,
          currentQty: product.currentQty,
          isSpecialOrder: orderTransaction?.isSpecialOrder ?? false,
        };
      })
      .filter((frame) => statusFilter === 'All' || frame.displayStatus === statusFilter);

    const totalCount = frames.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedFrames = frames.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      frames: paginatedFrames,
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

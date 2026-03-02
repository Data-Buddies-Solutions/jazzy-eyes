import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    const brandIdNum = parseInt(brandId);
    if (isNaN(brandIdNum)) {
      return NextResponse.json(
        { success: false, error: 'brandId must be a number' },
        { status: 400 }
      );
    }

    // Fetch brand info
    const brand = await prisma.brand.findUnique({
      where: { id: brandIdNum },
      select: { brandName: true, companyName: true },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Fetch all products for this brand
    const products = await prisma.product.findMany({
      where: { brandId: brandIdNum },
      include: {
        brand: {
          select: { brandName: true },
        },
        status: {
          select: { id: true, name: true, colorScheme: true },
        },
        transactions: {
          where: { transactionType: 'ORDER' },
          orderBy: { transactionDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { compositeId: 'asc' },
    });

    // Transform products to frames
    const frames = products.map((product) => {
      const orderTransaction = product.transactions[0];
      const retailPrice = orderTransaction
        ? Number(orderTransaction.unitPrice)
        : 0;

      const dbStatus = product.status?.name || 'Active';
      const statusName =
        product.currentQty === 0 && dbStatus !== 'Discontinued'
          ? 'Sold Out'
          : dbStatus;

      return {
        frameId: product.compositeId,
        model: product.styleNumber,
        color: product.colorCode,
        qty: product.currentQty,
        frameType: product.frameType,
        productType: product.productType,
        status: statusName,
        statusColorScheme: product.status?.colorScheme || 'green',
        retailPrice,
      };
    });

    // Compute summary stats
    const totalFrames = frames.length;
    const activeCount = products.filter(
      (p) => p.currentQty > 0 && p.status?.name !== 'Discontinued'
    ).length;
    const soldOutCount = products.filter((p) => p.currentQty === 0).length;
    const discontinuedCount = products.filter(
      (p) => p.status?.name === 'Discontinued'
    ).length;

    return NextResponse.json({
      success: true,
      brandName: brand.brandName,
      summary: {
        totalFrames,
        activeCount,
        soldOutCount,
        discontinuedCount,
      },
      frames,
    });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory report' },
      { status: 500 }
    );
  }
}

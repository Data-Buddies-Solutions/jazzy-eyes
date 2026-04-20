import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');

    const where: any = { isSpecialOrder: true };

    if (brandId) {
      const brandIdNum = parseInt(brandId);
      if (!isNaN(brandIdNum)) {
        where.product = { brandId: brandIdNum };
      }
    }

    const specialOrders = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: {
          select: {
            compositeId: true,
            styleNumber: true,
            colorCode: true,
            frameType: true,
            productType: true,
            brand: {
              select: { brandName: true },
            },
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    const specialOrderItems = specialOrders.map((so) => ({
      id: so.id,
      frameId: so.product.compositeId,
      brand: so.product.brand.brandName,
      model: so.product.styleNumber,
      color: so.product.colorCode,
      frameType: so.product.frameType,
      productType: so.product.productType,
      quantity: so.quantity,
      unitCost: Number(so.unitCost),
      unitPrice: Number(so.unitPrice),
      transactionDate: so.transactionDate.toISOString(),
      invoiceNumber: so.invoiceNumber,
      status: so.status,
      notes: so.notes,
    }));

    return NextResponse.json({
      success: true,
      specialOrders: specialOrderItems,
      totalCount: specialOrderItems.length,
    });
  } catch (error) {
    console.error('Error fetching special orders report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch special orders' },
      { status: 500 }
    );
  }
}

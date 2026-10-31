import { NextRequest, NextResponse } from 'next/server';
import { specialOrders } from '@/db/reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');

    const brandIdNum = brandId ? parseInt(brandId) : NaN;
    const specialOrderRows = await specialOrders(isNaN(brandIdNum) ? null : brandIdNum);

    const specialOrderItems = specialOrderRows.map((so) => ({
      id: so.id,
      frameId: so.compositeId,
      brand: so.brandName,
      model: so.styleNumber,
      color: so.colorCode,
      frameType: so.frameType,
      productType: so.productType,
      quantity: so.quantity,
      unitCost: so.unitCost,
      unitPrice: so.unitPrice,
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

import { NextRequest, NextResponse } from 'next/server';
import { countRxSales, createRxSale, findBrandName, listRxSales } from '@/db/rx-sales';
import { parsePagination, paginationError } from '@/lib/http/pagination';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brandId,
      styleNumber,
      colorCode,
      eyeSize,
      gender,
      frameType,
      productType,
      saleDate,
      salePrice,
      costPrice,
      notes,
    } = body;

    if (!brandId || !styleNumber || !colorCode || !eyeSize || !salePrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const brandName = await findBrandName(brandId);

    if (brandName === null) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    const rxSale = await createRxSale({
      brandId,
      styleNumber,
      colorCode,
      eyeSize,
      gender: gender || 'Unisex',
      frameType: frameType || 'Zyl',
      productType: productType || 'Optical',
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      salePrice,
      costPrice: costPrice || 0,
      notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      message: 'RX sale recorded successfully',
      rxSale: {
        id: rxSale.id,
        brandName,
        styleNumber: rxSale.styleNumber,
        colorCode: rxSale.colorCode,
        eyeSize: rxSale.eyeSize,
        salePrice: rxSale.salePrice,
        saleDate: rxSale.saleDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating RX sale:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record RX sale' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams);
    if (!pagination) {
      return NextResponse.json({ success: false, error: paginationError }, { status: 400 });
    }
    const { page, limit, skip } = pagination;

    const totalCount = await countRxSales();

    const rxSales = await listRxSales({ skip, limit });

    const formattedSales = rxSales.map((sale) => ({
      id: sale.id,
      brandName: sale.brandName,
      styleNumber: sale.styleNumber,
      colorCode: sale.colorCode,
      eyeSize: sale.eyeSize,
      gender: sale.gender,
      frameType: sale.frameType,
      productType: sale.productType,
      saleDate: sale.saleDate.toISOString(),
      salePrice: sale.salePrice,
      costPrice: sale.costPrice,
      notes: sale.notes,
    }));

    return NextResponse.json({
      success: true,
      rxSales: formattedSales,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching RX sales:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RX sales' },
      { status: 500 }
    );
  }
}

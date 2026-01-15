import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Validate required fields
    if (!brandId || !styleNumber || !colorCode || !eyeSize || !salePrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Create the RX sale record
    const rxSale = await prisma.rxSale.create({
      data: {
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
      },
      include: {
        brand: {
          select: {
            brandName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'RX sale recorded successfully',
      rxSale: {
        id: rxSale.id,
        brandName: rxSale.brand.brandName,
        styleNumber: rxSale.styleNumber,
        colorCode: rxSale.colorCode,
        eyeSize: rxSale.eyeSize,
        salePrice: Number(rxSale.salePrice),
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const totalCount = await prisma.rxSale.count();

    const rxSales = await prisma.rxSale.findMany({
      include: {
        brand: {
          select: {
            brandName: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take: limit,
    });

    const formattedSales = rxSales.map((sale) => ({
      id: sale.id,
      brandName: sale.brand.brandName,
      styleNumber: sale.styleNumber,
      colorCode: sale.colorCode,
      eyeSize: sale.eyeSize,
      gender: sale.gender,
      frameType: sale.frameType,
      productType: sale.productType,
      saleDate: sale.saleDate.toISOString(),
      salePrice: Number(sale.salePrice),
      costPrice: Number(sale.costPrice),
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

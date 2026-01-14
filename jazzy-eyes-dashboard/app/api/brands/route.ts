import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCompanySchema, createBrandSchema } from '@/lib/validations/admin';
import type { CompanyGroup } from '@/types/admin';

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ companyId: 'asc' }, { id: 'asc' }],
    });

    // Group brands by company
    const companyMap = new Map<number, CompanyGroup>();

    brands.forEach((brand) => {
      if (!companyMap.has(brand.companyId)) {
        companyMap.set(brand.companyId, {
          companyName: brand.companyName,
          companyId: brand.companyId,
          brands: [],
          totalBrands: 0,
          totalAllocation: 0,
        });
      }

      const company = companyMap.get(brand.companyId)!;
      company.brands.push({
        id: brand.id,
        brandName: brand.brandName,
        companyName: brand.companyName,
        companyId: brand.companyId,
        allocationQuantity: brand.allocationQuantity,
        productCount: brand._count.products,
      });
      company.totalBrands++;
      company.totalAllocation += brand.allocationQuantity;
    });

    const companies = Array.from(companyMap.values());

    // Also return flat brands list for backward compatibility
    const simpleBrands = brands.map((b) => ({
      id: b.id,
      brandName: b.brandName,
      companyName: b.companyName,
    }));

    return NextResponse.json({ success: true, companies, brands: simpleBrands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'company') {
      // Create new company
      const validation = createCompanySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.issues[0].message },
          { status: 400 }
        );
      }

      const { companyName } = validation.data;

      // Generate next company ID (round up to nearest thousand)
      const maxCompany = await prisma.brand.findFirst({
        orderBy: { companyId: 'desc' },
        select: { companyId: true },
      });

      const nextCompanyId = maxCompany
        ? Math.ceil((maxCompany.companyId + 1) / 1000) * 1000
        : 1000;

      return NextResponse.json({
        success: true,
        companyId: nextCompanyId,
        message: `Company ID ${nextCompanyId} is ready. You can now add brands to this company.`,
      });
    } else if (type === 'brand') {
      // Create new brand
      const validation = createBrandSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.issues[0].message },
          { status: 400 }
        );
      }

      const { brandId, companyName, companyId, brandName, allocationQuantity } =
        validation.data;

      // Check if brand ID already exists
      const existingBrand = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (existingBrand) {
        return NextResponse.json(
          { success: false, error: `Brand ID ${brandId} already exists` },
          { status: 409 }
        );
      }

      // Create brand with manual ID
      const brand = await prisma.brand.create({
        data: {
          id: brandId,
          companyId,
          companyName,
          brandName,
          allocationQuantity,
        },
      });

      return NextResponse.json({
        success: true,
        brandId,
        brand,
        message: `Brand created with ID: ${brandId}`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "company" or "brand"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create' },
      { status: 500 }
    );
  }
}

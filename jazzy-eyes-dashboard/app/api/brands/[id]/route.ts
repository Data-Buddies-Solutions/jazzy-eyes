import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateBrandSchema } from '@/lib/validations/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandId = parseInt(id);

    if (isNaN(brandId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      brand: {
        id: brand.id,
        brandName: brand.brandName,
        companyName: brand.companyName,
        companyId: brand.companyId,
        allocationQuantity: brand.allocationQuantity,
        productCount: brand._count.products,
      },
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brand' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandId = parseInt(id);

    if (isNaN(brandId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateBrandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if brand exists and has products
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // If brand has products and not confirmed, require confirmation
    if (existingBrand._count.products > 0 && !body.confirmed) {
      return NextResponse.json(
        {
          success: false,
          requiresConfirmation: true,
          productCount: existingBrand._count.products,
          message: `This brand is used by ${existingBrand._count.products} product(s). Changes will affect all associated products. Are you sure you want to continue?`,
        },
        { status: 409 }
      );
    }

    // Check if changing brand ID
    if (validation.data.id && validation.data.id !== brandId) {
      // Check if new ID already exists
      const existingBrandWithNewId = await prisma.brand.findUnique({
        where: { id: validation.data.id },
      });

      if (existingBrandWithNewId) {
        return NextResponse.json(
          { success: false, error: `Brand ID ${validation.data.id} already exists` },
          { status: 409 }
        );
      }

      // Delete old brand and create with new ID (to preserve foreign key relationships)
      await prisma.brand.delete({
        where: { id: brandId },
      });

      const updatedBrand = await prisma.brand.create({
        data: {
          id: validation.data.id,
          brandName: validation.data.brandName || existingBrand.brandName,
          companyName: existingBrand.companyName,
          companyId: existingBrand.companyId,
          allocationQuantity: validation.data.allocationQuantity ?? existingBrand.allocationQuantity,
        },
      });

      return NextResponse.json({
        success: true,
        brand: {
          id: updatedBrand.id,
          brandName: updatedBrand.brandName,
          companyName: updatedBrand.companyName,
          companyId: updatedBrand.companyId,
          allocationQuantity: updatedBrand.allocationQuantity,
        },
        message: 'Brand ID updated successfully',
      });
    }

    // Update brand normally (no ID change)
    const updatedBrand = await prisma.brand.update({
      where: { id: brandId },
      data: validation.data,
    });

    return NextResponse.json({
      success: true,
      brand: {
        id: updatedBrand.id,
        brandName: updatedBrand.brandName,
        companyName: updatedBrand.companyName,
        companyId: updatedBrand.companyId,
        allocationQuantity: updatedBrand.allocationQuantity,
      },
      message: 'Brand updated successfully',
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update brand' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandId = parseInt(id);

    if (isNaN(brandId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    // Check if brand exists and has products
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if brand has products
    if (existingBrand._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete brand "${existingBrand.brandName}" - it has ${existingBrand._count.products} product(s) associated with it. Please edit the brand instead or remove all products first.`,
        },
        { status: 409 }
      );
    }

    // Safe to delete - no products reference this brand
    await prisma.brand.delete({
      where: { id: brandId },
    });

    return NextResponse.json({
      success: true,
      message: `Brand "${existingBrand.brandName}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
}

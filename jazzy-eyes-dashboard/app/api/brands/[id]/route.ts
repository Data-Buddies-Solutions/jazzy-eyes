import { NextResponse } from 'next/server';
import {
  brandExists,
  createBrand,
  deleteBrand,
  findBrandWithProductCount,
  updateBrand,
} from '@/db/brands';
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

    const brand = await findBrandWithProductCount(brandId);

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
        productCount: brand.productCount,
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

    const existingBrand = await findBrandWithProductCount(brandId);

    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (existingBrand.productCount > 0 && !body.confirmed) {
      return NextResponse.json(
        {
          success: false,
          requiresConfirmation: true,
          productCount: existingBrand.productCount,
          message: `This brand is used by ${existingBrand.productCount} product(s). Changes will affect all associated products. Are you sure you want to continue?`,
        },
        { status: 409 }
      );
    }

    if (validation.data.id && validation.data.id !== brandId) {
      if (await brandExists(validation.data.id)) {
        return NextResponse.json(
          { success: false, error: `Brand ID ${validation.data.id} already exists` },
          { status: 409 }
        );
      }

      await deleteBrand(brandId);

      const updatedBrand = await createBrand({
        id: validation.data.id,
        brandName: validation.data.brandName || existingBrand.brandName,
        companyName: existingBrand.companyName,
        companyId: existingBrand.companyId,
        allocationQuantity: validation.data.allocationQuantity ?? existingBrand.allocationQuantity,
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

    const { brandName, allocationQuantity } = validation.data;
    const updatedBrand = await updateBrand(brandId, { brandName, allocationQuantity });

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

    const existingBrand = await findBrandWithProductCount(brandId);

    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (existingBrand.productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete brand "${existingBrand.brandName}" - it has ${existingBrand.productCount} product(s) associated with it. Please edit the brand instead or remove all products first.`,
        },
        { status: 409 }
      );
    }

    await deleteBrand(brandId);

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

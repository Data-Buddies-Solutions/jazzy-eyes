import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateStatusSchema } from '@/lib/validations/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statusId = parseInt(id);

    if (isNaN(statusId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status ID' },
        { status: 400 }
      );
    }

    const status = await prisma.frameStatus.findUnique({
      where: { id: statusId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: {
        id: status.id,
        name: status.name,
        colorScheme: status.colorScheme,
        isProtected: status.isProtected,
        displayOrder: status.displayOrder,
        productCount: status._count.products,
      },
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch status' },
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
    const statusId = parseInt(id);

    if (isNaN(statusId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if status exists
    const existingStatus = await prisma.frameStatus.findUnique({
      where: { id: statusId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingStatus) {
      return NextResponse.json(
        { success: false, error: 'Status not found' },
        { status: 404 }
      );
    }

    // Prevent editing protected statuses
    if (existingStatus.isProtected) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit protected status "Sold"' },
        { status: 403 }
      );
    }

    // If renaming, check name uniqueness
    if (validation.data.name && validation.data.name !== existingStatus.name) {
      const duplicateName = await prisma.frameStatus.findUnique({
        where: { name: validation.data.name },
      });

      if (duplicateName) {
        return NextResponse.json(
          { success: false, error: `Status "${validation.data.name}" already exists` },
          { status: 409 }
        );
      }
    }

    // If status has products and not confirmed, require confirmation
    if (existingStatus._count.products > 0 && !body.confirmed) {
      return NextResponse.json(
        {
          success: false,
          requiresConfirmation: true,
          productCount: existingStatus._count.products,
          message: `This status is used by ${existingStatus._count.products} product(s). Changes will affect all associated products. Are you sure you want to continue?`,
        },
        { status: 409 }
      );
    }

    const updatedStatus = await prisma.frameStatus.update({
      where: { id: statusId },
      data: validation.data,
    });

    return NextResponse.json({
      success: true,
      status: updatedStatus,
      message: 'Status updated successfully',
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
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
    const statusId = parseInt(id);

    if (isNaN(statusId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status ID' },
        { status: 400 }
      );
    }

    const existingStatus = await prisma.frameStatus.findUnique({
      where: { id: statusId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingStatus) {
      return NextResponse.json(
        { success: false, error: 'Status not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of protected statuses
    if (existingStatus.isProtected) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete protected status "Sold"' },
        { status: 403 }
      );
    }

    // Prevent deletion if status has products
    if (existingStatus._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete status "${existingStatus.name}" - it has ${existingStatus._count.products} product(s) associated with it. Please reassign products first.`,
        },
        { status: 409 }
      );
    }

    await prisma.frameStatus.delete({
      where: { id: statusId },
    });

    return NextResponse.json({
      success: true,
      message: `Status "${existingStatus.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete status' },
      { status: 500 }
    );
  }
}

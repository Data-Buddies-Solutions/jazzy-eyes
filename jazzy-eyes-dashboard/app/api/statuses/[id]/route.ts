import { NextResponse } from 'next/server';
import {
  deleteStatus,
  findStatusWithProductCount,
  statusNameExists,
  updateStatus,
} from '@/db/statuses';
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

    const status = await findStatusWithProductCount(statusId);

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
        productCount: status.productCount,
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

    const existingStatus = await findStatusWithProductCount(statusId);

    if (!existingStatus) {
      return NextResponse.json(
        { success: false, error: 'Status not found' },
        { status: 404 }
      );
    }

    if (existingStatus.isProtected) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit protected status "Sold"' },
        { status: 403 }
      );
    }

    if (validation.data.name && validation.data.name !== existingStatus.name) {
      if (await statusNameExists(validation.data.name)) {
        return NextResponse.json(
          { success: false, error: `Status "${validation.data.name}" already exists` },
          { status: 409 }
        );
      }
    }

    if (existingStatus.productCount > 0 && !body.confirmed) {
      return NextResponse.json(
        {
          success: false,
          requiresConfirmation: true,
          productCount: existingStatus.productCount,
          message: `This status is used by ${existingStatus.productCount} product(s). Changes will affect all associated products. Are you sure you want to continue?`,
        },
        { status: 409 }
      );
    }

    const updatedStatus = await updateStatus(statusId, validation.data);

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

    const existingStatus = await findStatusWithProductCount(statusId);

    if (!existingStatus) {
      return NextResponse.json(
        { success: false, error: 'Status not found' },
        { status: 404 }
      );
    }

    if (existingStatus.isProtected) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete protected status "Sold"' },
        { status: 403 }
      );
    }

    if (existingStatus.productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete status "${existingStatus.name}" - it has ${existingStatus.productCount} product(s) associated with it. Please reassign products first.`,
        },
        { status: 409 }
      );
    }

    await deleteStatus(statusId);

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

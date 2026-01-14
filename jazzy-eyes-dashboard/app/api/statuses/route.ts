import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createStatusSchema } from '@/lib/validations/admin';

export async function GET() {
  try {
    const statuses = await prisma.frameStatus.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      statuses: statuses.map((status) => ({
        id: status.id,
        name: status.name,
        colorScheme: status.colorScheme,
        isProtected: status.isProtected,
        displayOrder: status.displayOrder,
        productCount: status._count.products,
      })),
    });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, colorScheme } = validation.data;

    // Check if status name already exists
    const existingStatus = await prisma.frameStatus.findUnique({
      where: { name },
    });

    if (existingStatus) {
      return NextResponse.json(
        { success: false, error: `Status "${name}" already exists` },
        { status: 409 }
      );
    }

    // Get max display order
    const maxOrder = await prisma.frameStatus.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const newDisplayOrder = (maxOrder?.displayOrder || 0) + 1;

    const status = await prisma.frameStatus.create({
      data: {
        name,
        colorScheme,
        isProtected: false,
        displayOrder: newDisplayOrder,
      },
    });

    return NextResponse.json({
      success: true,
      status,
      message: `Status "${name}" created successfully`,
    });
  } catch (error) {
    console.error('Error creating status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create status' },
      { status: 500 }
    );
  }
}

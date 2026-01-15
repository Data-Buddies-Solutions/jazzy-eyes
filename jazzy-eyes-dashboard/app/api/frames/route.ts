import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { frameFormSchema } from '@/lib/validations/admin';

// Generate compositeId in format: {brandId}-{styleNumber}-{colorCode}-{eyeSize}
function generateCompositeId(
  brandId: number,
  styleNumber: string,
  colorCode: string,
  eyeSize: string
): string {
  return `${brandId}-${styleNumber}-${colorCode}-${eyeSize}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = frameFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate compositeId
    const compositeId = generateCompositeId(
      data.brandId,
      data.styleNumber,
      data.colorCode,
      data.eyeSize
    );

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: data.brandId },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check for duplicate compositeId
    const existingProduct = await prisma.product.findUnique({
      where: { compositeId },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: `Frame with ID ${compositeId} already exists`,
        },
        { status: 409 }
      );
    }

    // Get Active status for new frames
    const activeStatus = await prisma.frameStatus.findUnique({
      where: { name: 'Active' },
    });

    // Create Product + InventoryTransaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Product record
      const product = await tx.product.create({
        data: {
          compositeId,
          brandId: data.brandId,
          statusId: activeStatus?.id,
          styleNumber: data.styleNumber,
          colorCode: data.colorCode,
          eyeSize: data.eyeSize,
          gender: data.gender,
          frameType: data.frameType,
          productType: data.productType,
        },
      });

      // Create InventoryTransaction (ORDER type)
      // Use invoice date for transaction date if provided (for backlog entries)
      const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
      const transactionDate = invoiceDate || new Date();

      await tx.inventoryTransaction.create({
        data: {
          productId: compositeId,
          transactionType: 'ORDER',
          transactionDate,
          invoiceDate,
          quantity: 1,
          unitCost: data.costPrice,
          unitPrice: data.retailPrice,
          status: 'completed',
          notes: data.notes || null,
        },
      });

      return product;
    });

    return NextResponse.json({
      success: true,
      frameId: result.compositeId,
      message: 'Frame added successfully',
    });
  } catch (error) {
    console.error('Error creating frame:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create frame',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        brand: {
          select: {
            brandName: true,
            companyName: true,
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch frames' },
      { status: 500 }
    );
  }
}

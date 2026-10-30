import { NextRequest, NextResponse } from 'next/server';
import { brandExists, createFrame, findProduct, findStatusByName, listFrames, transactionJson } from '@/db/frames';
import { frameFormSchema } from '@/lib/validations/admin';

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

    const compositeId = generateCompositeId(
      data.brandId,
      data.styleNumber,
      data.colorCode,
      data.eyeSize
    );

    if (!(await brandExists(data.brandId))) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (await findProduct(compositeId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Frame with ID ${compositeId} already exists`,
        },
        { status: 409 }
      );
    }

    const activeStatus = await findStatusByName('Active');

    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
    const frameId = await createFrame(
      {
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
      {
        transactionType: 'ORDER',
        transactionDate: invoiceDate || new Date(),
        invoiceDate,
        quantity: 1,
        unitCost: data.costPrice,
        unitPrice: data.retailPrice,
        status: 'completed',
        notes: data.notes || null,
        isSpecialOrder: data.isSpecialOrder ?? false,
      }
    );

    return NextResponse.json({
      success: true,
      frameId,
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
    const frames = await listFrames();
    const products = frames.map((product) => ({
      ...product,
      transactions: product.transactions.map(transactionJson),
    }));

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch frames' },
      { status: 500 }
    );
  }
}

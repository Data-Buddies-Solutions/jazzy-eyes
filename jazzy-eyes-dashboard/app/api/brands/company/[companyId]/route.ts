import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateCompanySchema } from '@/lib/validations/admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId: companyIdStr } = await params;
    const companyId = parseInt(companyIdStr);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateCompanySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { companyName } = validation.data;

    // Check if company exists
    const existingCompany = await prisma.brand.findFirst({
      where: { companyId },
    });

    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Update all brands with this company ID
    const result = await prisma.brand.updateMany({
      where: { companyId },
      data: { companyName },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `Updated ${result.count} brand(s) for company ${companyName}`,
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

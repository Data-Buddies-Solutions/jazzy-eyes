import { NextResponse } from 'next/server';
import { companyExists, renameCompany } from '@/db/brands';
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

    if (!(await companyExists(companyId))) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const updatedCount = await renameCompany(companyId, companyName);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} brand(s) for company ${companyName}`,
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

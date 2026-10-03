import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildRepRow, parseReportDate, selectRepRows } from '@/lib/reports/sales-rep';

export async function GET(request: NextRequest) {
  if (request.cookies.get('jazzy-eyes-session')?.value !== 'authenticated') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const companyId = Number(params.get('companyId'));
  const brandValue = params.get('brandId');
  const brandId = brandValue === null ? null : Number(brandValue);
  const start = parseReportDate(params.get('startDate'));
  const end = parseReportDate(params.get('endDate'));
  if (!Number.isSafeInteger(companyId) || companyId <= 0 ||
    (brandId !== null && (!Number.isSafeInteger(brandId) || brandId <= 0)) || !start || !end || start > end) {
    return NextResponse.json({ success: false, error: 'Select a company and a valid date range (start on or before end).' }, { status: 400 });
  }
  try {
    const brands = await prisma.brand.findMany({
      where: { companyId, ...(brandId !== null ? { id: brandId } : {}) },
      select: { id: true, brandName: true, companyName: true },
    });
    if (!brands.length) return NextResponse.json({ success: false, error: 'Company or brand not found.' }, { status: 404 });
    const asOf = new Date().toISOString().slice(0, 10);
    const startDate = start.toISOString().slice(0, 10), endDate = end.toISOString().slice(0, 10);
    const products = await prisma.product.findMany({
      where: { brandId: { in: brands.map(brand => brand.id) } },
      select: {
        compositeId: true, brandId: true, styleNumber: true, colorCode: true, eyeSize: true, currentQty: true,
        transactions: {
          where: { status: 'completed', transactionDate: { lte: new Date(`${asOf}T23:59:59.999Z`) } },
          select: { id: true, transactionType: true, transactionDate: true, quantity: true, status: true, revertedFromId: true },
          orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
        },
      },
    });
    const names = new Map(brands.map(brand => [brand.id, brand.brandName]));
    const frames = selectRepRows(products.map(product => buildRepRow(product, names.get(product.brandId)!, startDate, endDate, asOf)));
    return NextResponse.json({ success: true, companyName: brands[0].companyName,
      brandName: brandId !== null ? brands[0].brandName : null, startDate, endDate, asOf, frames },
    { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching sales rep report:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report. Please try again.' }, { status: 500 });
  }
}

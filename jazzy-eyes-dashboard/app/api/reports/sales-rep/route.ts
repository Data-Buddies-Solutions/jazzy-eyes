import { NextRequest, NextResponse } from 'next/server';
import { findBrand, repProducts } from '@/db/reports';
import { buildRepRow, parseReportDate, reportToday, selectRepRows } from '@/lib/reports/sales-rep';

export async function GET(request: NextRequest) {
  if (request.cookies.get('jazzy-eyes-session')?.value !== 'authenticated') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const brandId = Number(params.get('brandId'));
  const start = parseReportDate(params.get('startDate'));
  const end = parseReportDate(params.get('endDate'));
  if (!Number.isSafeInteger(brandId) || brandId <= 0 || !start || !end || start > end) {
    return NextResponse.json({ success: false, error: 'Select a brand and a valid date range (start on or before end).' }, { status: 400 });
  }
  let asOf: string;
  try {
    asOf = reportToday(new Date(), params.get('timeZone') ?? 'UTC');
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid report timezone.' }, { status: 400 });
  }
  try {
    const brand = await findBrand(brandId);
    if (!brand) return NextResponse.json({ success: false, error: 'Brand not found.' }, { status: 404 });
    const startDate = start.toISOString().slice(0, 10), endDate = end.toISOString().slice(0, 10);
    const products = await repProducts(brandId, new Date(`${asOf}T23:59:59.999Z`));
    const frames = selectRepRows(products.map(product => buildRepRow(product, brand.brandName, startDate, endDate, asOf)));
    return NextResponse.json({ success: true, brandName: brand.brandName, startDate, endDate, asOf, frames },
    { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching sales rep report:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report. Please try again.' }, { status: 500 });
  }
}

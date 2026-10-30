import { describe, expect, it, vi } from 'vitest'
import { getPool } from '@/db/pool'
import { call, useRouteHarness } from './harness'
import * as kpis from '../../../app/api/analytics/kpis/route'
import * as margins from '../../../app/api/analytics/margins/route'
import * as salesTrends from '../../../app/api/analytics/sales-trends/route'
import * as brandPerformance from '../../../app/api/analytics/brand-performance/route'

useRouteHarness()

// Brand 101 (Gucci) takes 10% off cost from 2026-09-01, so rows on both sides of
// that date show whether the discount applies. Unit costs of 0 make the routes
// fall back to the product's latest ORDER/RESTOCK cost.
async function addReturnsAndZeroCostSales() {
  await getPool().query(`
INSERT INTO products (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type, current_qty, created_at, updated_at) VALUES
  ('102-SL2-GRY-50', 102, 1, 'SL2', 'GRY', '50', 'Women', 'Full Rim', 'Sun', 0, '2026-10-10', '2026-10-10'),
  ('301-EB1-WHT-48', 301, 1, 'EB1', 'WHT', '48', 'Men', 'Full Rim', 'Optical', 1, '2026-10-09', '2026-10-09');

INSERT INTO inventory_transactions (product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, status, is_special_order, write_off_reason, created_at, updated_at) VALUES
  ('101-GG1-BLK-54', 'WRITE_OFF', '2026-08-20', 1, 100.00, 0, 'completed', false, 'return', '2026-08-20', '2026-08-20'),
  ('101-GG1-BLK-54', 'WRITE_OFF', '2026-09-15', 2, 100.00, 0, 'completed', false, 'return', '2026-09-15', '2026-09-15'),
  ('201-RB1-GLD-50', 'WRITE_OFF', '2026-10-08', 1, 60.00, 0, 'completed', false, 'return', '2026-10-08', '2026-10-08'),
  ('301-EB1-WHT-48', 'WRITE_OFF', '2026-10-09', 1, 0, 0, 'completed', false, 'return', '2026-10-09', '2026-10-09'),
  ('102-SL1-BLK-55', 'WRITE_OFF', '2026-10-09', 1, 80.00, 0, 'completed', false, 'damaged', '2026-10-09', '2026-10-09'),
  ('101-GG2-TRT-52', 'SALE', '2026-08-15', 1, 0, 280.00, 'completed', false, NULL, '2026-08-15', '2026-08-15'),
  ('101-GG2-TRT-52', 'SALE', '2026-09-10', 1, 0, 275.50, 'completed', false, NULL, '2026-09-10', '2026-09-10'),
  ('101-GG1-BLK-54', 'SALE', '2026-09-25', 1, 0, 260.00, 'completed', false, NULL, '2026-09-25', '2026-09-25'),
  ('102-SL2-GRY-50', 'SALE', '2026-10-10', 1, 0, 150.00, 'completed', false, NULL, '2026-10-10', '2026-10-10');
`)
}

function range(route: string, startDate?: string, endDate?: string) {
  const query = new URLSearchParams()
  if (startDate !== undefined) query.set('startDate', startDate)
  if (endDate !== undefined) query.set('endDate', endDate)
  return `/api/analytics/${route}?${query}`
}

// An unparseable date reaches the query as Invalid Date, the query throws, and the
// route logs and answers 500. Silence the log so the run output stays readable.
async function callWithInvalidDate(handler: Parameters<typeof call>[0], route: string) {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const response = await call(handler, { path: range(route, 'not-a-date', '2026-10-31') })
    expect(log).toHaveBeenCalled()
    return response
  } finally {
    log.mockRestore()
  }
}

describe('GET /api/analytics/kpis', () => {
  it('rejects a missing startDate', async () => {
    expect(await call(kpis.GET, { path: range('kpis', undefined, '2026-10-31') })).toMatchSnapshot()
  })

  it('rejects a missing endDate', async () => {
    expect(await call(kpis.GET, { path: range('kpis', '2026-09-01') })).toMatchSnapshot()
  })

  it('answers 500 for an unparseable date', async () => {
    expect(await callWithInvalidDate(kpis.GET, 'kpis')).toMatchSnapshot()
  })

  it('values in-stock inventory at the discounted latest cost once the discount has started', async () => {
    expect(await call(kpis.GET, { path: range('kpis', '2026-09-01', '2026-10-31') })).toMatchSnapshot()
  })

  it('values inventory at full cost while the discount start is still in the future', async () => {
    await getPool().query("UPDATE brands SET cost_discount_start_date = '2026-11-01' WHERE id = 101")
    expect(await call(kpis.GET, { path: range('kpis', '2026-09-01', '2026-10-31') })).toMatchSnapshot()
  })

  it('counts returns and credits across the discount start date', async () => {
    await addReturnsAndZeroCostSales()
    expect(await call(kpis.GET, { path: range('kpis', '2026-08-01', '2026-09-30') })).toMatchSnapshot()
  })

  it('carries earlier credits into a later window and applies them to costs', async () => {
    await addReturnsAndZeroCostSales()
    expect(await call(kpis.GET, { path: range('kpis', '2026-10-01', '2026-10-31') })).toMatchSnapshot()
  })

  it('reports all returns over the whole history', async () => {
    await addReturnsAndZeroCostSales()
    expect(await call(kpis.GET, { path: range('kpis', '2000-01-01', '2026-10-15') })).toMatchSnapshot()
  })

  it('reports no returns for a window before any activity', async () => {
    await addReturnsAndZeroCostSales()
    expect(await call(kpis.GET, { path: range('kpis', '2025-01-01', '2025-01-31') })).toMatchSnapshot()
  })
})

// The margins route builds byProductType in the order the sale rows come back, and
// its queries have no ORDER BY, so the snapshot sorts that list to stay stable.
async function callMargins(path: string) {
  const response = await call(margins.GET, { path })
  const body = response.body as { byProductType?: { productType: string }[] }
  body.byProductType?.sort((a, b) => a.productType.localeCompare(b.productType))
  return response
}

describe('GET /api/analytics/margins', () => {
  it('rejects a missing startDate', async () => {
    expect(await callMargins(range('margins', undefined, '2026-10-31'))).toMatchSnapshot()
  })

  it('rejects a missing endDate', async () => {
    expect(await callMargins(range('margins', '2026-09-01'))).toMatchSnapshot()
  })

  it('answers 500 for an unparseable date', async () => {
    expect(await callWithInvalidDate(margins.GET, 'margins')).toMatchSnapshot()
  })

  it('reports N/A brands for a range with no sales', async () => {
    expect(await callMargins(range('margins', '2026-01-01', '2026-01-31'))).toMatchSnapshot()
  })

  it('includes special orders and costed RX sales and skips zero-cost RX sales', async () => {
    expect(await callMargins(range('margins', '2026-09-01', '2026-10-31'))).toMatchSnapshot()
  })

  it('includes both ends of a single-day range', async () => {
    expect(await callMargins(range('margins', '2026-10-02', '2026-10-02'))).toMatchSnapshot()
  })

  it('treats a mid-day endDate timestamp against date-only rows', async () => {
    expect(
      await callMargins(range('margins', '2026-09-20', '2026-10-02T12:00:00.000Z'))
    ).toMatchSnapshot()
  })

  it('falls back to the latest order cost, discounted only after the start date', async () => {
    await addReturnsAndZeroCostSales()
    expect(await callMargins(range('margins', '2026-08-01', '2026-09-30'))).toMatchSnapshot()
  })

  it('lists a brand with only return credits and drops a brand whose credits are zero', async () => {
    await addReturnsAndZeroCostSales()
    expect(await callMargins(range('margins', '2026-10-01', '2026-10-31'))).toMatchSnapshot()
  })
})

describe('GET /api/analytics/sales-trends', () => {
  it('rejects a missing startDate', async () => {
    expect(await call(salesTrends.GET, { path: range('sales-trends', undefined, '2026-10-31') })).toMatchSnapshot()
  })

  it('rejects a missing endDate', async () => {
    expect(await call(salesTrends.GET, { path: range('sales-trends', '2026-09-01') })).toMatchSnapshot()
  })

  it('answers 500 for an unparseable date', async () => {
    expect(await callWithInvalidDate(salesTrends.GET, 'sales-trends')).toMatchSnapshot()
  })

  it('reports N/A days for a range with no sales', async () => {
    expect(await call(salesTrends.GET, { path: range('sales-trends', '2026-01-01', '2026-01-31') })).toMatchSnapshot()
  })

  it('combines inventory sales, special orders and RX sales by day and brand', async () => {
    expect(await call(salesTrends.GET, { path: range('sales-trends', '2026-09-01', '2026-10-31') })).toMatchSnapshot()
  })

  it('includes both ends of a single-day range', async () => {
    expect(await call(salesTrends.GET, { path: range('sales-trends', '2026-09-20', '2026-09-20') })).toMatchSnapshot()
  })

  it('sums several sales on one day, counting each row once whatever its quantity', async () => {
    await getPool().query(`
INSERT INTO inventory_transactions (product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, status, is_special_order, created_at, updated_at) VALUES
  ('201-RB1-GLD-50', 'SALE', '2026-09-20', 2, 60.00, 149.95, 'completed', false, '2026-09-20', '2026-09-20'),
  ('102-SL1-BLK-55', 'SALE', '2026-09-20', 1, 80.00, 199.00, 'completed', false, '2026-09-20', '2026-09-20');
INSERT INTO rx_sales (brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, sale_date, sale_price, cost_price, created_at, updated_at) VALUES
  (102, 'SL9', 'BLK', '52', 'Men', 'Full Rim', 'Optical', '2026-09-20', 310.10, 120.00, '2026-09-20', '2026-09-20');
`)
    expect(await call(salesTrends.GET, { path: range('sales-trends', '2026-09-01', '2026-09-30') })).toMatchSnapshot()
  })
})

describe('GET /api/analytics/brand-performance', () => {
  it('rejects a missing startDate', async () => {
    expect(
      await call(brandPerformance.GET, { path: range('brand-performance', undefined, '2026-10-31') })
    ).toMatchSnapshot()
  })

  it('rejects a missing endDate', async () => {
    expect(await call(brandPerformance.GET, { path: range('brand-performance', '2026-09-01') })).toMatchSnapshot()
  })

  it('answers 500 for an unparseable date', async () => {
    expect(await callWithInvalidDate(brandPerformance.GET, 'brand-performance')).toMatchSnapshot()
  })

  it('lists every brand with zero sales for a range with no activity', async () => {
    expect(
      await call(brandPerformance.GET, { path: range('brand-performance', '2026-01-01', '2026-01-31') })
    ).toMatchSnapshot()
  })

  it('counts special orders and RX sales, leaving zero-cost RX sales out of the margin', async () => {
    expect(
      await call(brandPerformance.GET, { path: range('brand-performance', '2026-09-01', '2026-10-31') })
    ).toMatchSnapshot()
  })

  it('falls back only to order costs inside the range, discounted after the start date', async () => {
    await addReturnsAndZeroCostSales()
    expect(
      await call(brandPerformance.GET, { path: range('brand-performance', '2026-08-01', '2026-09-30') })
    ).toMatchSnapshot()
  })

  it('leaves a zero-cost sale with no order out of the margin', async () => {
    await addReturnsAndZeroCostSales()
    expect(
      await call(brandPerformance.GET, { path: range('brand-performance', '2026-10-01', '2026-10-31') })
    ).toMatchSnapshot()
  })

  it('recommends a reorder only when products fall below 20% of the allocation', async () => {
    await getPool().query('UPDATE brands SET allocation_quantity = 2 WHERE id = 201')
    await getPool().query('UPDATE brands SET allocation_quantity = 0 WHERE id = 301')
    expect(
      await call(brandPerformance.GET, { path: range('brand-performance', '2026-09-01', '2026-10-31') })
    ).toMatchSnapshot()
  })
})

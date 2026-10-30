import { NextRequest } from 'next/server'
import { describe, expect, test, vi } from 'vitest'
import { getPool } from '@/db/pool'
import { call, useRouteHarness } from './harness'
import * as eom from '../../../app/api/reports/eom/route'
import * as inventory from '../../../app/api/reports/inventory/route'
import * as salesRep from '../../../app/api/reports/sales-rep/route'
import * as specialOrders from '../../../app/api/reports/special-orders/route'

useRouteHarness()

type Tx = {
  product: string
  type: 'ORDER' | 'SALE' | 'WRITE_OFF' | 'RESTOCK' | 'REVERT_WRITE_OFF'
  date: string
  quantity?: number
  unitCost?: number
  unitPrice?: number
  status?: string
  writeOffReason?: string | null
  revertedFromId?: number | null
  isSpecialOrder?: boolean
}

async function insertTransaction(tx: Tx): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO inventory_transactions
       (product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, status,
        write_off_reason, reverted_from_id, is_special_order, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '2026-01-01')
     RETURNING id`,
    [
      tx.product,
      tx.type,
      tx.date,
      tx.quantity ?? 1,
      tx.unitCost ?? 0,
      tx.unitPrice ?? 0,
      tx.status ?? 'completed',
      tx.writeOffReason ?? null,
      tx.revertedFromId ?? null,
      tx.isSpecialOrder ?? false,
    ]
  )
  return rows[0].id
}

async function insertProduct(compositeId: string, brandId: number, statusId: number | null, currentQty: number) {
  const [, style, color, size] = compositeId.split('-')
  await getPool().query(
    `INSERT INTO products
       (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type,
        current_qty, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'Unisex', 'Full Rim', 'Optical', $7, '2026-01-01')`,
    [compositeId, brandId, statusId, style, color, size, currentQty]
  )
}

async function insertRxSale(brandId: number, saleDate: string, salePrice: number, costPrice: number) {
  await getPool().query(
    `INSERT INTO rx_sales
       (brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, sale_date, sale_price,
        cost_price, updated_at)
     VALUES ($1, 'RX1', 'BLK', '50', 'Men', 'Full Rim', 'Optical', $2, $3, $4, '2026-01-01')`,
    [brandId, saleDate, salePrice, costPrice]
  )
}

function silenceConsoleError() {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
}

const SESSION_COOKIE = 'jazzy-eyes-session=authenticated'

type Handler = Parameters<typeof call>[0]

function withSession(handler: Handler): Handler {
  return (request, context) => {
    const headers = new Headers(request.headers)
    headers.set('cookie', SESSION_COOKIE)
    return handler(new NextRequest(request.url, { method: request.method, headers }), context)
  }
}

const eomGet = (query = '') => call(eom.GET, { path: `/api/reports/eom${query}` })
const inventoryGet = (query = '') => call(inventory.GET, { path: `/api/reports/inventory${query}` })
const specialOrdersGet = (query = '') => call(specialOrders.GET, { path: `/api/reports/special-orders${query}` })
const salesRepGet = (query = '') => call(withSession(salesRep.GET), { path: `/api/reports/sales-rep${query}` })

describe('GET /api/reports/eom', () => {
  test('defaults to the current month and year from the frozen clock', async () => {
    expect(await eomGet()).toMatchSnapshot()
  })

  test('explicit month and year (September, after the cost-discount start)', async () => {
    expect(await eomGet('?year=2026&month=9')).toMatchSnapshot()
  })

  test('month only defaults the year', async () => {
    expect(await eomGet('?month=8')).toMatchSnapshot()
  })

  test('year only defaults the month', async () => {
    expect(await eomGet('?year=2025')).toMatchSnapshot()
  })

  test('empty period with no data', async () => {
    expect(await eomGet('?year=2024&month=1')).toMatchSnapshot()
  })

  test.each([
    ['month=0&year=2026'],
    ['month=13&year=2026'],
    ['month=abc&year=2026'],
    ['month=5&year=1999'],
    ['month=5&year=2101'],
    ['month=5&year=abc'],
  ])('rejects invalid parameters: %s', async (query) => {
    expect(await eomGet(`?${query}`)).toMatchSnapshot()
  })

  test('zero-cost sales fall back to the latest order or restock cost, discounted from the start date', async () => {
    await insertTransaction({ product: '101-GG1-BLK-54', type: 'SALE', date: '2026-08-20', unitPrice: 250 })
    await insertTransaction({ product: '101-GG1-BLK-54', type: 'SALE', date: '2026-09-10', unitPrice: 250 })
    await insertTransaction({ product: '201-RB1-GLD-50', type: 'SALE', date: '2026-10-10', unitPrice: 150 })
    expect({
      august: await eomGet('?year=2026&month=8'),
      september: await eomGet('?year=2026&month=9'),
      october: await eomGet('?year=2026&month=10'),
    }).toMatchSnapshot()
  })

  test('sales on the first and last day of a month land at the month boundaries', async () => {
    await insertTransaction({ product: '102-SL1-BLK-55', type: 'SALE', date: '2026-10-01', unitCost: 80, unitPrice: 199 })
    await insertTransaction({ product: '102-SL1-BLK-55', type: 'SALE', date: '2026-10-31', unitCost: 80, unitPrice: 199 })
    await insertRxSale(102, '2026-11-01', 210, 90)
    await insertRxSale(102, '2026-09-30', 205, 85)
    expect({
      september: await eomGet('?year=2026&month=9'),
      october: await eomGet('?year=2026&month=10'),
      november: await eomGet('?year=2026&month=11'),
    }).toMatchSnapshot()
  })

  test('returns generate credits that later cost of goods consumes', async () => {
    await insertProduct('102-SL9-RED-50', 102, 1, 0)
    await insertTransaction({ product: '101-GG1-BLK-54', type: 'WRITE_OFF', date: '2026-08-15', writeOffReason: 'return' })
    await insertTransaction({ product: '101-GG2-TRT-52', type: 'WRITE_OFF', date: '2026-09-15', quantity: 2, writeOffReason: 'return' })
    await insertTransaction({ product: '102-SL9-RED-50', type: 'WRITE_OFF', date: '2026-09-16', writeOffReason: 'return' })
    await insertTransaction({ product: '102-SL1-BLK-55', type: 'WRITE_OFF', date: '2026-10-09', writeOffReason: 'return' })
    await insertRxSale(102, '2026-10-20', 210, 50)
    expect({
      july: await eomGet('?year=2026&month=7'),
      august: await eomGet('?year=2026&month=8'),
      september: await eomGet('?year=2026&month=9'),
      october: await eomGet('?year=2026&month=10'),
      november: await eomGet('?year=2026&month=11'),
    }).toMatchSnapshot()
  })
})

describe('GET /api/reports/inventory', () => {
  test('requires brandId', async () => {
    expect(await inventoryGet()).toMatchSnapshot()
  })

  test('rejects a non-numeric brandId', async () => {
    expect(await inventoryGet('?brandId=abc')).toMatchSnapshot()
  })

  test('parses a brandId with trailing characters leniently', async () => {
    expect(await inventoryGet('?brandId=102abc')).toMatchSnapshot()
  })

  test('returns 404 for an unknown brand', async () => {
    expect(await inventoryGet('?brandId=999')).toMatchSnapshot()
  })

  test('defaults to January 1 through now (brand with sales and a special order)', async () => {
    expect(await inventoryGet('?brandId=101')).toMatchSnapshot()
  })

  test('default period for a brand with write-offs, a revert, a restock and a discontinued frame', async () => {
    expect(await inventoryGet('?brandId=201')).toMatchSnapshot()
  })

  test('explicit date range starting after inception', async () => {
    expect(await inventoryGet('?brandId=101&startDate=2026-09-01&endDate=2026-09-30')).toMatchSnapshot()
  })

  test('explicit date range starting before inception uses the inception boundary', async () => {
    expect(await inventoryGet('?brandId=101&startDate=2025-01-01&endDate=2026-12-31')).toMatchSnapshot()
  })

  test('start date only', async () => {
    expect(await inventoryGet('?brandId=201&startDate=2026-10-01')).toMatchSnapshot()
  })

  test('end date only', async () => {
    expect(await inventoryGet('?brandId=201&endDate=2026-09-30')).toMatchSnapshot()
  })

  test('brand with no products', async () => {
    expect(await inventoryGet('?brandId=301')).toMatchSnapshot()
  })

  test('display statuses for returned, sold out and discontinued frames', async () => {
    await insertProduct('102-RT1-BLK-50', 102, 1, 0)
    await insertTransaction({ product: '102-RT1-BLK-50', type: 'ORDER', date: '2026-02-01', unitCost: 40, unitPrice: 90 })
    await insertTransaction({ product: '102-RT1-BLK-50', type: 'WRITE_OFF', date: '2026-03-01', writeOffReason: 'return' })
    await insertProduct('102-DS1-BLK-50', 102, 3, 0)
    await insertTransaction({ product: '102-DS1-BLK-50', type: 'ORDER', date: '2026-02-01', unitCost: 40, unitPrice: 90 })
    await insertTransaction({ product: '102-DS1-BLK-50', type: 'SALE', date: '2026-03-01', unitCost: 40, unitPrice: 90 })
    await insertProduct('102-DS2-BLK-50', 102, 3, 2)
    await insertTransaction({ product: '102-DS2-BLK-50', type: 'ORDER', date: '2026-02-01', quantity: 2, unitCost: 40, unitPrice: 90 })
    await insertProduct('102-DM1-BLK-50', 102, 1, 0)
    await insertTransaction({ product: '102-DM1-BLK-50', type: 'ORDER', date: '2026-02-01', unitCost: 40, unitPrice: 90 })
    await insertTransaction({ product: '102-DM1-BLK-50', type: 'WRITE_OFF', date: '2026-03-01', writeOffReason: 'Damaged' })
    await insertProduct('102-NO1-BLK-50', 102, null, 0)
    expect(await inventoryGet('?brandId=102')).toMatchSnapshot()
  })

  test('an unparseable date fails with 500', async () => {
    silenceConsoleError()
    expect(await inventoryGet('?brandId=101&startDate=not-a-date')).toMatchSnapshot()
  })
})

describe('GET /api/reports/sales-rep', () => {
  test('requires the session cookie', async () => {
    expect(
      await call(salesRep.GET, { path: '/api/reports/sales-rep?brandId=101&startDate=2026-09-01&endDate=2026-09-30' })
    ).toMatchSnapshot()
  })

  test.each([
    ['startDate=2026-09-01&endDate=2026-09-30'],
    ['brandId=0&startDate=2026-09-01&endDate=2026-09-30'],
    ['brandId=-1&startDate=2026-09-01&endDate=2026-09-30'],
    ['brandId=1.5&startDate=2026-09-01&endDate=2026-09-30'],
    ['brandId=abc&startDate=2026-09-01&endDate=2026-09-30'],
    ['brandId=101&endDate=2026-09-30'],
    ['brandId=101&startDate=2026-09-01'],
    ['brandId=101&startDate=2026-9-1&endDate=2026-09-30'],
    ['brandId=101&startDate=2026-02-30&endDate=2026-03-30'],
    ['brandId=101&startDate=2026-10-01&endDate=2026-09-30'],
    ['brandId=101&startDate=2026-09-01&endDate=2026-09-30&timeZone=Not/AZone'],
  ])('rejects invalid parameters: %s', async (query) => {
    expect(await salesRepGet(`?${query}`)).toMatchSnapshot()
  })

  test('returns 404 for an unknown brand', async () => {
    expect(await salesRepGet('?brandId=999&startDate=2026-09-01&endDate=2026-09-30')).toMatchSnapshot()
  })

  test('brand with sales in the period, default UTC timezone', async () => {
    expect(await salesRepGet('?brandId=101&startDate=2026-09-01&endDate=2026-09-30')).toMatchSnapshot()
  })

  test('single-day range', async () => {
    expect(await salesRepGet('?brandId=101&startDate=2026-10-02&endDate=2026-10-02')).toMatchSnapshot()
  })

  test('brand with write-offs, a revert and a restock', async () => {
    expect(await salesRepGet('?brandId=201&startDate=2026-07-01&endDate=2026-10-15')).toMatchSnapshot()
  })

  test('period without activity still lists in-stock frames', async () => {
    expect(await salesRepGet('?brandId=102&startDate=2025-01-01&endDate=2025-01-31')).toMatchSnapshot()
  })

  test('brand with no products', async () => {
    expect(await salesRepGet('?brandId=301&startDate=2026-01-01&endDate=2026-12-31')).toMatchSnapshot()
  })

  test('timeZone moves the as-of date and the transactions it includes', async () => {
    await insertTransaction({ product: '102-SL1-BLK-55', type: 'RESTOCK', date: '2026-10-16', unitCost: 80, unitPrice: 199 })
    const query = '?brandId=102&startDate=2026-10-01&endDate=2026-10-31'
    expect({
      utc: await salesRepGet(query),
      losAngeles: await salesRepGet(`${query}&timeZone=America/Los_Angeles`),
      kiritimati: await salesRepGet(`${query}&timeZone=Pacific/Kiritimati`),
    }).toMatchSnapshot()
  })

  test('shelf ages, age bands, sold units, inception orders and non-completed transactions', async () => {
    const frames: Array<[string, string]> = [
      ['102-AG10-BLK-50', '2026-10-05'],
      ['102-AG30-BLK-50', '2026-09-15'],
      ['102-AG60-BLK-50', '2026-08-16'],
      ['102-AG90-BLK-50', '2026-07-17'],
      ['102-AGIN-BLK-50', '2026-01-08'],
    ]
    for (const [id, date] of frames) {
      await insertProduct(id, 102, 1, 1)
      await insertTransaction({ product: id, type: 'ORDER', date, unitCost: 40, unitPrice: 90 })
    }
    await insertProduct('102-FIFO-BLK-50', 102, 1, 1)
    await insertTransaction({ product: '102-FIFO-BLK-50', type: 'ORDER', date: '2026-06-01', unitCost: 40, unitPrice: 90 })
    await insertTransaction({ product: '102-FIFO-BLK-50', type: 'ORDER', date: '2026-09-01', unitCost: 40, unitPrice: 90 })
    await insertTransaction({ product: '102-FIFO-BLK-50', type: 'SALE', date: '2026-10-03', unitCost: 40, unitPrice: 90 })
    await insertProduct('102-OVER-BLK-50', 102, 1, 0)
    await insertTransaction({ product: '102-OVER-BLK-50', type: 'SALE', date: '2026-10-04', unitCost: 40, unitPrice: 90 })
    await insertProduct('102-WOFF-BLK-50', 102, 1, 2)
    await insertTransaction({ product: '102-WOFF-BLK-50', type: 'ORDER', date: '2026-05-01', quantity: 2, unitCost: 40, unitPrice: 90 })
    const writeOff = await insertTransaction({ product: '102-WOFF-BLK-50', type: 'WRITE_OFF', date: '2026-06-01', writeOffReason: 'Lost' })
    await insertTransaction({ product: '102-WOFF-BLK-50', type: 'REVERT_WRITE_OFF', date: '2026-06-02', revertedFromId: writeOff })
    await insertProduct('102-PEND-BLK-50', 102, 1, 1)
    await insertTransaction({ product: '102-PEND-BLK-50', type: 'ORDER', date: '2026-10-01', unitCost: 40, unitPrice: 90 })
    await insertTransaction({ product: '102-PEND-BLK-50', type: 'SALE', date: '2026-10-02', status: 'pending' })
    expect(await salesRepGet('?brandId=102&startDate=2026-01-01&endDate=2026-10-15')).toMatchSnapshot()
  })
})

describe('GET /api/reports/special-orders', () => {
  test('lists every special order newest first', async () => {
    expect(await specialOrdersGet()).toMatchSnapshot()
  })

  test('filters by brandId', async () => {
    expect(await specialOrdersGet('?brandId=101')).toMatchSnapshot()
  })

  test('ignores a non-numeric brandId', async () => {
    expect(await specialOrdersGet('?brandId=abc')).toMatchSnapshot()
  })

  test('brand with no special orders', async () => {
    expect(await specialOrdersGet('?brandId=301')).toMatchSnapshot()
  })
})

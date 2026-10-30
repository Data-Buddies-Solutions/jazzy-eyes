import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../pool'
import {
  allReturnsEver,
  allRxSalesEver,
  allSalesEver,
  brandInventory,
  findBrand,
  repProducts,
  returnsInPeriod,
  rxSalesInPeriod,
  salesInPeriod,
  specialOrders,
} from '../reports'
import { sql } from '../sql'

type Tx = {
  product: string
  type: string
  date: string
  cost?: number
  reason?: string | null
  status?: string
  special?: boolean
}

function transaction({ product, type, date, cost = 0, reason = null, status = 'completed', special = false }: Tx) {
  return db.affected(sql`INSERT INTO inventory_transactions
      (product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, status, write_off_reason,
       is_special_order, updated_at)
    VALUES (${product}, ${type}::"TransactionType", ${date}, ${1}, ${cost}, ${200}, ${status}, ${reason}, ${special}, now())`)
}

function product(id: string, brandId: number, statusId: number | null) {
  return db.affected(sql`INSERT INTO products
      (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type,
       current_qty, updated_at)
    VALUES (${id}, ${brandId}, ${statusId}, ${id.split('-')[1]}, ${'BLK'}, ${'50'}, ${'Men'}, ${'Full Rim'}, ${'Optical'},
       ${1}, now())`)
}

const ids = (rows: { id: number }[]) => rows.map((row) => row.id)

// Los Angeles midnight on the 1st through 23:59:59.999 on the 30th, as the EOM route builds September.
const SEPTEMBER = { start: new Date('2026-09-01T07:00:00.000Z'), end: new Date('2026-10-01T06:59:59.999Z') }

beforeEach(async () => {
  await db.affected(sql`INSERT INTO frame_statuses (name, "colorScheme", updated_at) VALUES (${'Discontinued'}, ${'gray'}, now())`)
  await db.affected(sql`INSERT INTO brands
      (id, company_name, company_id, brand_name, allocation_quantity, cost_discount_percent, cost_discount_start_date, updated_at)
    VALUES (${1}, ${'Kering'}, ${10}, ${'Gucci'}, ${5}, ${10}, ${'2026-09-01'}, now()),
           (${2}, ${'Indie'}, ${20}, ${'Other'}, ${5}, ${null}, ${null}, now())`)
  await product('1-B', 1, 1)
  await product('1-A', 1, null)
  await product('2-C', 2, null)
})

describe('reports', () => {
  it('finds a brand by id, or null', async () => {
    expect(await findBrand(1)).toEqual({ id: 1, brandName: 'Gucci', companyName: 'Kering' })
    expect(await findBrand(99)).toBeNull()
  })

  it('selects sales whose UTC calendar day falls between the period bounds, by date then id', async () => {
    await transaction({ product: '1-A', type: 'SALE', date: '2026-10-01' }) // 1: the end bound's UTC day
    await transaction({ product: '1-A', type: 'SALE', date: '2026-09-01' }) // 2: the start bound's UTC day
    await transaction({ product: '1-B', type: 'SALE', date: '2026-09-01' }) // 3
    await transaction({ product: '1-A', type: 'SALE', date: '2026-08-31' }) // 4: before
    await transaction({ product: '1-A', type: 'SALE', date: '2026-10-02' }) // 5: after
    await transaction({ product: '1-A', type: 'ORDER', date: '2026-09-05' }) // 6: not a sale

    expect(ids(await salesInPeriod(SEPTEMBER))).toEqual([2, 3, 1])
    expect(ids(await allSalesEver())).toEqual([1, 2, 3, 4, 5])
  })

  it('carries product, brand discount and the latest ORDER or RESTOCK cost on each sale', async () => {
    await transaction({ product: '1-A', type: 'ORDER', date: '2026-01-10', cost: 100 })
    await transaction({ product: '1-A', type: 'RESTOCK', date: '2026-02-10', cost: 90 })
    await transaction({ product: '1-A', type: 'RESTOCK', date: '2026-02-10', cost: 80 })
    await transaction({ product: '1-A', type: 'SALE', date: '2026-01-05', cost: 0 })
    await transaction({ product: '2-C', type: 'SALE', date: '2026-03-01', cost: 0 })

    expect(await allSalesEver()).toEqual([
      {
        id: 4,
        transactionDate: new Date('2026-01-05T00:00:00.000Z'),
        quantity: 1,
        unitCost: 0,
        unitPrice: 200,
        styleNumber: 'A',
        colorCode: 'BLK',
        eyeSize: '50',
        gender: 'Men',
        frameType: 'Full Rim',
        productType: 'Optical',
        brandName: 'Gucci',
        costDiscountPercent: 10,
        costDiscountStartDate: new Date('2026-09-01T00:00:00.000Z'),
        receivedUnitCost: 80,
      },
      expect.objectContaining({ id: 5, brandName: 'Other', costDiscountPercent: null, receivedUnitCost: null }),
    ])
  })

  it('selects only write-offs with reason "return", by id', async () => {
    await transaction({ product: '1-A', type: 'WRITE_OFF', date: '2026-09-20', reason: 'return' })
    await transaction({ product: '1-A', type: 'WRITE_OFF', date: '2026-09-10', reason: 'Damaged' })
    await transaction({ product: '1-B', type: 'WRITE_OFF', date: '2026-09-02', reason: 'return' })
    await transaction({ product: '1-B', type: 'WRITE_OFF', date: '2026-07-02', reason: 'return' })

    expect(ids(await returnsInPeriod(SEPTEMBER))).toEqual([1, 3])
    expect(ids(await allReturnsEver())).toEqual([1, 3, 4])
  })

  it('selects RX sales with their brand name, by date in a period and by id otherwise', async () => {
    const rx = (brandId: number, date: string) =>
      db.affected(sql`INSERT INTO rx_sales
          (brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, sale_date, sale_price, updated_at)
        VALUES (${brandId}, ${'RX'}, ${'BLK'}, ${'50'}, ${'Men'}, ${'Full Rim'}, ${'Optical'}, ${date}, ${300}, now())`)
    await rx(2, '2026-09-30')
    await rx(1, '2026-09-02')
    await rx(1, '2026-08-31')

    const september = await rxSalesInPeriod(SEPTEMBER)
    expect(september.map((row) => [row.id, row.brandName, row.salePrice, row.costPrice])).toEqual([
      [2, 'Gucci', 300, 0],
      [1, 'Other', 300, 0],
    ])
    expect(ids(await allRxSalesEver())).toEqual([1, 2, 3])
  })

  it("lists a brand's products by composite id with status and every transaction oldest first", async () => {
    await transaction({ product: '1-B', type: 'SALE', date: '2026-03-01', status: 'pending' })
    await transaction({ product: '1-B', type: 'ORDER', date: '2026-02-01', cost: 40 })
    await transaction({ product: '2-C', type: 'ORDER', date: '2026-02-01' })

    const inventory = await brandInventory(1)
    expect(inventory.map((row) => [row.compositeId, row.statusName, row.statusColorScheme])).toEqual([
      ['1-A', null, null],
      ['1-B', 'Discontinued', 'gray'],
    ])
    expect(inventory[0].transactions).toEqual([])
    expect(inventory[1].transactions).toEqual([
      expect.objectContaining({ transactionType: 'ORDER', unitCost: 40 }),
      expect.objectContaining({ transactionType: 'SALE', writeOffReason: null }),
    ])
    expect(await brandInventory(99)).toEqual([])
  })

  it('lists special orders newest first, ties by id descending, optionally for one brand', async () => {
    await transaction({ product: '1-A', type: 'ORDER', date: '2026-02-01', special: true })
    await transaction({ product: '2-C', type: 'ORDER', date: '2026-02-01', special: true })
    await transaction({ product: '1-B', type: 'SALE', date: '2026-03-01', special: true })
    await transaction({ product: '1-B', type: 'SALE', date: '2026-04-01' })

    expect(ids(await specialOrders(null))).toEqual([3, 2, 1])
    const gucci = await specialOrders(1)
    expect(ids(gucci)).toEqual([3, 1])
    expect(gucci[0]).toMatchObject({ compositeId: '1-B', brandName: 'Gucci', status: 'completed', invoiceNumber: null })
  })

  it('gives the sales-rep report completed transactions dated on or before the as-of day', async () => {
    await transaction({ product: '1-A', type: 'ORDER', date: '2026-10-15' })
    await transaction({ product: '1-A', type: 'SALE', date: '2026-10-16' })
    await transaction({ product: '1-A', type: 'SALE', date: '2026-10-01', status: 'pending' })
    await transaction({ product: '2-C', type: 'ORDER', date: '2026-10-01' })

    expect(await repProducts(1, new Date('2026-10-15T23:59:59.999Z'))).toEqual([
      {
        compositeId: '1-A',
        brandId: 1,
        styleNumber: 'A',
        colorCode: 'BLK',
        eyeSize: '50',
        currentQty: 1,
        transactions: [
          {
            id: 1,
            transactionType: 'ORDER',
            transactionDate: new Date('2026-10-15T00:00:00.000Z'),
            quantity: 1,
            status: 'completed',
            revertedFromId: null,
          },
        ],
      },
      expect.objectContaining({ compositeId: '1-B', transactions: [] }),
    ])
  })
})

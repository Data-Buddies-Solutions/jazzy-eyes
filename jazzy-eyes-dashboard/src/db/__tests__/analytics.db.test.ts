import { describe, expect, it } from 'vitest'
import {
  brandsWithActivity,
  inStockProductRows,
  returnWriteOffRows,
  rxSaleRows,
  saleRows,
} from '../analytics'
import { getPool } from '../pool'

const day = (date: string) => new Date(`${date}T00:00:00.000Z`)
const range = (start: string, end: string) => ({ start: day(start), end: day(end) })

// Brand 1 has a discount, two products and RX sales; brand 2 has a product with no
// status and no order; brand 3 has nothing. Transaction ids are listed out of date
// order so row order shows which column sorts it.
async function seed() {
  await getPool().query(`
INSERT INTO frame_statuses (id, name, "colorScheme", updated_at) VALUES (1, 'Active', 'green', now());
INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, cost_discount_percent, cost_discount_start_date, updated_at) VALUES
  (1, 'Co', 1, 'Zeta', 10, 10.00, '2026-09-01', now()),
  (2, 'Co', 1, 'Alpha', 5, NULL, NULL, now()),
  (3, 'Co', 1, 'Mid', 5, 0, NULL, now());
INSERT INTO products (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type, current_qty, updated_at) VALUES
  ('1-B', 1, 1, 'B', 'X', '50', 'Men', 'Full Rim', 'Sun', 2, now()),
  ('1-A', 1, 1, 'A', 'X', '50', 'Men', 'Full Rim', 'Optical', 0, now()),
  ('2-A', 2, NULL, 'A', 'X', '50', 'Men', 'Full Rim', 'Optical', 1, now());
INSERT INTO inventory_transactions (id, product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, write_off_reason, updated_at) VALUES
  (1, '1-B', 'ORDER', '2026-08-01', 3, 100.00, 250.00, NULL, now()),
  (2, '1-B', 'RESTOCK', '2026-09-05', 1, 90.50, 250.00, NULL, now()),
  (3, '1-B', 'ORDER', '2026-09-05', 1, 95.25, 250.00, NULL, now()),
  (4, '1-B', 'SALE', '2026-09-30', 1, 0, 260.00, NULL, now()),
  (5, '1-B', 'SALE', '2026-09-10', 1, 90.00, 249.99, NULL, now()),
  (6, '1-A', 'SALE', '2026-09-20', 1, 0, 199.00, NULL, now()),
  (7, '2-A', 'SALE', '2026-10-01', 1, 0, 120.00, NULL, now()),
  (8, '1-B', 'WRITE_OFF', '2026-09-15', 1, 0, 0, 'return', now()),
  (9, '1-B', 'WRITE_OFF', '2026-09-16', 1, 0, 0, 'damaged', now()),
  (10, '2-A', 'WRITE_OFF', '2026-08-15', 2, 0, 0, 'return', now());
INSERT INTO rx_sales (id, brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, sale_date, sale_price, cost_price, updated_at) VALUES
  (1, 1, 'R', 'X', '50', 'Men', 'Full Rim', 'Optical', '2026-09-25', 400.00, 150.00, now()),
  (2, 2, 'R', 'X', '50', 'Men', 'Full Rim', 'Sun', '2026-09-01', 220.00, 0, now()),
  (3, 1, 'R', 'X', '50', 'Men', 'Full Rim', 'Optical', '2026-09-02', 300.00, 100.00, now());
`)
}

const zetaCost = { brandName: 'Zeta', costDiscountPercent: 10, costDiscountStartDate: day('2026-09-01') }

describe('saleRows', () => {
  it('returns every sale with numeric prices, its brand discount and the latest order cost', async () => {
    await seed()

    expect(await saleRows()).toEqual([
      { id: 4, productId: '1-B', transactionDate: day('2026-09-30'), quantity: 1, unitCost: 0, unitPrice: 260, productType: 'Sun', ...zetaCost, latestOrderCost: 95.25 },
      { id: 5, productId: '1-B', transactionDate: day('2026-09-10'), quantity: 1, unitCost: 90, unitPrice: 249.99, productType: 'Sun', ...zetaCost, latestOrderCost: 95.25 },
      { id: 6, productId: '1-A', transactionDate: day('2026-09-20'), quantity: 1, unitCost: 0, unitPrice: 199, productType: 'Optical', ...zetaCost, latestOrderCost: null },
      { id: 7, productId: '2-A', transactionDate: day('2026-10-01'), quantity: 1, unitCost: 0, unitPrice: 120, productType: 'Optical', brandName: 'Alpha', costDiscountPercent: null, costDiscountStartDate: null, latestOrderCost: null },
    ])
  })

  it('keeps sales on both bounds of the range and sorts by date when asked', async () => {
    await seed()

    const ids = (rows: { id: number }[]) => rows.map((row) => row.id)
    expect(ids(await saleRows(range('2026-09-10', '2026-09-30')))).toEqual([4, 5, 6])
    expect(ids(await saleRows(range('2026-09-10', '2026-09-30'), 'date'))).toEqual([5, 6, 4])
  })

  it('compares a mid-day bound as its UTC date', async () => {
    await seed()

    const rows = await saleRows({ start: new Date('2026-09-10T15:00:00Z'), end: new Date('2026-09-20T09:00:00Z') })
    expect(rows.map((row) => row.id)).toEqual([5, 6])
  })

  it('rejects an invalid date', async () => {
    await expect(saleRows({ start: new Date('nope'), end: day('2026-09-30') })).rejects.toThrow()
  })
})

describe('returnWriteOffRows', () => {
  it('returns only write-offs for a return, inside the range when one is given', async () => {
    await seed()

    expect(await returnWriteOffRows()).toEqual([
      { id: 8, transactionDate: day('2026-09-15'), quantity: 1, ...zetaCost, latestOrderCost: 95.25 },
      { id: 10, transactionDate: day('2026-08-15'), quantity: 2, brandName: 'Alpha', costDiscountPercent: null, costDiscountStartDate: null, latestOrderCost: null },
    ])
    expect((await returnWriteOffRows(range('2026-09-01', '2026-09-30'))).map((row) => row.id)).toEqual([8])
  })
})

describe('rxSaleRows', () => {
  it('returns RX sales with their brand name by id, or by date when asked', async () => {
    await seed()

    expect(await rxSaleRows(range('2026-09-01', '2026-09-30'))).toEqual([
      { id: 1, saleDate: day('2026-09-25'), salePrice: 400, costPrice: 150, productType: 'Optical', brandName: 'Zeta' },
      { id: 2, saleDate: day('2026-09-01'), salePrice: 220, costPrice: 0, productType: 'Sun', brandName: 'Alpha' },
      { id: 3, saleDate: day('2026-09-02'), salePrice: 300, costPrice: 100, productType: 'Optical', brandName: 'Zeta' },
    ])
    expect((await rxSaleRows(undefined, 'date')).map((row) => row.id)).toEqual([2, 3, 1])
    expect(await rxSaleRows(range('2026-10-01', '2026-10-31'))).toEqual([])
  })
})

describe('inStockProductRows', () => {
  it('returns products with stock by composite id, with a null status name when the product has none', async () => {
    await seed()

    expect(await inStockProductRows()).toEqual([
      { compositeId: '1-B', currentQty: 2, statusName: 'Active', ...zetaCost, latestOrderCost: 95.25 },
      { compositeId: '2-A', currentQty: 1, statusName: null, brandName: 'Alpha', costDiscountPercent: null, costDiscountStartDate: null, latestOrderCost: null },
    ])
  })
})

describe('brandsWithActivity', () => {
  it('nests each brand by name with its products, their transactions and its RX sales in the range, by date', async () => {
    await seed()

    const brands = await brandsWithActivity(range('2026-09-01', '2026-09-30'))

    expect(brands.map((brand) => [brand.brandName, brand.costDiscountPercent])).toEqual([
      ['Alpha', null],
      ['Mid', 0],
      ['Zeta', 10],
    ])
    expect(brands[0].products).toEqual([{ compositeId: '2-A', brandId: 2, statusName: null, transactions: [] }])
    expect(brands[0].rxSales).toEqual([{ id: 2, brandId: 2, salePrice: 220, costPrice: 0 }])
    expect(brands[1]).toMatchObject({ products: [], rxSales: [] })
    expect(brands[2].products.map((p) => [p.compositeId, p.transactions.map((t) => t.id)])).toEqual([
      ['1-A', [6]],
      ['1-B', [2, 3, 5, 8, 9, 4]],
    ])
    expect(brands[2].products[1].transactions[0]).toEqual({
      id: 2,
      productId: '1-B',
      transactionType: 'RESTOCK',
      transactionDate: day('2026-09-05'),
      unitCost: 90.5,
      unitPrice: 250,
    })
    expect(brands[2].rxSales.map((rx) => rx.id)).toEqual([3, 1])
  })
})

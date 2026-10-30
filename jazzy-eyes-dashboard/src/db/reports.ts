import type { RepProduct } from '@/lib/reports/sales-rep'
import { db } from './pool'
import { and, array, expression, raw, sql, type Sql } from './sql'
import { select } from './table'
import { brands, inventoryTransactions, products, rxSales } from './tables'

export type Period = { start: Date; end: Date }

// Date columns compare against a Date parameter cast to date, so the parameter's
// UTC calendar day is the boundary.
function within(column: Sql, period: Period | null): Sql | null {
  return period && sql`${column} >= ${period.start} AND ${column} <= ${period.end}`
}

function groupByProduct<T extends { productId: string }>(rows: T[]): Map<string, Omit<T, 'productId'>[]> {
  const grouped = new Map<string, Omit<T, 'productId'>[]>()
  for (const { productId, ...rest } of rows) {
    const list = grouped.get(productId) ?? []
    list.push(rest)
    grouped.set(productId, list)
  }
  return grouped
}

export function findBrand(id: number) {
  return db.one(sql`SELECT ${select(brands, ['id', 'brandName', 'companyName'])} FROM brands WHERE id = ${id}`)
}

// Unit cost of the product's most recent ORDER or RESTOCK, or null when it has none.
const receivedUnitCost = expression<number | null>()(
  'receivedUnitCost',
  sql`SELECT r.unit_cost FROM inventory_transactions r
    WHERE r.product_id = t.product_id AND r.transaction_type = ANY(${array(['ORDER', 'RESTOCK'], '"TransactionType"')})
    ORDER BY r.transaction_date DESC, r.id DESC LIMIT 1`
)

function costedTransactions(kind: Sql, period: Period | null, order: Sql) {
  return db.rows(sql`
    SELECT ${select(inventoryTransactions, ['id', 'transactionDate', 'quantity', 'unitCost', 'unitPrice'], { alias: 't' })},
      ${select(products, ['styleNumber', 'colorCode', 'eyeSize', 'gender', 'frameType', 'productType'], { alias: 'p' })},
      ${select(brands, ['brandName', 'costDiscountPercent', 'costDiscountStartDate'], { alias: 'b' })},
      ${receivedUnitCost}
    FROM inventory_transactions t
    JOIN products p ON p.composite_id = t.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${and(kind, within(raw('t.transaction_date'), period))}
    ORDER BY ${order}`)
}

const SALE = sql`t.transaction_type = ${'SALE'}`
const RETURN = sql`t.transaction_type = ${'WRITE_OFF'} AND t.write_off_reason = ${'return'}`


export const salesInPeriod = (period: Period) => costedTransactions(SALE, period, raw('t.transaction_date, t.id'))
export const allSalesEver = () => costedTransactions(SALE, null, raw('t.id'))
export const returnsInPeriod = (period: Period) => costedTransactions(RETURN, period, raw('t.id'))
export const allReturnsEver = () => costedTransactions(RETURN, null, raw('t.id'))

function rxSalesWithBrand(period: Period | null, order: Sql) {
  return db.rows(sql`
    SELECT ${select(
      rxSales,
      ['id', 'saleDate', 'styleNumber', 'colorCode', 'eyeSize', 'gender', 'frameType', 'productType', 'salePrice', 'costPrice'],
      { alias: 'x' }
    )}, ${select(brands, ['brandName'], { alias: 'b' })}
    FROM rx_sales x
    JOIN brands b ON b.id = x.brand_id
    WHERE ${and(within(raw('x.sale_date'), period))}
    ORDER BY ${order}`)
}

export const rxSalesInPeriod = (period: Period) => rxSalesWithBrand(period, raw('x.sale_date, x.id'))
export const allRxSalesEver = () => rxSalesWithBrand(null, raw('x.id'))

// Every product of the brand by composite id, with its status and all its transactions oldest first.
export async function brandInventory(brandId: number) {
  const productRows = await db.rows(sql`
    SELECT ${select(products, ['compositeId', 'styleNumber', 'colorCode', 'frameType', 'productType', 'currentQty'], { alias: 'p' })},
      ${expression<string | null>()('statusName', sql`s.name`)},
      ${expression<string | null>()('statusColorScheme', sql`s."colorScheme"`)}
    FROM products p
    LEFT JOIN frame_statuses s ON s.id = p.status_id
    WHERE p.brand_id = ${brandId}
    ORDER BY p.composite_id`)
  const transactions = groupByProduct(
    await db.rows(sql`
      SELECT ${select(
        inventoryTransactions,
        ['productId', 'transactionType', 'transactionDate', 'quantity', 'unitCost', 'unitPrice', 'writeOffReason'],
        { alias: 't' }
      )}
      FROM inventory_transactions t
      JOIN products p ON p.composite_id = t.product_id
      WHERE p.brand_id = ${brandId}
      ORDER BY t.transaction_date, t.id`)
  )
  return productRows.map((product) => ({ ...product, transactions: transactions.get(product.compositeId) ?? [] }))
}

// Special-order transactions newest first, optionally for one brand's products.
export function specialOrders(brandId: number | null) {
  return db.rows(sql`
    SELECT ${select(
      inventoryTransactions,
      ['id', 'quantity', 'unitCost', 'unitPrice', 'transactionDate', 'invoiceNumber', 'status', 'notes'],
      { alias: 't' }
    )},
      ${select(products, ['compositeId', 'styleNumber', 'colorCode', 'frameType', 'productType'], { alias: 'p' })},
      ${select(brands, ['brandName'], { alias: 'b' })}
    FROM inventory_transactions t
    JOIN products p ON p.composite_id = t.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${and(raw('t.is_special_order'), brandId !== null && sql`p.brand_id = ${brandId}`)}
    ORDER BY t.transaction_date DESC, t.id DESC`)
}

// The brand's products with their completed transactions dated on or before `through`, oldest first.
export async function repProducts(brandId: number, through: Date): Promise<RepProduct[]> {
  const productRows = await db.rows(sql`
    SELECT ${select(products, ['compositeId', 'brandId', 'styleNumber', 'colorCode', 'eyeSize', 'currentQty'])}
    FROM products
    WHERE brand_id = ${brandId}
    ORDER BY composite_id`)
  const transactions = groupByProduct(
    await db.rows(sql`
      SELECT ${select(
        inventoryTransactions,
        ['productId', 'id', 'transactionType', 'transactionDate', 'quantity', 'status', 'revertedFromId'],
        { alias: 't' }
      )}
      FROM inventory_transactions t
      JOIN products p ON p.composite_id = t.product_id
      WHERE p.brand_id = ${brandId} AND t.status = ${'completed'} AND t.transaction_date <= ${through}
      ORDER BY t.transaction_date, t.id`)
  )
  return productRows.map((product) => ({ ...product, transactions: transactions.get(product.compositeId) ?? [] }))
}
